"use client";

import { evaluateVisitForAnalysis } from "./captureGate";
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

/** Findings worth putting a ruler to. */
const WOUND_LIKE =
  /wound|ulcer|open|sore|blister|erosion|breakdown|dark tissue|black tissue|necro|slough|crater/i;

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
    if (!finding.region || !WOUND_LIKE.test(finding.what_we_saw)) continue;
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
      images: visit.images
        .filter((image) => image.view === "top" || image.view === "sole")
        .map((image) => ({
          side: image.side,
          surface: image.view,
          dataUrl: image.dataUrl,
        })),
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
      .map(findingToLegacyDetection),
    volumetrics: [],
    trend: "first_scan",
    screening,
  };
}

function findingToLegacyDetection(finding: PhotoScreeningFinding) {
  const region = finding.region!;
  const text = finding.what_we_saw.toLowerCase();
  const type = /wound|ulcer|open/.test(text)
    ? ("wound" as const)
    : /red/.test(text)
      ? ("redness" as const)
      : /callus/.test(text)
        ? ("callus" as const)
        : ("dryness" as const);
  return {
    type,
    side: finding.foot,
    view: finding.surface,
    polygon: [
      [region.x, region.y],
      [region.x + region.w, region.y],
      [region.x + region.w, region.y + region.h],
      [region.x, region.y + region.h],
    ] as [number, number][],
    confidence:
      finding.concern === "high" ? 0.9 : finding.concern === "medium" ? 0.75 : 0.6,
  };
}
