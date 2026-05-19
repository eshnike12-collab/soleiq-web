// Deterministic mock for demo purposes — see PRD section 6.3 for the eventual real implementation.
import { MOCK_RESULTS } from "../mock/aiAnalysis";
import type { AnalysisResult, PatientProfile, Visit } from "../types";

export const AI_PIPELINE_DELAY_MS = 6000;

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
