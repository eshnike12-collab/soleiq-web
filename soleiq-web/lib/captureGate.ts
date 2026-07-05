/**
 * Pre-flight check that gates the AI analysis pipeline.
 * Returns either { ok: true } meaning safe to analyze, or { ok: false, ... }
 * with a list of reasons that should be surfaced to the clinician.
 */

import { ANALYSIS_THRESHOLD } from "./footDetection";
import type { Visit } from "./types";

export interface CaptureGateResult {
  ok: boolean;
  issues: string[];
  /** Which capture(s) failed — for the retry UI to highlight. */
  failedImages: number;
  meanImageConfidence: number;
}

const REQUIRED_IMAGES = 8; // 4 views × 2 feet

export function evaluateVisitForAnalysis(visit: Visit | null): CaptureGateResult {
  const issues: string[] = [];

  if (!visit) {
    return {
      ok: false,
      issues: ["No visit started — cannot analyze."],
      failedImages: 0,
      meanImageConfidence: 0,
    };
  }

  const images = visit.images;

  if (images.length < REQUIRED_IMAGES) {
    issues.push(
      `Only ${images.length} of ${REQUIRED_IMAGES} foot images captured.`
    );
  }

  let failedImages = 0;
  let imageConfSum = 0;
  let imageConfN = 0;
  for (const img of images) {
    const d = img.detection;
    if (!d || !d.detected || d.confidence < ANALYSIS_THRESHOLD) {
      failedImages++;
    }
    if (d) {
      imageConfSum += d.confidence;
      imageConfN++;
    }
  }
  if (failedImages > 0) {
    issues.push(
      `${failedImages} image${failedImages === 1 ? "" : "s"} did not pass foot detection (confidence < ${(ANALYSIS_THRESHOLD * 100).toFixed(0)}%).`
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    failedImages,
    meanImageConfidence: imageConfN ? imageConfSum / imageConfN : 0,
  };
}
