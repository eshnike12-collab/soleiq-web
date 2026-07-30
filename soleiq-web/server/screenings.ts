import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { DomainError, conflict, notFound } from "./errors";
import { requireAuth } from "./auth";
import { infrastructureClient } from "./storage";
import { anthropicAnalysisProvider } from "./providers/anthropic-analysis";
import { processAnalysisEvent } from "./workers/analysis-worker";

type Provider = NonNullable<ReturnType<typeof anthropicAnalysisProvider>>;

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
  try {
    const infra = infrastructureClient();
    await infra
      .from("reports")
      .update({ status: "released", finalized_at: new Date().toISOString() })
      .eq("screening_session_id", sessionId)
      .eq("status", "preliminary");
  } catch {
    /* stays preliminary until a clinician releases it */
  }
}

/** Process the un-processed analysis event for one session, if any. */
async function processSessionAnalysis(
  sessionId: string,
  provider: Provider
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
  await processAnalysisEvent(event.id, provider);
  await releaseSessionReport(sessionId);
  return true;
}

/**
 * Self-healing: sessions stuck at "analyzing" (e.g. saved while the worker
 * credentials were broken) leave an unprocessed outbox event behind. Each
 * successful save opportunistically processes ONE of them, so a backlog
 * drains without a queue runner. Best-effort by design.
 */
async function sweepOnePendingAnalysis(
  provider: Provider,
  excludeSessionId: string
): Promise<void> {
  try {
    const infra = infrastructureClient();
    const { data: event } = await infra
      .from("outbox_events")
      .select("id, aggregate_id")
      .eq("event_type", "analysis_requested")
      .is("processed_at", null)
      .neq("aggregate_id", excludeSessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (event) {
      await processAnalysisEvent(event.id, provider);
      await releaseSessionReport(event.aggregate_id);
    }
  } catch {
    /* backlog stays; the next save tries again */
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

  const { data: session, error: sessionError } = await supabase
    .from("screening_sessions")
    .upsert(
      {
        organization_id: enrollment.organization_id,
        organization_patient_id: enrollment.id,
        facility_id: body.facilityId ?? enrollment.facility_id,
        initiated_by: user.id,
        status: "uploading",
        idempotency_key: body.idempotencyKey,
        started_at: new Date(body.startedAt).toISOString(),
      },
      {
        onConflict: "organization_id,organization_patient_id,idempotency_key",
        ignoreDuplicates: false,
      }
    )
    .select("id, organization_id, organization_patient_id, status")
    .single();
  if (sessionError) throw new Error(sessionError.message);
  if (!["draft", "uploading", "failed"].includes(session.status)) {
    // Resume: if this session is stuck mid-analysis, finish the analysis now
    // so the patient's retry actually produces a report.
    let resumedStatus = session.status;
    const resumeProvider = anthropicAnalysisProvider();
    if (session.status === "analyzing" && resumeProvider) {
      try {
        await processSessionAnalysis(session.id, resumeProvider);
        resumedStatus = "released";
      } catch (resumeError) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "analysis.resume_failed",
            requestId,
            sessionId: session.id,
          })
        );
      }
    }
    return {
      sessionId: session.id,
      status: resumedStatus,
      reportId: await findSessionReportId(supabase, session.id),
      resumed: true,
    };
  }

  // Uploads run under the CALLER'S session (storage RLS policy
  // clinical_media_patient_insert, migration 0007), not the service-role
  // client — so a missing/rotated SUPABASE_SERVICE_ROLE_KEY can no longer
  // fail every patient save. Step errors are DomainErrors so the real
  // reason reaches the UI instead of a generic connection blame.
  const stepFailure = (step: string, detail: string) =>
    new DomainError("DEPENDENCY_ERROR", `${step}: ${detail}`, 502);
  const uploadedPaths: string[] = [];
  try {
    for (const image of body.images) {
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
      uploadedPaths.push(objectPath);

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
        idempotency_key: `${body.idempotencyKey}:${image.side}:${image.view}`,
        captured_at: new Date(image.capturedAt).toISOString(),
      });
      if (assetError) {
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
        await processAnalysisEvent(eventId as string, provider);
        await releaseSessionReport(session.id);
        status = "released";
        // Drain one stuck session from the backlog while we're here.
        await sweepOnePendingAnalysis(provider, session.id);
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
    if (uploadedPaths.length) {
      // Best-effort cleanup under the caller's own permissions; leftover
      // objects are harmless (each retry writes fresh asset ids).
      await supabase.storage
        .from("clinical-media")
        .remove(uploadedPaths)
        .catch(() => undefined);
    }
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

