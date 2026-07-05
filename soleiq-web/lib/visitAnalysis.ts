"use client";

/**
 * Client-side glue between the per-image AI pipeline and the visit-level
 * result the Results screen renders.
 *
 *   submitImageForAnalysis()  — sends ONE captured image to /api/analyze and
 *                               merges the reply (or the failure) onto the
 *                               visit's CapturedImage in the store. Both the
 *                               capture flow and Processing's retry path use
 *                               this; it is the only caller of
 *                               analyzeFootImage() besides tests.
 *
 *   aggregateVisitResult()    — pure function folding the 8 per-image dual
 *                               readings into one AnalysisResult (worst-case
 *                               patient reading, merged guidance, OR'd
 *                               clinical booleans, merged flags).
 */

import { analyzeFootImage } from "./analyzeFootImage";
import { useSoleiqStore } from "./store";
import type {
  AnalysisResult,
  CapturedImage,
  ClinicianReading,
  PatientReading,
  ReadingFlags,
  ReadingSeverity,
  RiskLevel,
  Visit,
  VisitReading,
} from "./types";

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export async function submitImageForAnalysis(
  img: Pick<CapturedImage, "side" | "view" | "dataUrl" | "capturedAt">,
  opts: {
    source: "live" | "upload";
    visitId?: string | null;
    patientId?: string | null;
  },
): Promise<void> {
  const { setImageAiResult } = useSoleiqStore.getState();
  try {
    const r = await analyzeFootImage({
      dataUrl: img.dataUrl,
      side: img.side,
      view: img.view,
      source: opts.source,
      visitId: opts.visitId ?? null,
      patientId: opts.patientId ?? null,
      capturedAt: img.capturedAt,
    });
    setImageAiResult(img.side, img.view, {
      assessment: r.second_opinion?.assessment ?? null,
      summary: r.second_opinion?.summary ?? null,
      probability: r.prediction?.probability ?? null,
      confidence: r.second_opinion?.confidence ?? null,
      heatmap_url: r.heatmap_url ?? null,
      scan_id: r.scan_id ?? null,
      storage_url: r.storage_url ?? null,
      urgent_flags: r.second_opinion?.urgent_flags ?? [],
      patient: r.patient ?? null,
      clinician: r.clinician ?? null,
      flags: r.flags ?? null,
      error: null,
      raw: r,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Record the failure on the image so Processing can distinguish
    // "in flight" from "failed" and offer a retry.
    setImageAiResult(img.side, img.view, { error: message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<ReadingSeverity, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

function riskFromReading(patient: PatientReading, flags: ReadingFlags): RiskLevel {
  if (flags.needs_urgent_care || patient.severity === "severe") return "high";
  if (patient.severity === "moderate") return "medium";
  return "low";
}

/** Highest numeric Wagner grade across images; "n/a" only if all are n/a. */
function worstWagner(grades: string[]): string {
  const numeric = grades
    .map((g) => Number.parseInt(g, 10))
    .filter((n) => Number.isFinite(n));
  return numeric.length ? String(Math.max(...numeric)) : "n/a";
}

function mergeUnique(lists: string[][], cap: number): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (out.length >= cap) return out;
      if (!out.some((x) => x.toLowerCase() === item.toLowerCase())) {
        out.push(item);
      }
    }
  }
  return out;
}

export interface VisitReadinessReport {
  /** Every image has an AI reply (success or recorded failure). */
  settled: boolean;
  pendingCount: number;
  failedImages: CapturedImage[];
  /** Images the AI refused to read (bad quality / not a foot). */
  badPhotoImages: CapturedImage[];
}

export function assessVisitReadiness(visit: Visit): VisitReadinessReport {
  const pending = visit.images.filter((i) => !i.aiResult);
  const failed = visit.images.filter((i) => i.aiResult?.error);
  const badPhoto = visit.images.filter((i) => {
    const f = i.aiResult?.flags;
    return f ? !f.image_quality_ok || !f.is_foot : false;
  });
  return {
    settled: pending.length === 0 && failed.length === 0,
    pendingCount: pending.length,
    failedImages: failed,
    badPhotoImages: badPhoto,
  };
}

/**
 * Fold the per-image dual readings into the visit result. Call only once
 * every image has a successful aiResult with dual blocks (assessVisitReadiness
 * settled + no bad photos); images without blocks are skipped defensively.
 */
export function aggregateVisitResult(visit: Visit): AnalysisResult {
  const read = visit.images.filter(
    (i) => i.aiResult?.patient && i.aiResult?.clinician && i.aiResult?.flags,
  );

  const perImage: VisitReading["perImage"] = visit.images.map((i) => ({
    side: i.side,
    view: i.view,
    patient: i.aiResult?.patient ?? null,
    clinician: i.aiResult?.clinician ?? null,
    flags: i.aiResult?.flags ?? null,
  }));

  // Worst-case image drives the headline reading. Ties break toward the
  // urgent one, then the lower-confidence one stays put (stable sort).
  const worst = [...read].sort((a, b) => {
    const pa = a.aiResult!.patient!;
    const pb = b.aiResult!.patient!;
    const bySeverity = SEVERITY_RANK[pb.severity] - SEVERITY_RANK[pa.severity];
    if (bySeverity !== 0) return bySeverity;
    return Number(pb.urgent) - Number(pa.urgent);
  })[0];

  const flags: ReadingFlags = {
    image_quality_ok: read.every((i) => i.aiResult!.flags!.image_quality_ok),
    is_foot: read.every((i) => i.aiResult!.flags!.is_foot),
    needs_urgent_care: read.some((i) => i.aiResult!.flags!.needs_urgent_care),
  };

  const worstPatient = worst?.aiResult?.patient;
  const anyConcern = read.some(
    (i) => i.aiResult!.patient!.severity !== "none",
  );
  const patient: PatientReading = worstPatient
    ? {
        ...worstPatient,
        // Merge guidance across images — worst image's steps first.
        care_guidance: mergeUnique(
          [worstPatient.care_guidance, ...read.map((i) => i.aiResult!.patient!.care_guidance)],
          4,
        ),
        see_a_clinician_if: mergeUnique(
          [
            worstPatient.see_a_clinician_if,
            ...read.map((i) => i.aiResult!.patient!.see_a_clinician_if),
          ],
          3,
        ),
        headline: anyConcern
          ? worstPatient.headline
          : "No areas of concern were flagged across your foot photos.",
        urgent: flags.needs_urgent_care,
      }
    : {
        headline: "Your photos couldn't be analyzed this time.",
        likely_finding: "unclear",
        severity: "none",
        confidence: "low",
        care_guidance: ["Try the scan again, or check back later."],
        see_a_clinician_if: [
          "You have an open sore, blister, or wound that is not healing.",
        ],
        urgent: false,
      };

  const clinicians = read
    .map((i) => i.aiResult!.clinician!)
    .filter(Boolean) as ClinicianReading[];
  const worstClinician = worst?.aiResult?.clinician ?? clinicians[0];
  const clinician: ClinicianReading = {
    morphology:
      worstClinician?.morphology ?? "No assessable lesion description.",
    // Worst image's differential leads — the whole point of the snapshot.
    differential: mergeUnique(
      [worstClinician?.differential ?? [], ...clinicians.map((c) => c.differential)],
      3,
    ),
    estimated_wagner_grade: worstWagner(
      clinicians.map((c) => c.estimated_wagner_grade),
    ),
    erythema: clinicians.some((c) => c.erythema),
    exudate: clinicians.some((c) => c.exudate),
    necrosis: clinicians.some((c) => c.necrosis),
    infection_signs: clinicians.some((c) => c.infection_signs),
    suggested_followup:
      worstClinician?.suggested_followup ?? "Routine podiatry review.",
  };

  const riskFactors = mergeUnique(
    [
      read
        .filter((i) => i.aiResult!.patient!.severity !== "none")
        .map(
          (i) =>
            `${i.aiResult!.patient!.likely_finding} (${i.side} foot, ${i.view.replace("_", " ")})`,
        ),
    ],
    5,
  );

  const modelVersion =
    (worst?.aiResult?.raw as { model_version?: string } | undefined)
      ?.model_version ?? null;

  return {
    visitId: visit.id,
    scoredAt: Date.now(),
    riskLevel: riskFromReading(patient, flags),
    riskFactors,
    // The real pipeline produces narrative + booleans, not polygon overlays
    // or volumetric estimates — those were simulator artifacts.
    detections: [],
    volumetrics: [],
    trend: "first_scan",
    reading: { patient, clinician, flags, perImage, modelVersion },
  };
}
