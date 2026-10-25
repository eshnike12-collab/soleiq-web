"use client";

import { evaluateVisitForAnalysis } from "./captureGate";
import { downscaleForModel } from "./downscaleForModel";
import { classifyChange } from "./wound/changeKind";
import {
  type UlcerAnalysis,
  measureUlcerInRegion,
  pixelsFromDataUrl,
} from "./wound";
import type {
  AnalysisResult,
  PatientProfile,
  PhotoScreeningFinding,
  PhotoScreeningResult,
  Visit,
} from "./types";

/* The wound-only gate that used to live here has gone.
   It admitted findings matching /wound|ulcer|open|sore|.../ and discarded
   everything else, so dryness, callus and redness — the commonest findings,
   and the ones that come BEFORE a wound — were never outlined or measured at
   all. Which kind a finding is now decides the segmentation MODE instead of
   whether it is measured; see lib/wound/changeKind.ts. */

/**
 * Measure the wound-like findings the image model localised.
 *
 * Best-effort throughout: the screening result is what the patient is waiting
 * for, and a measurement that fails must never take it down with it.
 */
async function measureUlcers(
  visit: Visit,
  profile: Partial<PatientProfile>,
  screening: PhotoScreeningResult
): Promise<UlcerAnalysis[]> {
  const measurements: UlcerAnalysis[] = [];
  for (const finding of screening.findings) {
    if (!finding.region) continue;
    const kind = classifyChange(finding.what_we_saw);
    // No recognised kind means no segmentation mode to pick. Measuring with
    // an arbitrary one would outline whatever that mode happened to find.
    if (!kind) continue;
    const image = visit.images.find(
      (candidate) =>
        candidate.side === finding.foot && candidate.view === finding.surface
    );
    if (!image) continue;
    try {
      const loaded = await pixelsFromDataUrl(image.dataUrl);
      if (!loaded) continue;
      const analysis = measureUlcerInRegion(
        loaded.pixels,
        loaded.width,
        loaded.height,
        finding.region,
        {
          side: finding.foot,
          view: finding.surface,
          footLengthMm: profile.footLengthMm,
          kind,
        }
      );
      if (analysis) measurements.push(analysis);
    } catch (error) {
      console.error("[soleiq] wound measurement failed", error);
    }
  }
  return measurements;
}

export class PhotoRetakeError extends Error {
  constructor(public reasons: string[]) {
    super("One or more photos need to be retaken.");
    this.name = "PhotoRetakeError";
  }
}

export async function analyzeFootPhotos(
  visit: Visit,
  profile: Partial<PatientProfile>
): Promise<AnalysisResult> {
  const gate = evaluateVisitForAnalysis(visit);
  if (!gate.ok) throw new PhotoRetakeError(gate.issues);

  const response = await fetch("/api/foot-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Downscaled to the model's optimal long edge before upload.
      //
      // A modern phone photo is ~4000px and several megabytes; Anthropic
      // downscales anything over 1568px server-side regardless, so the extra
      // pixels were pure upload time and tokens. The ORIGINAL is untouched —
      // storage and the measurement pipeline both still use it.
      images: await Promise.all(
        visit.images
          .filter((image) => image.view === "top" || image.view === "sole")
          .map(async (image) => ({
            side: image.side,
            surface: image.view,
            // The corrected copy where one exists. Older captures stored only
            // the corrected image under `dataUrl`, so that is the fallback.
            dataUrl: await downscaleForModel(
              image.analysisDataUrl ?? image.dataUrl
            ),
          }))
      ),
      symptoms: {
        pain: profile.painPresent ?? false,
        numbness: profile.numbness ?? "not reported",
      },
      // Questionnaire answers the model uses to calibrate vigilance and
      // write the personal notes. The server formats these into the prompt.
      context: {
        age: profile.age,
        diabetes: profile.diabetes,
        numbness: profile.numbness,
        pad: profile.pad,
        priorEvents: profile.priorEvents,
        // Changes how bruising, bleeding and blunted infection signs should be
        // read, so it has to reach the prompt, not just the record.
        medications: profile.medications,
        smoking: profile.smoking,
        painPoints: profile.painPoints,
      },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "The photo check could not be completed.");
  }

  const screening = body as PhotoScreeningResult;
  if (!screening.capture_quality.usable) {
    throw new PhotoRetakeError(
      screening.capture_quality.retake.map(
        (item) => `${item.image}: ${item.reason}`
      )
    );
  }

  const ulcers = await measureUlcers(visit, profile, screening);

  return {
    visitId: visit.id,
    scoredAt: Date.now(),
    ulcers,
    riskLevel:
      screening.overall.level === "clear"
        ? "low"
        : screening.overall.level === "watch"
          ? "medium"
          : "high",
    riskFactors: screening.findings.map((finding) => finding.what_we_saw),
    detections: screening.findings
      .filter((finding) => finding.region)
      .map((finding) => findingToLegacyDetection(finding, ulcers)),
    volumetrics: [],
    trend: "first_scan",
    screening,
  };
}

/**
 * Build the overlay shape for one finding.
 *
 * The traced contour where segmentation produced one; the model's region as a
 * fallback. The bounding box is kept alongside either way, so the renderer
 * can fall back to a soft blob rather than a hard rectangle — see
 * ResultOverlay.
 */
function findingToLegacyDetection(
  finding: PhotoScreeningFinding,
  measurements: UlcerAnalysis[] = []
) {
  const region = finding.region!;
  const kind = classifyChange(finding.what_we_saw) ?? "dryness";
  // The legacy `type` vocabulary is narrower than ChangeKind; map onto it so
  // existing consumers keep working while the richer kind rides alongside.
  const type: "wound" | "redness" | "dryness" | "callus" =
    kind === "wound"
      ? "wound"
      : kind === "redness" || kind === "swelling"
        ? "redness"
        : kind === "callus" || kind === "nail"
          ? "callus"
          : "dryness";
  const measured = measurements.find(
    (analysis) =>
      analysis.side === finding.foot && analysis.view === finding.surface
  );
  const contour = measured?.measurement.contour ?? null;
  return {
    type,
    side: finding.foot,
    view: finding.surface,
    kind,
    contour,
    // The box stays as the fallback shape. It is no longer DRAWN as a
    // rectangle — the renderer inscribes a soft blob in it instead.
    polygon: [
      [region.x, region.y],
      [region.x + region.w, region.y],
      [region.x + region.w, region.y + region.h],
      [region.x, region.y + region.h],
    ] as [number, number][],
    lengthMm: measured?.measurement.maxLengthMm ?? null,
    widthMm: measured?.measurement.maxWidthMm ?? null,
    areaMm2: measured?.measurement.areaMm2 ?? null,
    lengthPx: measured?.measurement.maxLengthPx ?? 0,
    widthPx: measured?.measurement.maxWidthPx ?? 0,
    scaleReliable: measured?.measurement.scaleReliable ?? false,
    confidence:
      finding.concern === "high" ? 0.9 : finding.concern === "medium" ? 0.75 : 0.6,
  };
}
