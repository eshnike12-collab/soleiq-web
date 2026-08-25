import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { DomainError, conflict, notFound } from "./errors";
import { requireAuth } from "./auth";
import { infrastructureClient } from "./storage";
import { sendReportSummaryForSession } from "./email/sendReportSummary";
import { anthropicAnalysisProvider } from "./providers/anthropic-analysis";
import {
  MAX_ANALYSIS_ATTEMPTS,
  processAnalysisEvent,
} from "./workers/analysis-worker";

type Provider = NonNullable<ReturnType<typeof anthropicAnalysisProvider>>;

/**
 * Wall-clock point, measured from the start of the request, past which no new
 * backlog sweep is started. The route's budget is 60 s (maxDuration) and one
 * analysis — media download plus vision call — commonly runs 10-40 s, so this
 * leaves room to finish the sweep already in flight and still respond.
 */
const SWEEP_DEADLINE_MS = 20_000;

/**
 * Wall-clock point past which no analysis work may still be running. The
 * platform kills the invocation at maxDuration (60 s) and answers the browser
 * with a 504 — at which point the session, the four photos and the queued
 * analysis event are all already committed, but the patient is told the save
 * failed. Stopping ourselves a little short of that ceiling turns the worst
 * case into an honest "saved, still analyzing" response; the outbox event
 * stays unprocessed and the next save's sweep (or a re-submit of the same
 * idempotency key) finishes it.
 */
const ANALYSIS_DEADLINE_MS = 45_000;

const TIMED_OUT = Symbol("analysis-deadline-exceeded");

/**
 * Resolves with the work's result, or TIMED_OUT once `deadlineAt` passes.
 * The abandoned promise is left running — it may still finish inside this
 * invocation — but its result and any rejection are ignored.
 */
async function withDeadline<T>(
  work: Promise<T>,
  deadlineAt: number
): Promise<T | typeof TIMED_OUT> {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) {
    void work.catch(() => undefined);
    return TIMED_OUT;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), remaining);
  });
  try {
    const result = await Promise.race([work, expiry]);
    if (result === TIMED_OUT) void work.catch(() => undefined);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Sessions past the point of re-uploading: the report already exists (or a
 *  clinician owns the row now), so a repeat submit returns it as-is. */
const TERMINAL_SESSION_STATUSES = new Set([
  "preliminary",
  "clinician_reviewed",
  "completed",
  "released",
]);

/** The report produced for a session, as visible to the CALLER (RLS applies —
 *  patients see their own reports immediately once migration 0009 is live). */
async function findSessionReportId(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  sessionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("reports")
    .select("id")
    .eq("screening_session_id", sessionId)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Product decision (2026-07): results are available to the patient the
 * moment analysis finishes, so freshly created reports are released
 * immediately instead of waiting for a clinician to flip them. Clinician
 * review still happens and is still recorded in report_reviews — it just
 * no longer gates visibility. Best-effort: a failure here leaves the
 * report preliminary, which doctors can still see.
 */
async function releaseSessionReport(sessionId: string): Promise<void> {
  let released = false;
  try {
    const infra = infrastructureClient();
    const { data } = await infra
      .from("reports")
      .update({ status: "released", finalized_at: new Date().toISOString() })
      .eq("screening_session_id", sessionId)
      .eq("status", "preliminary")
      .select("id");
    released = (data?.length ?? 0) > 0;
  } catch {
    /* stays preliminary until a clinician releases it */
  }

  // Tell the patient their results are ready. Gated on an actual transition,
  // so a retried or already-released session does not email twice; the update
  // filters on `status = 'preliminary'`, which makes that check atomic rather
  // than a read-then-write race.
  //
  // Awaited, not fired and forgotten: on serverless the process can be frozen
  // the moment the handler returns, which silently drops in-flight requests.
  // It cannot throw (see server/email/client.ts), so awaiting it cannot fail
  // the release.
  if (released) {
    const result = await sendReportSummaryForSession(sessionId);
    if (!result.ok && result.reason !== "not_configured") {
      console.warn("[email] report summary not sent:", result.reason, result.detail ?? "");
    }
  }
}

/** Process the un-processed analysis event for one session, if any. */
async function processSessionAnalysis(
  sessionId: string,
  provider: Provider,
  deadlineAt: number
): Promise<boolean> {
  const infra = infrastructureClient();
  const { data: event } = await infra
    .from("outbox_events")
    .select("id")
    .eq("event_type", "analysis_requested")
    .eq("aggregate_id", sessionId)
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!event) return false;
  const done = await withDeadline(
    (async () => {
      await processAnalysisEvent(event.id, provider);
      await releaseSessionReport(sessionId);
    })(),
    deadlineAt
  );
  return done !== TIMED_OUT;
}

/**
 * Self-healing: sessions stuck at "analyzing" (e.g. saved while the worker
 * credentials were broken) leave an unprocessed outbox event behind. Each
 * successful save opportunistically processes ONE of them, so a backlog
 * drains without a queue runner. Best-effort by design.
 *
 * The `attempts` filter is load-bearing, not a nicety. This picks the OLDEST
 * unprocessed event, and an event whose session is no longer "analyzing" can
 * never complete — complete_screening_analysis raises "screening is not
 * analyzing" and processed_at stays null. Without the filter that one event
 * is re-selected by every subsequent save forever, burning a full vision
 * call plus four media downloads each time and pushing the request toward
 * the 60 s maxDuration ceiling, while nothing else in the backlog is ever
 * reached. processAnalysisEvent dead-letters at the same threshold.
 */
async function sweepPendingAnalyses(
  provider: Provider,
  excludeSessionId: string,
  deadlineMs: number,
  hardDeadlineAt: number
): Promise<void> {
  const infra = infrastructureClient();
  const seen = new Set<string>();
  while (Date.now() < deadlineMs) {
    try {
      const { data: event } = await infra
        .from("outbox_events")
        .select("id, aggregate_id")
        .eq("event_type", "analysis_requested")
        .is("processed_at", null)
        .lt("attempts", MAX_ANALYSIS_ATTEMPTS)
        .neq("aggregate_id", excludeSessionId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      // Nothing left, or the same event came back unprocessed — either way
      // stop rather than spin.
      if (!event || seen.has(event.id)) return;
      seen.add(event.id);
      // Someone else's backlog never justifies overrunning this patient's
      // request: whatever is unfinished at the hard deadline is dropped and
      // picked up by a later save.
      const swept = await withDeadline(
        (async () => {
          await processAnalysisEvent(event.id, provider);
          await releaseSessionReport(event.aggregate_id);
        })(),
        hardDeadlineAt
      );
      if (swept === TIMED_OUT) return;
    } catch {
      /* backlog stays; the next save tries again */
      return;
    }
  }
}

const DataUrlSchema = z
  .string()
  .max(20_000_000)
  .regex(/^data:image\/(jpeg|png|webp);base64,/);

const ScreeningImageSchema = z.object({
  side: z.enum(["left", "right"]),
  view: z.enum(["top", "sole"]),
  dataUrl: DataUrlSchema,
  capturedAt: z.number().int().positive(),
  quality: z.record(z.unknown()).nullable().optional(),
});

export const CompleteScreeningSchema = z.object({
  organizationPatientId: z.string().uuid().optional(),
  facilityId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(8).max(128),
  startedAt: z.number().int().positive(),
  images: z.array(ScreeningImageSchema).length(4),
  patientContext: z.record(z.unknown()).optional(),
});

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image.");
  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64"),
    extension:
      match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg",
  };
}

export async function createCanonicalScreening(
  input: z.input<typeof CompleteScreeningSchema>,
  requestId: string
) {
  const requestStartedAt = Date.now();
  const body = CompleteScreeningSchema.parse(input);
  const expected = new Set([
    "left-top",
    "left-sole",
    "right-top",
    "right-sole",
  ]);
  for (const image of body.images) expected.delete(`${image.side}-${image.view}`);
  if (expected.size) throw conflict("Exactly one photo for each required view is needed.");

  const { supabase, user } = await requireAuth();
  let enrollmentQuery = supabase
    .from("organization_patients")
    .select("id, organization_id, patient_id, facility_id, patients!inner(linked_user_id)")
    .eq("enrollment_status", "active");
  if (body.organizationPatientId) {
    enrollmentQuery = enrollmentQuery.eq("id", body.organizationPatientId);
  }
  const { data: enrollments, error: enrollmentError } = await enrollmentQuery.limit(2);
  if (enrollmentError) throw new Error(enrollmentError.message);
  const owned = (enrollments ?? []).filter(
    (row: any) => row.patients?.linked_user_id === user.id
  );
  if (owned.length === 0) {
    throw conflict(
      "This account is not linked to an active hospital patient record. The check remains available on this device."
    );
  }
  if (!body.organizationPatientId && owned.length > 1) {
    throw conflict("Choose the hospital enrollment for this screening.");
  }
  const enrollment = owned[0] as {
    id: string;
    organization_id: string;
    patient_id: string;
    facility_id: string | null;
  };

  if (body.patientContext) {
    const { error } = await supabase
      .from("patients")
      .update({ demographics: body.patientContext })
      .eq("id", enrollment.patient_id)
      .eq("linked_user_id", user.id);
    if (error) throw new Error(error.message);
  }

  // Resolve the session by idempotency key BEFORE writing anything.
  //
  // This used to be a single upsert with `status: "uploading"` in the
  // payload, which broke retries two different ways. It overwrote the status
  // of whatever session it collided with, so the status read back was
  // *always* "uploading" and the resume branch below was unreachable dead
  // code. And when the existing session had already finished, forcing it
  // back to "uploading" is an UPDATE that sessions_patient_update refuses
  // (its USING clause only permits draft/uploading/failed) — so re-saving a
  // check that was already stored failed with an RLS error instead of
  // returning the report the patient was waiting for.
  const { data: existing, error: existingError } = await supabase
    .from("screening_sessions")
    .select("id, organization_id, organization_patient_id, status")
    .eq("organization_id", enrollment.organization_id)
    .eq("organization_patient_id", enrollment.id)
    .eq("idempotency_key", body.idempotencyKey)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing && TERMINAL_SESSION_STATUSES.has(existing.status)) {
    // Already saved. Re-submitting the same check is a no-op that hands back
    // the existing report, not an error.
    return {
      sessionId: existing.id,
      status: existing.status,
      reportId: await findSessionReportId(supabase, existing.id),
      resumed: true,
    };
  }

  if (existing && existing.status === "analyzing") {
    // A previous attempt uploaded everything and died before the analysis
    // finished. Finish that one rather than starting over.
    let resumedStatus = existing.status;
    const resumeProvider = anthropicAnalysisProvider();
    if (resumeProvider) {
      try {
        const finished = await processSessionAnalysis(
          existing.id,
          resumeProvider,
          requestStartedAt + ANALYSIS_DEADLINE_MS
        );
        if (finished) {
          resumedStatus = "released";
        }
      } catch {
        console.error(
          JSON.stringify({
            level: "error",
            event: "analysis.resume_failed",
            requestId,
            sessionId: existing.id,
          })
        );
      }
    }
    return {
      sessionId: existing.id,
      status: resumedStatus,
      reportId: await findSessionReportId(supabase, existing.id),
      resumed: true,
    };
  }

  // New, or resumable (draft/uploading/failed). On resume `started_at` is
  // deliberately left alone — rewriting it on every retry shifted the check's
  // timestamp in the patient's history.
  const sessionWrite = existing
    ? supabase
        .from("screening_sessions")
        .update({ status: "uploading", failure_reason: null })
        .eq("id", existing.id)
    : supabase.from("screening_sessions").insert({
        organization_id: enrollment.organization_id,
        organization_patient_id: enrollment.id,
        facility_id: body.facilityId ?? enrollment.facility_id,
        initiated_by: user.id,
        status: "uploading",
        idempotency_key: body.idempotencyKey,
        started_at: new Date(body.startedAt).toISOString(),
      });
  const { data: session, error: sessionError } = await sessionWrite
    .select("id, organization_id, organization_patient_id, status")
    .single();
  if (sessionError) throw new Error(sessionError.message);

  // Uploads run under the CALLER'S session (storage RLS policy
  // clinical_media_patient_insert, migration 0007), not the service-role
  // client — so a missing/rotated SUPABASE_SERVICE_ROLE_KEY can no longer
  // fail every patient save. Step errors are DomainErrors so the real
  // reason reaches the UI instead of a generic connection blame.
  const stepFailure = (step: string, detail: string) =>
    new DomainError("DEPENDENCY_ERROR", `${step}: ${detail}`, 502);

  // Photos an earlier attempt already persisted. media_assets is
  // unique(screening_session_id, idempotency_key) and has no UPDATE or
  // DELETE policy for patients, so re-inserting them is a duplicate-key
  // error with no way to recover — which is how one failed save used to
  // make every later retry fail too.
  const { data: existingAssets, error: existingAssetsError } = await supabase
    .from("media_assets")
    .select("idempotency_key")
    .eq("screening_session_id", session.id)
    .eq("asset_type", "photo");
  if (existingAssetsError) {
    throw stepFailure(
      "Reading the photos already saved for this check failed",
      existingAssetsError.message
    );
  }
  const alreadyPersisted = new Set(
    (existingAssets ?? []).map((asset: any) => asset.idempotency_key)
  );

  try {
    for (const image of body.images) {
      const assetKey = `${body.idempotencyKey}:${image.side}:${image.view}`;
      // Already uploaded and recorded by a previous attempt — its object is
      // still in the bucket (see the catch block), so reuse it.
      if (alreadyPersisted.has(assetKey)) continue;

      const parsed = parseDataUrl(image.dataUrl);
      const assetId = randomUUID();
      const objectPath = [
        enrollment.organization_id,
        enrollment.id,
        session.id,
        `${image.side}-${image.view}-${assetId}.${parsed.extension}`,
      ].join("/");
      const checksum = createHash("sha256").update(parsed.bytes).digest("hex");
      const { error: uploadError } = await supabase.storage
        .from("clinical-media")
        .upload(objectPath, parsed.bytes, {
          contentType: parsed.mimeType,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        throw stepFailure(
          `Uploading the ${image.side}-${image.view} photo failed`,
          uploadError.message
        );
      }

      const { error: assetError } = await supabase.from("media_assets").insert({
        id: assetId,
        organization_id: enrollment.organization_id,
        screening_session_id: session.id,
        asset_type: "photo",
        side: image.side,
        view: image.view,
        storage_bucket: "clinical-media",
        storage_path: objectPath,
        mime_type: parsed.mimeType,
        capture_quality: image.quality ?? null,
        checksum,
        idempotency_key: assetKey,
        captured_at: new Date(image.capturedAt).toISOString(),
      });
      if (assetError) {
        // Nothing references this object, so drop it rather than leak it.
        // Objects that DID get a row are left alone on purpose.
        await supabase.storage
          .from("clinical-media")
          .remove([objectPath])
          .catch(() => undefined);
        throw stepFailure("Recording the photo metadata failed", assetError.message);
      }
    }

    const { data: eventId, error: enqueueError } = await supabase.rpc(
      "enqueue_screening_analysis",
      { target_session_id: session.id, request_id: requestId }
    );
    if (enqueueError) {
      throw stepFailure("Queueing the analysis failed", enqueueError.message);
    }

    // Without a managed queue the outbox event would never be processed, so
    // run the worker inline when this server holds analysis credentials.
    // A deployment with a real queue processes the same event idempotently.
    let status = "analyzing";
    const provider = anthropicAnalysisProvider();
    if (provider && eventId) {
      try {
        const analyzed = await withDeadline(
          (async () => {
            await processAnalysisEvent(eventId as string, provider);
            await releaseSessionReport(session.id);
          })(),
          requestStartedAt + ANALYSIS_DEADLINE_MS
        );
        if (analyzed === TIMED_OUT) {
          // Everything the patient sent is committed; only the reading is
          // outstanding. Report that truthfully instead of being killed at
          // maxDuration and surfacing as a failed save.
          console.error(
            JSON.stringify({
              level: "warn",
              event: "analysis.deadline_exceeded",
              requestId,
              sessionId: session.id,
            })
          );
          return {
            sessionId: session.id,
            status: "analyzing",
            reportId: await findSessionReportId(supabase, session.id),
            analysisEventId: eventId,
            resumed: false,
          };
        }
        status = "released";
        // Drain stuck sessions from the backlog while we're here, but only
        // inside a strict time budget. Each sweep is a full vision call plus
        // four media downloads for a DIFFERENT session, on the critical path
        // of this patient's save. Running one unconditionally is what pushed
        // slow saves past maxDuration: the report had already been written,
        // then the function was killed mid-sweep, the fetch never resolved,
        // and the patient was told the save failed. Anything not reached
        // before the deadline is simply left for the next save.
        await sweepPendingAnalyses(
          provider,
          session.id,
          requestStartedAt + SWEEP_DEADLINE_MS,
          requestStartedAt + ANALYSIS_DEADLINE_MS
        );
      } catch (analysisError) {
        // The worker already marked the session failed and kept the media
        // for retry; the saved session is still returned to the caller.
        console.error(
          JSON.stringify({
            level: "error",
            event: "analysis.inline_failed",
            requestId,
            sessionId: session.id,
          })
        );
        status = "failed";
      }
    }
    return {
      sessionId: session.id,
      status,
      reportId: await findSessionReportId(supabase, session.id),
      analysisEventId: eventId,
      resumed: false,
    };
  } catch (error) {
    // Photos that made it into media_assets are deliberately KEPT, objects
    // and rows together, so the next attempt can reuse them. The previous
    // version deleted the objects here while leaving the rows behind (there
    // is no patient DELETE policy on media_assets), which left the session
    // pointing at storage paths that no longer existed: the retry skipped
    // re-uploading because the row was there, and the analysis worker then
    // died on "Private media download failed" every single time.
    await supabase
      .from("screening_sessions")
      .update({
        status: "failed",
        failure_reason:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Media persistence or analysis enqueue failed.",
      })
      .eq("id", session.id);
    throw error;
  }
}

export async function getAuthorizedMediaUrl(
  assetId: string,
  requestId: string
) {
  const { supabase } = await requireAuth();
  const { data: asset, error } = await supabase
    .from("media_assets")
    .select(
      "id, organization_id, screening_session_id, storage_bucket, storage_path"
    )
    .eq("id", assetId)
    .maybeSingle();
  if (error || !asset) throw notFound("Media not found.");

  const { data: signed, error: signedError } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_path, 600);
  if (signedError || !signed?.signedUrl) throw notFound("Media not found.");
  const { error: auditError } = await supabase.rpc("write_audit_event", {
    event_organization_id: asset.organization_id,
    event_action: "media.viewed",
    event_resource_type: "media_asset",
    event_resource_id: asset.id,
    event_patient_id: null,
    event_purpose: "treatment",
    event_request_id: requestId,
    event_metadata: {},
  });
  if (auditError) throw new Error(auditError.message);
  return { url: signed.signedUrl, expiresIn: 600 };
}

