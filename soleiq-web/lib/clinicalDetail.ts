/**
 * Builds the doctor-level analytics view from a completed visit + patient
 * profile. Pure function — no side effects, no async. Drives the "Clinical
 * detail" tab on the Results screen.
 */

import { GLUCOSE_RANGES, type PatientProfile, type Visit } from "./types";

export type AxisScore = "low" | "medium" | "high";

export interface RiskAxis {
  id: string;
  label: string;
  score: AxisScore;
  signals: string[];
  weight: number; // 0..1 relative contribution to overall risk
}

export interface FollowUpRecommendation {
  cadence: string;
  rationale: string;
}

export interface ClinicalDetail {
  riskAxes: RiskAxis[];
  followUp: FollowUpRecommendation;
  differential: string[];
  citations: { label: string; url?: string }[];
  captureQuality: {
    overallConfidence: number;
    images: {
      side: string;
      view: string;
      confidence: number;
      silhouettePx: number;
    }[];
    meshes: {
      side: string;
      confidence: number;
      silhouettePx: number;
    }[];
  };
  vascular: {
    status: string;
    abi?: number;
    claudication: boolean;
    restPain: boolean;
    signsCount: number;
  };
  glycemic: {
    hba1cText: string;
    eAGmgdl?: number;
    glucoseLabel?: string;
    diabetesType?: string;
    yearsWithDiabetes?: number;
  };
  neuropathic: {
    numbness: string;
    priorUlcers: number;
    priorAmputations: number;
  };
  mechanical: {
    asymmetryIndex?: number;
    archProfileMm?: { left?: number; right?: number };
    footLengthMm?: { left?: number; right?: number };
    woundVolumeMm3?: { left?: number; right?: number };
  };
}

const a1cToEag = (a1c: number) => 28.7 * a1c - 46.7;

const SCORE: Record<AxisScore, number> = { low: 0, medium: 1, high: 2 };

/** Take the worse of two scores — never downgrade. */
function escalate(current: AxisScore, target: AxisScore): AxisScore {
  return SCORE[target] > SCORE[current] ? target : current;
}

export function buildClinicalDetail(
  visit: Visit | null,
  profile: Partial<PatientProfile>
): ClinicalDetail | null {
  if (!visit?.result) return null;
  const result = visit.result;

  // ---------- Risk axes ----------
  const axes: RiskAxis[] = [];

  // Vascular axis (PAD)
  {
    const pad = profile.pad;
    const signals: string[] = [];
    let score: AxisScore = "low";
    if (pad?.status === "diagnosed") {
      score = "medium";
      signals.push("PAD diagnosed in history");
    } else if (pad?.status === "suspected") {
      score = "medium";
      signals.push("PAD suspected / under workup");
    }
    if (pad?.claudication) {
      score = "medium";
      signals.push("Intermittent claudication");
    }
    if (pad?.restPain) {
      score = "high";
      signals.push("Rest pain (possible critical limb ischemia)");
    }
    if (pad?.abi != null) {
      const a = pad.abi;
      if (a < 0.5) {
        score = "high";
        signals.push(`ABI ${a.toFixed(2)} — severe disease`);
      } else if (a < 0.9) {
        score = escalate(score, "medium");
        signals.push(`ABI ${a.toFixed(2)} — abnormal`);
      } else if (a > 1.3) {
        score = escalate(score, "medium");
        signals.push(`ABI ${a.toFixed(2)} — non-compressible vessels`);
      } else {
        signals.push(`ABI ${a.toFixed(2)} — within normal range`);
      }
    }
    if ((pad?.signs?.length ?? 0) >= 2) {
      score = escalate(score, "medium");
      signals.push(`${pad?.signs?.length} clinical vascular signs`);
    }
    if (signals.length === 0) signals.push("No documented PAD or vascular signs");
    axes.push({
      id: "vascular",
      label: "Vascular (PAD)",
      score,
      signals,
      weight: 0.3,
    });
  }

  // Neuropathic axis
  {
    const signals: string[] = [];
    let score: AxisScore = "low";
    const numbness = profile.numbness;
    if (numbness === "both") {
      score = "high";
      signals.push("Bilateral numbness — peripheral neuropathy likely");
    } else if (numbness === "left" || numbness === "right") {
      score = "medium";
      signals.push(`Unilateral numbness (${numbness} foot)`);
    } else {
      signals.push("No reported numbness");
    }
    const priorUlcers =
      profile.priorEvents?.filter((e) => e.type === "ulcer").length ?? 0;
    const priorAmps =
      profile.priorEvents?.filter((e) => e.type === "amputation").length ?? 0;
    if (priorUlcers > 0) {
      score = "high";
      signals.push(`${priorUlcers} prior ulcer${priorUlcers === 1 ? "" : "s"}`);
    }
    if (priorAmps > 0) {
      score = "high";
      signals.push(
        `${priorAmps} prior amputation${priorAmps === 1 ? "" : "s"}`
      );
    }
    axes.push({
      id: "neuropathic",
      label: "Neuropathic / prior events",
      score,
      signals,
      weight: 0.3,
    });
  }

  // Glycemic axis
  {
    const signals: string[] = [];
    let score: AxisScore = "low";
    const d = profile.diabetes;
    if (d?.type && d.type !== "not_sure") {
      const dur = d.yearDiagnosed
        ? new Date().getFullYear() - d.yearDiagnosed
        : 0;
      signals.push(
        `${d.type.replace("_", " ").toUpperCase()} diabetes, ${dur} year${dur === 1 ? "" : "s"} since diagnosis`
      );
      if (dur >= 10) {
        score = "medium";
        signals.push("≥10 year duration — increased ulcer risk");
      }
    }
    if (d?.hba1c != null) {
      if (d.hba1c >= 9) {
        score = "high";
        signals.push(`HbA1c ${d.hba1c.toFixed(1)}% — poorly controlled`);
      } else if (d.hba1c >= 7.5) {
        score = escalate(score, "medium");
        signals.push(`HbA1c ${d.hba1c.toFixed(1)}% — above target`);
      } else {
        signals.push(`HbA1c ${d.hba1c.toFixed(1)}% — at or near target`);
      }
    }
    if (d?.glucoseCategory) {
      const range = GLUCOSE_RANGES.find((r) => r.value === d.glucoseCategory);
      if (range) {
        if (range.severity === "emergency") {
          score = "high";
          signals.push(`Latest meter reading: ${range.label} — urgent`);
        } else if (range.severity === "warning") {
          score = escalate(score, "medium");
          signals.push(`Latest meter reading: ${range.label}`);
        } else {
          signals.push(`Latest meter reading: ${range.label}`);
        }
      }
    }
    if (signals.length === 0) signals.push("No diabetes documented");
    axes.push({
      id: "glycemic",
      label: "Glycemic control",
      score,
      signals,
      weight: 0.2,
    });
  }

  // Wound burden axis (from detections)
  {
    const signals: string[] = [];
    let score: AxisScore = "low";
    const wounds = result.detections.filter((d) => d.type === "wound");
    const redness = result.detections.filter((d) => d.type === "redness");
    const callus = result.detections.filter((d) => d.type === "callus");
    if (wounds.length > 0) {
      score = "high";
      signals.push(`${wounds.length} active wound${wounds.length === 1 ? "" : "s"} detected`);
    }
    if (redness.length > 0) {
      score = escalate(score, "medium");
      signals.push(`${redness.length} redness region${redness.length === 1 ? "" : "s"} — possible pre-ulcer`);
    }
    if (callus.length > 0) {
      score = escalate(score, "medium");
      signals.push(`${callus.length} callus region${callus.length === 1 ? "" : "s"} — mechanical stress`);
    }
    if (signals.length === 0) signals.push("No skin lesions detected");
    axes.push({
      id: "wound",
      label: "Skin / wound burden",
      score,
      signals,
      weight: 0.2,
    });
  }

  // ---------- Follow-up cadence ----------
  const followUp: FollowUpRecommendation = (() => {
    const r = result.riskLevel;
    if (r === "high")
      return {
        cadence: "1–4 weeks",
        rationale:
          "IWGDF Risk 3 — active or recent wound, prior amputation, or critical limb ischemia warrants close interval follow-up and prompt specialist referral.",
      };
    if (r === "medium")
      return {
        cadence: "3–6 months",
        rationale:
          "IWGDF Risk 1–2 — neuropathy, PAD, or deformity present. Reassess at each diabetes visit; structured foot screening every 3–6 months.",
      };
    return {
      cadence: "12 months",
      rationale:
        "IWGDF Risk 0 — no neuropathy, no PAD, no history. Annual foot screening with patient education sufficient.",
    };
  })();

  // ---------- Differential considerations ----------
  const differential: string[] = [];
  if (result.detections.some((d) => d.type === "wound")) {
    differential.push("Neuropathic ulcer (loss of protective sensation)");
    differential.push("Ischemic ulcer (PAD-driven)");
    differential.push("Neuro-ischemic ulcer (mixed)");
  }
  if (result.detections.some((d) => d.type === "redness")) {
    differential.push("Pre-ulcerative inflammation (sustained pressure point)");
    differential.push("Early Charcot foot (if warmth + edema + deformity)");
    differential.push("Cellulitis (if pain + warmth + spreading)");
  }
  if (
    profile.pad?.restPain ||
    (profile.pad?.abi != null && profile.pad.abi < 0.5)
  ) {
    differential.push("Critical limb ischemia — urgent vascular consult");
  }
  if (differential.length === 0)
    differential.push("No differential indicated at this risk level");

  // ---------- Citations ----------
  const citations = [
    {
      label: "IWGDF Guidelines on the prevention and management of diabetes-related foot disease (2023)",
      url: "https://iwgdfguidelines.org",
    },
    {
      label: "ADA Standards of Care 2025 — Section 12: Microvascular Complications",
    },
    {
      label: "ADA/JDRF/EASD International Consensus on Use of Continuous Glucose Monitoring",
    },
  ];

  // ---------- Capture quality ----------
  const imgConfs = visit.images.map((i) => i.detection?.confidence ?? 0);
  const meshConfs = visit.meshes.map((m) => m.detection?.confidence ?? 0);
  const allConfs = [...imgConfs, ...meshConfs];
  const overallConfidence = allConfs.length
    ? allConfs.reduce((a, b) => a + b, 0) / allConfs.length
    : 0;
  const captureQuality = {
    overallConfidence,
    images: visit.images.map((i) => ({
      side: i.side,
      view: i.view,
      confidence: i.detection?.confidence ?? 0,
      silhouettePx: i.detection?.silhouettePx ?? 0,
    })),
    meshes: visit.meshes.map((m) => ({
      side: m.side,
      confidence: m.detection?.confidence ?? 0,
      silhouettePx: m.detection?.silhouettePx ?? m.heightmap?.silhouettePx ?? 0,
    })),
  };

  // ---------- Snapshots ----------
  const vascular = {
    status: profile.pad?.status ?? "unknown",
    abi: profile.pad?.abi,
    claudication: !!profile.pad?.claudication,
    restPain: !!profile.pad?.restPain,
    signsCount: profile.pad?.signs?.length ?? 0,
  };

  const glycemic = {
    hba1cText:
      profile.diabetes?.hba1c != null
        ? `${profile.diabetes.hba1c.toFixed(1)}%`
        : "not provided",
    eAGmgdl:
      profile.diabetes?.hba1c != null
        ? Math.round(a1cToEag(profile.diabetes.hba1c))
        : undefined,
    glucoseLabel: profile.diabetes?.glucoseCategory
      ? GLUCOSE_RANGES.find((r) => r.value === profile.diabetes!.glucoseCategory)
          ?.label
      : undefined,
    diabetesType:
      profile.diabetes?.type && profile.diabetes.type !== "not_sure"
        ? profile.diabetes.type.replace("_", " ")
        : undefined,
    yearsWithDiabetes:
      profile.diabetes?.yearDiagnosed != null
        ? new Date().getFullYear() - profile.diabetes.yearDiagnosed
        : undefined,
  };

  const neuropathic = {
    numbness: profile.numbness ?? "neither",
    priorUlcers:
      profile.priorEvents?.filter((e) => e.type === "ulcer").length ?? 0,
    priorAmputations:
      profile.priorEvents?.filter((e) => e.type === "amputation").length ?? 0,
  };

  const right = result.volumetrics.find((v) => v.side === "right");
  const left = result.volumetrics.find((v) => v.side === "left");
  const mechanical = {
    asymmetryIndex: right?.bilateralAsymmetryIndex,
    archProfileMm: {
      right: right?.archProfileMm,
      left: left?.archProfileMm,
    },
    footLengthMm: {
      right: right?.footLengthMm,
      left: left?.footLengthMm,
    },
    woundVolumeMm3: {
      right: right?.woundVolumeMm3,
      left: left?.woundVolumeMm3,
    },
  };

  return {
    riskAxes: axes,
    followUp,
    differential,
    citations,
    captureQuality,
    vascular,
    glycemic,
    neuropathic,
    mechanical,
  };
}

export function overallAxisScore(axes: RiskAxis[]): AxisScore {
  const weighted = axes.reduce((acc, a) => acc + SCORE[a.score] * a.weight, 0);
  if (weighted >= 1.2) return "high";
  if (weighted >= 0.5) return "medium";
  return "low";
}
