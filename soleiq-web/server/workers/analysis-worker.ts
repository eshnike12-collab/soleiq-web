import "server-only";

import { PhotoScreeningSchema, enforceScreeningSafety } from "@/lib/photoScreening";
import { buildRecommendationRecord, CATALOG_VERSION } from "@/lib/productCatalog";
import type { AnalysisProvider, AnalysisImage } from "@/server/providers/analysis";
import { infrastructureClient } from "@/server/storage";

/**
 * Development/managed-queue compatible worker entry point.
 * It uses privileged infrastructure credentials only for the queued event and
 * private media fetch, then persists through one atomic worker-only RPC.
 */
export async function processAnalysisEvent(
  outboxEventId: string,
  provider: AnalysisProvider
) {
  const supabase = infrastructureClient();
  const { data: event, error: eventError } = await supabase
    .from("outbox_events")
    .select("id, event_type, aggregate_id, processed_at, attempts")
    .eq("id", outboxEventId)
    .eq("event_type", "analysis_requested")
    .maybeSingle();
  if (eventError || !event) throw new Error("Analysis event not found.");
  if (event.processed_at) return { alreadyProcessed: true };

  const { data: session, error: sessionError } = await supabase
    .from("screening_sessions")
    .select(
      "id, organization_id, organization_patient_id, organization_patients(patient_id, patients(demographics))"
    )
    .eq("id", event.aggregate_id)
    .single();
  if (sessionError) throw new Error(sessionError.message);
  const { data: assets, error: assetsError } = await supabase
    .from("media_assets")
    .select("id, side, view, mime_type, storage_bucket, storage_path")
    .eq("screening_session_id", session.id)
    .eq("asset_type", "photo")
    .order("created_at");
  if (assetsError || !assets || assets.length !== 4) {
    throw new Error("Canonical four-photo set is incomplete.");
  }

  const images: AnalysisImage[] = [];
  for (const asset of assets) {
    const { data: blob, error } = await supabase.storage
      .from(asset.storage_bucket)
      .download(asset.storage_path);
    if (error || !blob) throw new Error("Private media download failed.");
    images.push({
      side: asset.side,
      view: asset.view,
      mimeType: asset.mime_type || "image/jpeg",
      bytes: new Uint8Array(await blob.arrayBuffer()),
    } as AnalysisImage);
  }

  try {
    const result = await provider.analyze({
      screeningSessionId: session.id,
      images,
      context:
        (session as any).organization_patients?.patients?.demographics ?? {},
    });
    const validated = PhotoScreeningSchema.parse(result.output);
    const safeOutput = enforceScreeningSafety(validated);
    const { data: reportId, error } = await supabase.rpc(
      "complete_screening_analysis",
      {
        target_session_id: session.id,
        provider_name: result.provider,
        analysis_model_name: result.modelName,
        analysis_model_version: result.modelVersion,
        analysis_prompt_version: result.promptVersion,
        analysis_schema_version: result.schemaVersion,
        analysis_safety_version: result.safetyRulesVersion,
        analysis_output: safeOutput,
      }
    );
    if (error) throw new Error(error.message);
    // Freeze the product recommendation with the report so historical
    // reports always show what was recommended at the time of that check.
    // Best-effort: analysis success never hinges on this table existing.
    if (reportId) {
      try {
        const demographics =
          (session as any).organization_patients?.patients?.demographics ?? {};
        const record = buildRecommendationRecord(safeOutput as any, demographics);
        await supabase.from("report_recommendations").upsert(
          {
            organization_id: (session as any).organization_id,
            report_id: reportId,
            screening_session_id: session.id,
            products: record.products,
            signals: record.signals,
            catalog_version: CATALOG_VERSION,
          },
          { onConflict: "report_id" }
        );
      } catch (recError) {
        console.error("[soleiq] recommendation persist failed", recError);
      }
    }
    await supabase
      .from("outbox_events")
      .update({ processed_at: new Date().toISOString(), attempts: event.attempts + 1 })
      .eq("id", event.id);
    return { alreadyProcessed: false, reportId };
  } catch (error) {
    await supabase
      .from("outbox_events")
      .update({
        attempts: event.attempts + 1,
        last_error: error instanceof Error ? error.name : "AnalysisError",
      })
      .eq("id", event.id);
    await supabase
      .from("screening_sessions")
      .update({
        status: "failed",
        failure_reason: "Analysis could not be completed.",
      })
      .eq("id", session.id);
    throw error;
  }
}

