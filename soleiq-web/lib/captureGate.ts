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
  failedMeshes: number;
  meanImageConfidence: number;
  meanMeshConfidence: number;
}

const REQUIRED_IMAGES = 8; // 4 views × 2 feet
const REQUIRED_MESHES = 2; // left + right

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

  const images = visit.images;
  const meshes = visit.meshes;

  if (images.length < REQUIRED_IMAGES) {
    issues.push(
      `Only ${images.length} of ${REQUIRED_IMAGES} foot images captured.`
    );
  }
  if (meshes.length < REQUIRED_MESHES) {
    issues.push(
      `Only ${meshes.length} of ${REQUIRED_MESHES} foot meshes captured.`
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

  let failedMeshes = 0;
  let meshConfSum = 0;
  let meshConfN = 0;
  for (const m of meshes) {
    const d = m.detection;
    const hasMesh = !!m.heightmap;
    if (!hasMesh || !d || !d.detected || d.confidence < ANALYSIS_THRESHOLD) {
      failedMeshes++;
    }
    if (d) {
      meshConfSum += d.confidence;
      meshConfN++;
    }
  }
  if (failedMeshes > 0) {
    issues.push(
      `${failedMeshes} 3D scan${failedMeshes === 1 ? "" : "s"} produced no usable foot mesh.`
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    failedImages,
    failedMeshes,
    meanImageConfidence: imageConfN ? imageConfSum / imageConfN : 0,
    meanMeshConfidence: meshConfN ? meshConfSum / meshConfN : 0,
  };
}
