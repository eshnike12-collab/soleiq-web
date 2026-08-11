/**
 * Foot perfusion assessment.
 *
 * Combines what was actually measured — cuff/Doppler pressures if a clinician
 * took them, camera pulsatility and capillary refill if the patient ran the
 * checks — into one picture, with the hierarchy that matters kept explicit:
 * measured pressures decide, camera signals support, and neither an absent
 * camera finding nor a normal-looking foot rules peripheral arterial disease
 * out.
 *
 * That last point is why `concern` has an "unknown" state rather than
 * defaulting to "normal". In a diabetic foot, "we did not find anything" and
 * "there is nothing there" are different sentences, and only one of them is
 * true here.
 */

import {
  type MeasuredPressures,
  type PerfusionSeverity,
  type PressureAssessment,
  assessMeasuredPressures,
} from "./abi";
import {
  type CapillaryRefillResult,
  PROLONGED_REFILL_SECONDS,
} from "./capillaryRefill";
import {
  ASYMMETRY_CONCERN_THRESHOLD,
  type BilateralPerfusion,
  type PerfusionSignal,
} from "./perfusionIndex";

export * from "./abi";
export * from "./capillaryRefill";
export * from "./perfusionIndex";

export type PerfusionConcern = "unknown" | "reassuring" | "monitor" | "urgent";

export interface FootPerfusionAssessment {
  concern: PerfusionConcern;
  /** Plain-language reasons, in the order they should be read. */
  reasons: string[];
  /** What to do about it — actions, not diagnoses. */
  actions: string[];
  pressures: PressureAssessment[];
  camera: {
    bilateral: BilateralPerfusion | null;
    refill: { side: "left" | "right"; result: CapillaryRefillResult }[];
  };
  /** True when nothing objective was measured at all. */
  empty: boolean;
  assessedAt: number;
}

export interface PerfusionInput {
  pressures?: MeasuredPressures[];
  bilateral?: BilateralPerfusion | null;
  refill?: { side: "left" | "right"; result: CapillaryRefillResult }[];
  /** An open wound changes the thresholds at which perfusion matters. */
  woundPresent?: boolean;
  now?: number;
}

const CONCERN_RANK: Record<PerfusionConcern, number> = {
  unknown: 0,
  reassuring: 1,
  monitor: 2,
  urgent: 3,
};

const escalate = (current: PerfusionConcern, next: PerfusionConcern) =>
  CONCERN_RANK[next] > CONCERN_RANK[current] ? next : current;

const SEVERITY_TO_CONCERN: Record<PerfusionSeverity, PerfusionConcern> = {
  normal: "reassuring",
  borderline: "monitor",
  unreliable: "monitor",
  reduced: "monitor",
  critical: "urgent",
};

const sideLabel = (side: "left" | "right") => (side === "left" ? "Left" : "Right");

export function assessFootPerfusion(input: PerfusionInput): FootPerfusionAssessment {
  const reasons: string[] = [];
  const actions: string[] = [];
  let concern: PerfusionConcern = "unknown";

  // --- Measured pressures lead ---------------------------------------------
  const pressures = (input.pressures ?? [])
    .map(assessMeasuredPressures)
    .filter((assessment): assessment is PressureAssessment => assessment !== null);

  for (const assessment of pressures) {
    concern = escalate(concern, SEVERITY_TO_CONCERN[assessment.severity]);
    const worst = assessment.findings.reduce((worstSoFar, finding) =>
      finding.interpretation.severity === assessment.severity ? finding : worstSoFar
    );
    reasons.push(
      `${sideLabel(assessment.side)} foot — ${worst.test} ${worst.value}: ${worst.interpretation.detail}`
    );
    if (assessment.needsToePressure) {
      actions.push(
        `Measure a toe pressure or toe-brachial index on the ${assessment.side} side — the ankle reading cannot be interpreted.`
      );
    }
    if (assessment.severity === "critical") {
      actions.push(
        `Arrange urgent vascular assessment for the ${assessment.side} foot.`
      );
    }
  }

  // --- Camera signals support ----------------------------------------------
  const bilateral = input.bilateral ?? null;
  if (bilateral?.comparable && bilateral.asymmetryIndex !== null) {
    if (bilateral.weakerSide) {
      concern = escalate(concern, "monitor");
      reasons.push(
        `Camera pulse signal is ${Math.round(bilateral.asymmetryIndex * 100)}% weaker in the ${bilateral.weakerSide} foot than the other. One-sided differences are the pattern arterial disease produces, though lighting and position can also cause them.`
      );
      actions.push(
        "Check foot pulses on both sides, and measure an ankle-brachial index if that has not been done recently."
      );
    } else {
      reasons.push(
        "Camera pulse signal is present and similar in both feet."
      );
      concern = escalate(concern, "reassuring");
    }
  } else if (bilateral && (bilateral.left || bilateral.right)) {
    reasons.push(
      "Only one foot produced a usable camera pulse signal, so the two sides could not be compared."
    );
  }

  const refill = input.refill ?? [];
  for (const entry of refill) {
    if (entry.result.category === "prolonged") {
      concern = escalate(concern, input.woundPresent ? "urgent" : "monitor");
      reasons.push(
        `Capillary refill in the ${entry.side} foot took ${entry.result.refillSeconds.toFixed(1)} s (over ${PROLONGED_REFILL_SECONDS} s). Cold feet refill slowly too, so repeat it in a warm room before drawing conclusions.`
      );
      actions.push(
        `Have the ${entry.side} foot's circulation assessed, particularly if the skin is cool, pale or painful at rest.`
      );
    } else if (entry.result.category === "borderline") {
      concern = escalate(concern, "monitor");
      reasons.push(
        `Capillary refill in the ${entry.side} foot took ${entry.result.refillSeconds.toFixed(1)} s, a little slow.`
      );
    } else {
      concern = escalate(concern, "reassuring");
      reasons.push(
        `Capillary refill in the ${entry.side} foot was ${entry.result.refillSeconds.toFixed(1)} s, within the usual range.`
      );
    }
  }

  const empty = pressures.length === 0 && !bilateral?.comparable && refill.length === 0;
  if (empty) {
    reasons.push("No perfusion measurement was taken at this visit.");
    actions.push(
      "Ask your care team for an ankle-brachial index if you have diabetes and have not had one recently."
    );
  }

  // The camera cannot exclude arterial disease, and a reassuring set of camera
  // signals with no measured pressure must not read as an all-clear.
  if (concern === "reassuring" && pressures.length === 0) {
    actions.push(
      "Camera signals cannot rule out narrowed arteries. An ankle-brachial index measured with a cuff is the test that can."
    );
  }
  if (input.woundPresent && concern !== "urgent") {
    actions.push(
      "With an open wound, perfusion determines whether it can heal — make sure someone assesses it directly."
    );
  }

  return {
    concern,
    reasons,
    actions: Array.from(new Set(actions)),
    pressures,
    camera: { bilateral, refill },
    empty,
    assessedAt: input.now ?? 0,
  };
}

export const CONCERN_LABEL: Record<PerfusionConcern, string> = {
  unknown: "Not assessed",
  reassuring: "Nothing concerning seen",
  monitor: "Worth following up",
  urgent: "Needs prompt assessment",
};

export { ASYMMETRY_CONCERN_THRESHOLD };
export type { PerfusionSignal, MeasuredPressures };
