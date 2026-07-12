/**
 * Builds a portable, shareable patient summary from the current visit. Used
 * by all three share options (email body, PDF download, /clinical URL view).
 */

import { buildClinicalDetail, type ClinicalDetail } from "./clinicalDetail";
import {
  GLUCOSE_RANGES,
  type PatientProfile,
  type PhotoScreeningResult,
  type Visit,
} from "./types";
import {
  conditionToText,
  getCondition,
  type ConditionDefinition,
} from "./conditionDefinitions";

export interface PatientSummary {
  generatedAt: number;
  patient: {
    fullName?: string;
    age?: number;
    sex?: string;
    city?: string;
    state?: string;
    ethnicity?: string;
    shoeSizeUS?: number;
    footLengthMm?: number;
  };
  visit: {
    id: string;
    startedAt?: number;
    completedAt?: number;
    scanPath?: string;
    riskLevel?: string;
  };
  riskFactors: string[];
  medicalHistory: string[];
  diabetes?: {
    type: string;
    yearDiagnosed: number;
    yearsSinceDiagnosis: number;
    hba1c?: number;
    eAGmgdl?: number;
    glucoseCategory?: string;
    glucoseLabel?: string;
  };
  pad?: {
    status: string;
    abi?: number;
    claudication: boolean;
    restPain: boolean;
    signs: string[];
  };
  priorEvents: {
    type: string;
    side: string;
    region: string;
    year: number;
  }[];
  recentSurgery: {
    flag: boolean;
    procedures: string[];
  };
  numbness?: string;
  alcohol?: boolean;
  smoking?: boolean;
  painPresent?: boolean;
  painPoints: string[];
  detections: {
    type: string;
    side: string;
    view: string;
    confidence: number;
  }[];
  volumetrics: {
    side: string;
    footLengthMm: number;
    plantarAreaCm2: number;
    archProfileMm: number;
    bilateralAsymmetryIndex: number;
    woundVolumeMm3?: number;
    woundDepthMm?: number;
  }[];
  clinicalDetail: ClinicalDetail | null;
  /** Definitions for each selected medical-history condition. */
  conditionDefinitions: ConditionDefinition[];
  captureCounts: {
    images: number;
    meshes: number;
    meanImageConfidence: number;
    meanMeshConfidence: number;
  };
  screening?: PhotoScreeningResult;
}

const a1cToEag = (a1c: number) => Math.round(28.7 * a1c - 46.7);

export function buildPatientSummary(
  visit: Visit | null,
  profile: Partial<PatientProfile>
): PatientSummary | null {
  if (!visit) return null;
  const result = visit.result;

  const imgConfs = visit.images.map((i) => i.detection?.confidence ?? 0);
  const meshConfs = visit.meshes.map((m) => m.detection?.confidence ?? 0);

  const diabetes = profile.diabetes
    ? {
        type: profile.diabetes.type,
        yearDiagnosed: profile.diabetes.yearDiagnosed,
        yearsSinceDiagnosis:
          new Date().getFullYear() - profile.diabetes.yearDiagnosed,
        hba1c: profile.diabetes.hba1c,
        eAGmgdl:
          profile.diabetes.hba1c != null
            ? a1cToEag(profile.diabetes.hba1c)
            : undefined,
        glucoseCategory: profile.diabetes.glucoseCategory,
        glucoseLabel: profile.diabetes.glucoseCategory
          ? GLUCOSE_RANGES.find(
              (r) => r.value === profile.diabetes!.glucoseCategory
            )?.label
          : undefined,
      }
    : undefined;

  return {
    generatedAt: Date.now(),
    patient: {
      fullName: profile.fullName,
      age: profile.age,
      sex: profile.sex,
      city: profile.city,
      state: profile.state,
      ethnicity: profile.ethnicity,
      shoeSizeUS: profile.shoeSizeUS,
      footLengthMm: profile.footLengthMm,
    },
    visit: {
      id: visit.id,
      startedAt: visit.startedAt,
      completedAt: visit.completedAt,
      riskLevel: result?.riskLevel,
    },
    riskFactors: result?.riskFactors ?? [],
    medicalHistory: profile.conditions ?? [],
    diabetes,
    pad: profile.pad
      ? {
          status: profile.pad.status,
          abi: profile.pad.abi,
          claudication: profile.pad.claudication,
          restPain: profile.pad.restPain,
          signs: profile.pad.signs,
        }
      : undefined,
    priorEvents: (profile.priorEvents ?? []).map((e) => ({
      type: e.type,
      side: e.side,
      region: e.region,
      year: e.year,
    })),
    recentSurgery: {
      flag: profile.recentSurgery?.flag ?? false,
      procedures: profile.recentSurgery?.procedures ?? [],
    },
    numbness: profile.numbness,
    alcohol: profile.alcohol,
    smoking: profile.smoking,
    painPresent: profile.painPresent,
    painPoints: profile.painPoints ?? [],
    detections: (result?.detections ?? []).map((d) => ({
      type: d.type,
      side: d.side,
      view: d.view,
      confidence: d.confidence,
    })),
    volumetrics: result?.volumetrics ?? [],
    clinicalDetail: result?.screening ? null : buildClinicalDetail(visit, profile),
    conditionDefinitions: (profile.conditions ?? [])
      .map((c) => getCondition(c))
      .filter((c): c is ConditionDefinition => !!c),
    captureCounts: {
      images: visit.images.length,
      meshes: visit.meshes.length,
      meanImageConfidence: imgConfs.length
        ? imgConfs.reduce((a, b) => a + b, 0) / imgConfs.length
        : 0,
      meanMeshConfidence: meshConfs.length
        ? meshConfs.reduce((a, b) => a + b, 0) / meshConfs.length
        : 0,
    },
    screening: result?.screening,
  };
}

/** URL-safe base64 encoder for sharing summaries via querystring. */
export function encodeSummaryToUrl(summary: PatientSummary): string {
  const json = JSON.stringify(summary);
  // Convert to UTF-8 bytes via encodeURIComponent (handles non-ASCII) then b64.
  const b64 = btoa(unescape(encodeURIComponent(json)));
  // Make URL-safe.
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSummaryFromUrl(encoded: string): PatientSummary | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
    const json = decodeURIComponent(escape(atob(b64 + "=".repeat(pad))));
    return JSON.parse(json) as PatientSummary;
  } catch {
    return null;
  }
}

/** Plain-text email body for mailto: links. */
export function summaryToEmailBody(s: PatientSummary): string {
  const lines: string[] = [];
  lines.push(`SoleIQ — Foot Risk Screening Summary`);
  lines.push(`Generated ${new Date(s.generatedAt).toLocaleString()}`);
  lines.push("");
  if (s.patient.fullName) lines.push(`Patient: ${s.patient.fullName}`);
  if (s.patient.age) lines.push(`Age: ${s.patient.age}`);
  if (s.patient.sex) lines.push(`Sex: ${s.patient.sex}`);
  if (s.patient.city || s.patient.state)
    lines.push(`Location: ${[s.patient.city, s.patient.state].filter(Boolean).join(", ")}`);
  lines.push("");
  if (s.screening) {
    const labels = {
      clear: "Looks clear",
      watch: "Watch this",
      see_someone_soon: "See someone soon",
      urgent: "Urgent, get care now",
    };
    lines.push(`RESULT: ${labels[s.screening.overall.level]}`);
    lines.push(s.screening.overall.headline);
  } else if (s.visit.riskLevel) {
    lines.push(`OVERALL RISK: ${s.visit.riskLevel.toUpperCase()}`);
  }
  if (!s.screening && s.riskFactors.length) {
    lines.push("");
    lines.push("Top contributing factors:");
    s.riskFactors.forEach((f) => lines.push(`  • ${f}`));
  }
  if (s.diabetes) {
    lines.push("");
    lines.push("Diabetes:");
    lines.push(
      `  • ${s.diabetes.type.replace("_", " ")} — diagnosed ${s.diabetes.yearDiagnosed} (${s.diabetes.yearsSinceDiagnosis}y)`
    );
    if (s.diabetes.hba1c != null)
      lines.push(
        `  • HbA1c ${s.diabetes.hba1c.toFixed(1)}% (eAG ${s.diabetes.eAGmgdl} mg/dL)`
      );
    if (s.diabetes.glucoseLabel)
      lines.push(`  • Latest meter: ${s.diabetes.glucoseLabel}`);
  }
  if (s.pad) {
    lines.push("");
    lines.push("PAD assessment:");
    lines.push(`  • Status: ${s.pad.status}`);
    if (s.pad.abi != null) lines.push(`  • ABI: ${s.pad.abi.toFixed(2)}`);
    if (s.pad.claudication) lines.push(`  • Claudication: yes`);
    if (s.pad.restPain) lines.push(`  • Rest pain: yes`);
    if (s.pad.signs.length) lines.push(`  • Signs: ${s.pad.signs.join("; ")}`);
  }
  if (s.medicalHistory.length) {
    lines.push("");
    lines.push(`Medical history: ${s.medicalHistory.join(", ")}`);
  }
  if (s.priorEvents.length) {
    lines.push("");
    lines.push("Prior foot events:");
    s.priorEvents.forEach((e) =>
      lines.push(`  • ${e.year} ${e.side} ${e.region.replace("_", " ")} — ${e.type}`)
    );
  }
  if (s.recentSurgery.flag && s.recentSurgery.procedures.length) {
    lines.push("");
    lines.push(`Recent surgery: ${s.recentSurgery.procedures.join(", ")}`);
  }
  if (s.screening?.findings.length) {
    lines.push("");
    lines.push("Visible findings:");
    s.screening.findings.forEach((finding) =>
      lines.push(
        `  • ${finding.what_we_saw} — ${finding.foot} ${finding.surface}, ${finding.location_plain}`
      )
    );
    lines.push("");
    lines.push("What to do next:");
    s.screening.what_to_do.forEach((item) => lines.push(`  • ${item}`));
    lines.push("");
    lines.push("When to get help:");
    s.screening.when_to_get_help.forEach((item) => lines.push(`  • ${item}`));
    lines.push("");
    lines.push(`Photo limits: ${s.screening.limits}`);
  } else if (s.detections.length) {
    lines.push("");
    lines.push("Detected findings:");
    s.detections.forEach((d) =>
      lines.push(
        `  • ${d.type} (${d.side} ${d.view})`
      )
    );
  }
  if (s.clinicalDetail) {
    lines.push("");
    lines.push(
      `Recommended follow-up: ${s.clinicalDetail.followUp.cadence} — ${s.clinicalDetail.followUp.rationale}`
    );
  }
  if (s.conditionDefinitions.length > 0) {
    lines.push("");
    lines.push("==========================================");
    lines.push("CONDITION REFERENCE");
    lines.push("==========================================");
    s.conditionDefinitions.forEach((c) => {
      lines.push("");
      lines.push(conditionToText(c));
    });
  }
  lines.push("");
  lines.push("---");
  lines.push(
    "This photo screening is not a diagnosis. A photo cannot rule out every foot problem; seek professional care when concerned."
  );
  return lines.join("\n");
}
