/**
 * Interpretation of *measured* limb pressures — ankle-brachial index,
 * toe-brachial index, absolute toe and ankle pressures.
 *
 * These values come from a cuff with a Doppler or a photoplethysmographic toe
 * cuff. Nothing in this file estimates a pressure; it classifies one that a
 * clinician measured, using thresholds in common clinical use (ACC/AHA
 * lower-extremity PAD guidance for the ABI bands, IWGDF guidance on perfusion
 * in the diabetic foot for the toe-pressure and severe-ischaemia cut-offs).
 *
 * The diabetes-specific trap is encoded deliberately: medial arterial
 * calcification makes ankle arteries incompressible, which pushes the ABI up,
 * so a *high* ABI is not a reassuring ABI — it is an uninterpretable one that
 * calls for a toe pressure instead.
 */

export type PerfusionSeverity = "normal" | "borderline" | "reduced" | "critical" | "unreliable";

export interface PressureInterpretation {
  severity: PerfusionSeverity;
  /** Short label for the UI. */
  label: string;
  /** One sentence a clinician would recognise. */
  detail: string;
  /** True when this result means another test is required to interpret it. */
  needsToePressure?: boolean;
}

export const ABI_BANDS = {
  nonCompressible: 1.4,
  normalLow: 1.0,
  borderlineLow: 0.91,
  severeMax: 0.39,
  urgentReferral: 0.5,
} as const;

/** Ankle-brachial index. Values outside 0.2–1.6 are almost certainly typos. */
export function interpretAbi(abi: number): PressureInterpretation | null {
  if (!Number.isFinite(abi) || abi <= 0) return null;
  if (abi > ABI_BANDS.nonCompressible) {
    return {
      severity: "unreliable",
      label: "Non-compressible arteries",
      detail:
        "An ABI above 1.4 usually means calcified, incompressible ankle arteries — common in diabetes. It does not rule out disease; a toe pressure or toe-brachial index is needed instead.",
      needsToePressure: true,
    };
  }
  if (abi >= ABI_BANDS.normalLow) {
    return {
      severity: "normal",
      label: "Normal",
      detail: "Ankle pressure is in the normal range relative to the arm.",
    };
  }
  if (abi >= ABI_BANDS.borderlineLow) {
    return {
      severity: "borderline",
      label: "Borderline",
      detail: "Slightly below normal. Worth repeating and watching alongside symptoms.",
    };
  }
  if (abi > ABI_BANDS.severeMax) {
    return {
      severity: abi < ABI_BANDS.urgentReferral ? "critical" : "reduced",
      label: abi < ABI_BANDS.urgentReferral ? "Severely reduced" : "Reduced",
      detail:
        abi < ABI_BANDS.urgentReferral
          ? "An ABI below 0.5 indicates severe arterial disease; prompt vascular assessment is usually indicated, especially with a wound present."
          : "Consistent with mild-to-moderate peripheral arterial disease.",
    };
  }
  return {
    severity: "critical",
    label: "Severely reduced",
    detail:
      "An ABI at or below 0.4 indicates severe arterial disease. With a foot wound this is a limb-threatening combination and warrants urgent vascular assessment.",
  };
}

/** Toe-brachial index — the test to use when the ABI is non-compressible. */
export function interpretTbi(tbi: number): PressureInterpretation | null {
  if (!Number.isFinite(tbi) || tbi <= 0) return null;
  if (tbi >= 0.7) {
    return {
      severity: "normal",
      label: "Normal",
      detail: "Toe pressure is in the normal range relative to the arm.",
    };
  }
  if (tbi >= 0.6) {
    return {
      severity: "borderline",
      label: "Borderline",
      detail: "Just below the usual 0.70 cut-off. Repeat and interpret with symptoms.",
    };
  }
  return {
    severity: "reduced",
    label: "Reduced",
    detail:
      "A toe-brachial index below 0.6 supports a diagnosis of peripheral arterial disease.",
  };
}

/**
 * Absolute toe pressure in mmHg. The 30 mmHg line is the one that matters for
 * a foot wound: below it, healing without revascularisation is unlikely.
 */
export function interpretToePressure(mmHg: number): PressureInterpretation | null {
  if (!Number.isFinite(mmHg) || mmHg < 0) return null;
  if (mmHg >= 60) {
    return {
      severity: "normal",
      label: "Adequate",
      detail: "Toe pressure is comfortably above the level associated with wound healing.",
    };
  }
  if (mmHg >= 30) {
    return {
      severity: "borderline",
      label: "Marginal",
      detail:
        "Toe pressure between 30 and 60 mmHg is marginal for healing; a wound here needs close vascular follow-up.",
    };
  }
  return {
    severity: "critical",
    label: "Critically low",
    detail:
      "A toe pressure below 30 mmHg indicates critical ischaemia — wounds are unlikely to heal without revascularisation.",
  };
}

/** Absolute ankle pressure in mmHg. */
export function interpretAnklePressure(mmHg: number): PressureInterpretation | null {
  if (!Number.isFinite(mmHg) || mmHg < 0) return null;
  if (mmHg >= 70) {
    return {
      severity: "normal",
      label: "Adequate",
      detail: "Ankle pressure is above the level usually needed for healing.",
    };
  }
  if (mmHg >= 50) {
    return {
      severity: "borderline",
      label: "Marginal",
      detail: "Ankle pressure between 50 and 70 mmHg is marginal for wound healing.",
    };
  }
  return {
    severity: "critical",
    label: "Critically low",
    detail:
      "An ankle pressure below 50 mmHg indicates critical ischaemia and warrants urgent vascular assessment.",
  };
}

export interface MeasuredPressures {
  /** Per side, because peripheral arterial disease is frequently one-sided. */
  side: "left" | "right";
  abi?: number;
  tbi?: number;
  toePressureMmHg?: number;
  anklePressureMmHg?: number;
  /** How the values were obtained, recorded so a reader can weigh them. */
  method?: "doppler" | "oscillometric" | "photoplethysmography" | "unknown";
  measuredAt?: number;
}

export interface PressureAssessment {
  side: "left" | "right";
  severity: PerfusionSeverity;
  findings: { test: string; value: string; interpretation: PressureInterpretation }[];
  /** Set when the ABI is uninterpretable and a toe pressure is required. */
  needsToePressure: boolean;
}

const SEVERITY_RANK: Record<PerfusionSeverity, number> = {
  normal: 0,
  borderline: 1,
  unreliable: 2,
  reduced: 3,
  critical: 4,
};

/**
 * Combine whatever pressures were measured for one limb. The worst finding
 * drives the severity — with perfusion, the reassuring test never cancels the
 * alarming one.
 */
export function assessMeasuredPressures(
  pressures: MeasuredPressures
): PressureAssessment | null {
  const findings: PressureAssessment["findings"] = [];
  const add = (
    test: string,
    value: number | undefined,
    format: (v: number) => string,
    interpret: (v: number) => PressureInterpretation | null
  ) => {
    if (value === undefined) return;
    const interpretation = interpret(value);
    if (interpretation) {
      findings.push({ test, value: format(value), interpretation });
    }
  };

  add("ABI", pressures.abi, (v) => v.toFixed(2), interpretAbi);
  add("TBI", pressures.tbi, (v) => v.toFixed(2), interpretTbi);
  add("Toe pressure", pressures.toePressureMmHg, (v) => `${v} mmHg`, interpretToePressure);
  add("Ankle pressure", pressures.anklePressureMmHg, (v) => `${v} mmHg`, interpretAnklePressure);

  if (findings.length === 0) return null;

  const severity = findings.reduce<PerfusionSeverity>((worst, finding) => {
    const current = finding.interpretation.severity;
    return SEVERITY_RANK[current] > SEVERITY_RANK[worst] ? current : worst;
  }, "normal");

  // A non-compressible ABI stops being the headline once a toe pressure exists.
  const hasToeMeasure =
    pressures.tbi !== undefined || pressures.toePressureMmHg !== undefined;
  const needsToePressure =
    !hasToeMeasure && findings.some((f) => f.interpretation.needsToePressure);

  return { side: pressures.side, severity, findings, needsToePressure };
}
