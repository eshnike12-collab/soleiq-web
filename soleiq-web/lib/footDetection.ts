/**
 * Real-time foot detection on a live video frame.
 *
 * Computes four signals from the current frame:
 *   - brightness — mean luminance (rejects too-dark / too-bright frames)
 *   - blur       — variance of Laplacian (rejects out-of-focus frames)
 *   - silhouette — Otsu-thresholded foreground pixels inside the foot oval
 *   - geometry   — bounding-box aspect ratio and centeredness of the silhouette
 *
 * Each signal contributes a 0..1 sub-score; overall confidence is the min
 * (worst-link-in-chain). A frame is `detected` only if the silhouette is
 * plausibly foot-sized AND confidence ≥ DETECTION_THRESHOLD.
 *
 * No placeholder / fallback is produced when detection fails — the consumer
 * (CaptureFrame, ScanAnimation, Processing) is responsible for refusing to
 * advance the flow.
 */

const ANALYSIS_W = 96;
const ANALYSIS_H = 120;

/** Minimum confidence to accept a frame as a real foot capture. */
export const DETECTION_THRESHOLD = 0.55;

/** Minimum confidence required across the whole scan to permit analysis. */
export const ANALYSIS_THRESHOLD = 0.5;

export type FailureReason =
  | "no_foot"
  | "foot_partial"
  | "off_center"
  | "too_dark"
  | "too_bright"
  | "too_blurry"
  | "not_foot_shape"
  | "face_detected";

export const REASON_LABEL: Record<FailureReason, string> = {
  no_foot: "No foot detected in frame",
  foot_partial: "Only part of the foot is visible",
  off_center: "Foot is not centered in the frame",
  too_dark: "Image is too dark",
  too_bright: "Image is too bright / overexposed",
  too_blurry: "Image is out of focus",
  not_foot_shape: "Detected shape doesn't look like a foot",
  face_detected: "Face detected — point the camera at the patient's foot",
};

export interface QualitySignals {
  alignment: boolean; // centered enough
  distance: boolean;  // silhouette in expected size band
  blur: boolean;      // sharp enough
  lighting: boolean;  // brightness in range
  shadow: boolean;    // global brightness variance low
  occlusion: boolean; // foot region not occluded (large enough silhouette)
}

export interface DetectionMetrics {
  detected: boolean;
  confidence: number; // 0..1
  silhouettePx: number;
  brightness: number;
  blur: number;
  centerOffset: number;
  aspectRatio: number;
  reasons: FailureReason[];
  quality: QualitySignals;
}

export function detectFootInVideo(
  video: HTMLVideoElement
): DetectionMetrics | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = ANALYSIS_W;
  canvas.height = ANALYSIS_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, ANALYSIS_W, ANALYSIS_H);
  const img = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H);

  // Grayscale + brightness.
  const gray = new Uint8Array(ANALYSIS_W * ANALYSIS_H);
  let lumSum = 0;
  let lumSumSq = 0;
  for (let i = 0; i < gray.length; i++) {
    const r = img.data[i * 4];
    const g = img.data[i * 4 + 1];
    const b = img.data[i * 4 + 2];
    const v = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    gray[i] = v;
    lumSum += v;
    lumSumSq += v * v;
  }
  const brightness = lumSum / gray.length;
  const lumVar = lumSumSq / gray.length - brightness * brightness;
  const lumStdDev = Math.sqrt(Math.max(0, lumVar));

  // Variance of Laplacian as a blur proxy.
  let lapSum = 0;
  let lapSumSq = 0;
  let lapCount = 0;
  for (let y = 1; y < ANALYSIS_H - 1; y++) {
    for (let x = 1; x < ANALYSIS_W - 1; x++) {
      const i = y * ANALYSIS_W + x;
      const lap =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - ANALYSIS_W] +
        gray[i + ANALYSIS_W];
      lapSum += lap;
      lapSumSq += lap * lap;
      lapCount++;
    }
  }
  const lapMean = lapSum / lapCount;
  const blur = lapSumSq / lapCount - lapMean * lapMean;

  // Otsu threshold for foot vs background.
  const t = otsu(gray);
  const m1 = new Uint8Array(gray.length);
  const m2 = new Uint8Array(gray.length);
  let c1 = 0;
  let c2 = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < t) {
      m1[i] = 1;
      c1++;
    } else {
      m2[i] = 1;
      c2++;
    }
  }
  // Foot is usually the smaller class (more compact / darker against floor).
  const mask = c1 <= c2 ? m1 : m2;

  // Constrain to central ellipse (matches the on-screen foot outline).
  const cx = ANALYSIS_W / 2;
  const cy = ANALYSIS_H / 2;
  const rx = ANALYSIS_W * 0.4;
  const ry = ANALYSIS_H * 0.45;
  let silhouettePx = 0;
  let xMin = ANALYSIS_W;
  let xMax = 0;
  let yMin = ANALYSIS_H;
  let yMax = 0;
  let xSum = 0;
  let ySum = 0;
  for (let y = 0; y < ANALYSIS_H; y++) {
    for (let x = 0; x < ANALYSIS_W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const idx = y * ANALYSIS_W + x;
      if (dx * dx + dy * dy > 1) {
        mask[idx] = 0;
        continue;
      }
      if (mask[idx]) {
        silhouettePx++;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
        xSum += x;
        ySum += y;
      }
    }
  }

  let centerOffset = 1;
  let aspectRatio = 0;
  if (silhouettePx > 0) {
    const sx = xSum / silhouettePx;
    const sy = ySum / silhouettePx;
    centerOffset = Math.hypot(
      (sx - cx) / (ANALYSIS_W / 2),
      (sy - cy) / (ANALYSIS_H / 2)
    );
    const bw = Math.max(1, xMax - xMin);
    const bh = Math.max(1, yMax - yMin);
    aspectRatio = bh / bw;
  }

  // Sub-scores: each in [0, 1].
  const sBrightness = rampInside(brightness, 60, 200, 30, 240);
  const sBlur = rampUp(blur, 150, 50);
  const sSilhouette = rampUp(silhouettePx, 3500, 800);
  const sCenter = rampDown(centerOffset, 0.2, 0.65);
  const sAspect = rampInside(aspectRatio, 1.2, 3.5, 0.8, 4.5);
  const sShadow = rampInside(lumStdDev, 25, 80, 12, 110);

  const reasons: FailureReason[] = [];
  if (silhouettePx < 800) reasons.push("no_foot");
  else if (silhouettePx < 3000) reasons.push("foot_partial");
  if (brightness < 50) reasons.push("too_dark");
  else if (brightness > 220) reasons.push("too_bright");
  if (blur < 70) reasons.push("too_blurry");
  if (centerOffset > 0.55 && silhouettePx >= 800) reasons.push("off_center");
  // Foot silhouettes are elongated (sole/top ~2-3:1, heel ~1.5:1). Faces are
  // close to square (~1:1 to 1.3:1) — reject anything not elongated enough.
  if (
    silhouettePx >= 1500 &&
    aspectRatio > 0 &&
    (aspectRatio < 1.4 || aspectRatio > 4.8)
  )
    reasons.push("not_foot_shape");

  const confidence = Math.min(
    sBrightness,
    sBlur,
    sSilhouette,
    sCenter,
    sAspect
  );

  const quality: QualitySignals = {
    alignment: sCenter > 0.6,
    distance: sSilhouette > 0.5,
    blur: sBlur > 0.5,
    lighting: sBrightness > 0.6,
    shadow: sShadow > 0.4,
    occlusion: silhouettePx > 1500,
  };

  const detected =
    silhouettePx >= 800 &&
    confidence >= DETECTION_THRESHOLD &&
    !reasons.includes("no_foot");

  return {
    detected,
    confidence,
    silhouettePx,
    brightness,
    blur,
    centerOffset,
    aspectRatio,
    reasons,
    quality,
  };
}

// ---------- Scoring helpers ----------------------------------------------

function rampInside(v: number, lo: number, hi: number, min: number, max: number) {
  if (v >= lo && v <= hi) return 1;
  if (v < min || v > max) return 0;
  if (v < lo) return (v - min) / (lo - min);
  return (max - v) / (max - hi);
}
function rampUp(v: number, hi: number, lo: number) {
  if (v >= hi) return 1;
  if (v <= lo) return 0;
  return (v - lo) / (hi - lo);
}
function rampDown(v: number, lo: number, hi: number) {
  if (v <= lo) return 1;
  if (v >= hi) return 0;
  return (hi - v) / (hi - lo);
}

function otsu(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) {
      max = between;
      threshold = i;
    }
  }
  return threshold;
}

/** Summarize a single reason for display. */
export function summarizeReasons(reasons: FailureReason[]): string {
  if (reasons.length === 0) return "No foot detected in frame.";
  // Prioritize the most actionable reason.
  const priority: FailureReason[] = [
    "no_foot",
    "foot_partial",
    "too_dark",
    "too_bright",
    "too_blurry",
    "off_center",
    "not_foot_shape",
  ];
  for (const r of priority) {
    if (reasons.includes(r)) return REASON_LABEL[r];
  }
  return REASON_LABEL[reasons[0]];
}
