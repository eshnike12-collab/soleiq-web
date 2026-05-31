// Deterministic mock for demo purposes — see PRD section 6.3 for the eventual real implementation.
import { MOCK_RESULTS } from "../mock/aiAnalysis";
import type { AnalysisResult, PatientProfile, Visit } from "../types";
import { ANALYSIS_THRESHOLD } from "../footDetection";

export const AI_PIPELINE_DELAY_MS = 6000;

export class PipelineInputError extends Error {
  constructor(message: string, public reasons: string[] = []) {
    super(message);
    this.name = "PipelineInputError";
  }
}

/**
 * Defensive input validation. Refuses to score visits whose captures don't
 * pass detection — even if a caller bypasses the Processing-screen gate, the
 * pipeline itself will reject bad input. No placeholder results are returned.
 */
function assertVisitAnalyzable(visit: Visit): void {
  const issues: string[] = [];
  if (visit.images.length < 8)
    issues.push(`Only ${visit.images.length}/8 foot images captured`);
  if (visit.meshes.length < 2)
    issues.push(`Only ${visit.meshes.length}/2 foot meshes captured`);

  const badImages = visit.images.filter(
    (i) =>
      !i.detection ||
      !i.detection.detected ||
      i.detection.confidence < ANALYSIS_THRESHOLD
  ).length;
  if (badImages > 0)
    issues.push(
      `${badImages} image${badImages === 1 ? "" : "s"} below detection threshold`
    );

  const badMeshes = visit.meshes.filter(
    (m) =>
      !m.heightmap ||
      !m.detection ||
      !m.detection.detected ||
      m.detection.confidence < ANALYSIS_THRESHOLD
  ).length;
  if (badMeshes > 0)
    issues.push(
      `${badMeshes} 3D scan${badMeshes === 1 ? "" : "s"} produced no usable mesh`
    );

  if (issues.length > 0) {
    throw new PipelineInputError(
      "Cannot analyze — capture quality insufficient.",
      issues
    );
  }
}

export function pickVariant(
  profile: Partial<PatientProfile>
): "low" | "medium" | "high" {
  const hasPriorUlcer = profile.priorEvents?.some((e) => e.type === "ulcer");
  const hasAmputation = profile.priorEvents?.some(
    (e) => e.type === "amputation"
  );
  const isType2 = profile.diabetes?.type === "type_2";
  const numbnessRight =
    profile.numbness === "right" || profile.numbness === "both";

  // PAD signals — independent risk amplifier, not just a comorbidity.
  const pad = profile.pad;
  const padDiagnosed = pad?.status === "diagnosed";
  const padSuspected = pad?.status === "suspected";
  const lowAbi = pad?.abi != null && pad.abi < 0.9;
  const padCritical =
    !!pad &&
    (pad.restPain || lowAbi || (pad.signs?.length ?? 0) >= 2);

  // High-risk gate: prior ulcer or amputation OR PAD with critical signs.
  if (hasPriorUlcer || hasAmputation || padCritical) return "high";

  // Medium-risk gate: any documented PAD, OR classic neuropathy+diabetes combo.
  if (padDiagnosed || padSuspected || pad?.claudication) return "medium";
  if (isType2 && numbnessRight) return "medium";

  return "low";
}

export async function simulateAIPipeline(
  visit: Visit,
  profile: Partial<PatientProfile>
): Promise<AnalysisResult> {
  // Hard input gate — throws PipelineInputError on insufficient input. Caller
  // (Processing screen) must catch and render a retry state.
  assertVisitAnalyzable(visit);
  await new Promise((res) => setTimeout(res, AI_PIPELINE_DELAY_MS));
  const variant = pickVariant(profile);
  const base = MOCK_RESULTS[variant];
  return {
    ...base,
    visitId: visit.id,
    scoredAt: Date.now(),
  };
}

export const PROCESSING_COPY = [
  "Analyzing your foot images and 3D scans.",
  "Reviewing skin texture and color balance.",
  "Computing volumetric measurements.",
  "Comparing against population priors.",
  "Finalizing your risk assessment.",
];
