import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { conflict, notFound } from "./errors";
import { requireAuth } from "./auth";
import { infrastructureClient } from "./storage";
import { anthropicAnalysisProvider } from "./providers/anthropic-analysis";
import { processAnalysisEvent } from "./workers/analysis-worker";

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
    return { sessionId: session.id, status: session.status, resumed: true };
  }

  const infrastructure = infrastructureClient();
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
      const { error: uploadError } = await infrastructure.storage
        .from("clinical-media")
        .upload(objectPath, parsed.bytes, {
          contentType: parsed.mimeType,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
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
      if (assetError) throw new Error(assetError.message);
    }

    const { data: eventId, error: enqueueError } = await supabase.rpc(
      "enqueue_screening_analysis",
      { target_session_id: session.id, request_id: requestId }
    );
    if (enqueueError) throw new Error(enqueueError.message);

    // Without a managed queue the outbox event would never be processed, so
    // run the worker inline when this server holds analysis credentials.
    // A deployment with a real queue processes the same event idempotently.
    let status = "analyzing";
    const provider = anthropicAnalysisProvider();
    if (provider && eventId) {
      try {
        await processAnalysisEvent(eventId as string, provider);
        status = "preliminary";
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
      analysisEventId: eventId,
      resumed: false,
    };
  } catch (error) {
    if (uploadedPaths.length) {
      await infrastructure.storage.from("clinical-media").remove(uploadedPaths);
    }
    await supabase
      .from("screening_sessions")
      .update({
        status: "failed",
        failure_reason: "Media persistence or analysis enqueue failed.",
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

