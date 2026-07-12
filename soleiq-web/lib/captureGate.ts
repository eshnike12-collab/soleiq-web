/**
 * Pre-flight check that gates the AI analysis pipeline.
 * Returns either { ok: true } meaning safe to analyze, or { ok: false, ... }
 * with a list of reasons that should be surfaced to the clinician.
 */

import type { Visit } from "./types";

export interface CaptureGateResult {
  ok: boolean;
  issues: string[];
  /** Which capture(s) failed — for the retry UI to highlight. */
  failedImages: number;
  failedMeshes: number;
  meanImageConfidence: number;
  meanMeshConfidence: number;
}

const REQUIRED = [
  ["right", "top"],
  ["right", "sole"],
  ["left", "top"],
  ["left", "sole"],
] as const;

export function evaluateVisitForAnalysis(visit: Visit | null): CaptureGateResult {
  const issues: string[] = [];

  if (!visit) {
    return {
      ok: false,
      issues: ["No visit started — cannot analyze."],
      failedImages: 0,
      failedMeshes: 0,
      meanImageConfidence: 0,
      meanMeshConfidence: 0,
    };
  }

  const images = visit.images.filter(
    (image) => image.view === "top" || image.view === "sole"
  );

  for (const [side, view] of REQUIRED) {
    const image = images.find((item) => item.side === side && item.view === view);
    if (!image) {
      issues.push(`Missing ${side} foot ${view} photo.`);
    } else if (!image.quality?.passed) {
      issues.push(
        image.quality?.issues[0] ??
          `The ${side} foot ${view} photo did not pass the quality check.`
      );
    }
  }

  let failedImages = 0;
  let imageConfSum = 0;
  let imageConfN = 0;
  for (const img of images) {
    const d = img.detection;
    if (!img.quality?.passed) {
      failedImages++;
    }
    if (img.quality) {
      imageConfSum += img.quality.passed ? 1 : 0;
      imageConfN++;
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    failedImages,
    failedMeshes: 0,
    meanImageConfidence: imageConfN ? imageConfSum / imageConfN : 0,
    meanMeshConfidence: 0,
  };
}
