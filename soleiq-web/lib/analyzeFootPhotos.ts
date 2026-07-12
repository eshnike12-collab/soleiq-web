"use client";

import { evaluateVisitForAnalysis } from "./captureGate";
import type {
  AnalysisResult,
  PatientProfile,
  PhotoScreeningFinding,
  PhotoScreeningResult,
  Visit,
} from "./types";

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

  return {
    visitId: visit.id,
    scoredAt: Date.now(),
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
