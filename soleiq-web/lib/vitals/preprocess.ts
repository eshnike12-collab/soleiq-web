/**
 * Frame preprocessing for MetaPhys / TS-CAN.
 *
 * Mirrors the pipeline the released checkpoints were trained on: crop the face
 * ROI, resize to 36×36, build a *motion* branch of normalised frame
 * differences and an *appearance* branch of standardised raw frames, then
 * concatenate them into the 6-channel input `higher_model.py` splits back
 * apart as `inputs[:, :3]` and `inputs[:, 3:]`.
 *
 * `rppg_dataset.py` additionally averages the appearance branch within each
 * `frame_depth` chunk and repeats it across the chunk — the appearance path is
 * meant to carry a stable skin map, not per-frame texture — which
 * `buildTscanInput` reproduces.
 */

/** TS-CAN input resolution. */
export const ROI_SIZE = 36;
/** Channels per branch (RGB). */
export const CHANNELS = 3;
/** Samples per temporal-shift segment — train_higher.py passes frame_depth=20. */
export const DEFAULT_FRAME_DEPTH = 20;

const FRAME_LENGTH = ROI_SIZE * ROI_SIZE * CHANNELS;

/**
 * A single preprocessed frame: 36×36 RGB in [0, 1], channel-first (CHW) to
 * match the PyTorch model's expected layout.
 */
export type RoiFrame = Float32Array;

/**
 * Convert raw RGBA pixels of a 36×36 crop into a normalised CHW frame.
 * `pixels` is what `CanvasRenderingContext2D.getImageData` returns.
 */
export function frameFromImageData(pixels: Uint8ClampedArray): RoiFrame {
  const frame = new Float32Array(FRAME_LENGTH);
  const plane = ROI_SIZE * ROI_SIZE;
  for (let i = 0; i < plane; i++) {
    frame[i] = pixels[i * 4] / 255;
    frame[plane + i] = pixels[i * 4 + 1] / 255;
    frame[2 * plane + i] = pixels[i * 4 + 2] / 255;
  }
  return frame;
}

/**
 * Spatial mean of each channel — the only thing the POS estimator needs, so
 * live capture can keep three numbers per frame instead of a video buffer.
 */
export function frameMeanRgb(frame: RoiFrame): [number, number, number] {
  const plane = ROI_SIZE * ROI_SIZE;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < plane; i++) {
    r += frame[i];
    g += frame[plane + i];
    b += frame[2 * plane + i];
  }
  return [r / plane, g / plane, b / plane];
}

function standardDeviationOf(values: Float32Array): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  const mu = total / values.length;
  let acc = 0;
  for (let i = 0; i < values.length; i++) acc += (values[i] - mu) ** 2;
  return Math.sqrt(acc / values.length);
}

export interface TscanInput {
  /** Flat [frames, 6, 36, 36] tensor, frames = source frames − 1. */
  data: Float32Array;
  frames: number;
  channels: number;
  height: number;
  width: number;
}

/**
 * Build the 6-channel TS-CAN input from consecutive ROI frames.
 *
 * Motion channels: (I[t+1] − I[t]) / (I[t+1] + I[t]), divided by the standard
 * deviation of the whole difference volume. Appearance channels: raw frames
 * standardised to zero mean and unit variance, then chunk-averaged over
 * `frameDepth`.
 */
export function buildTscanInput(
  frames: RoiFrame[],
  frameDepth: number = DEFAULT_FRAME_DEPTH
): TscanInput {
  const count = Math.max(frames.length - 1, 0);
  const perFrame = 2 * FRAME_LENGTH;
  const data = new Float32Array(count * perFrame);
  if (count === 0) {
    return { data, frames: 0, channels: 6, height: ROI_SIZE, width: ROI_SIZE };
  }

  // --- Motion branch: normalised differences -------------------------------
  const motion = new Float32Array(count * FRAME_LENGTH);
  for (let t = 0; t < count; t++) {
    const current = frames[t];
    const next = frames[t + 1];
    const base = t * FRAME_LENGTH;
    for (let i = 0; i < FRAME_LENGTH; i++) {
      const sum = next[i] + current[i];
      // Guard the division: a black pixel has no meaningful ratio.
      motion[base + i] = sum > 1e-6 ? (next[i] - current[i]) / sum : 0;
    }
  }
  const motionStd = standardDeviationOf(motion) || 1;
  for (let i = 0; i < motion.length; i++) motion[i] /= motionStd;

  // --- Appearance branch: standardised raw frames --------------------------
  const appearance = new Float32Array(count * FRAME_LENGTH);
  for (let t = 0; t < count; t++) {
    appearance.set(frames[t], t * FRAME_LENGTH);
  }
  let total = 0;
  for (let i = 0; i < appearance.length; i++) total += appearance[i];
  const appearanceMean = total / appearance.length;
  for (let i = 0; i < appearance.length; i++) appearance[i] -= appearanceMean;
  const appearanceStd = standardDeviationOf(appearance) || 1;
  for (let i = 0; i < appearance.length; i++) appearance[i] /= appearanceStd;

  // Average appearance within each frame_depth chunk and hold it constant
  // across the chunk (rppg_dataset.py reshape → average → repeat).
  const depth = Math.max(1, Math.min(frameDepth, count));
  for (let chunkStart = 0; chunkStart < count; chunkStart += depth) {
    const chunkEnd = Math.min(chunkStart + depth, count);
    const chunkLength = chunkEnd - chunkStart;
    const averaged = new Float32Array(FRAME_LENGTH);
    for (let t = chunkStart; t < chunkEnd; t++) {
      const base = t * FRAME_LENGTH;
      for (let i = 0; i < FRAME_LENGTH; i++) averaged[i] += appearance[base + i];
    }
    for (let i = 0; i < FRAME_LENGTH; i++) averaged[i] /= chunkLength;
    for (let t = chunkStart; t < chunkEnd; t++) {
      appearance.set(averaged, t * FRAME_LENGTH);
    }
  }

  // --- Interleave into [frames, 6, 36, 36] ---------------------------------
  for (let t = 0; t < count; t++) {
    data.set(motion.subarray(t * FRAME_LENGTH, (t + 1) * FRAME_LENGTH), t * perFrame);
    data.set(
      appearance.subarray(t * FRAME_LENGTH, (t + 1) * FRAME_LENGTH),
      t * perFrame + FRAME_LENGTH
    );
  }

  return { data, frames: count, channels: 6, height: ROI_SIZE, width: ROI_SIZE };
}

/**
 * Per-frame mean RGB traces for the whole clip, as three channel-major
 * arrays — the input the POS estimator and the personalisation layer consume.
 */
export function rgbTraces(frames: RoiFrame[]): {
  r: Float64Array;
  g: Float64Array;
  b: Float64Array;
} {
  const r = new Float64Array(frames.length);
  const g = new Float64Array(frames.length);
  const b = new Float64Array(frames.length);
  frames.forEach((frame, index) => {
    const [fr, fg, fb] = frameMeanRgb(frame);
    r[index] = fr;
    g[index] = fg;
    b[index] = fb;
  });
  return { r, g, b };
}
