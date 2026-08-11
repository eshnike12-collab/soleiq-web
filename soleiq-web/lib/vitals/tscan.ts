/**
 * TS-CAN — the network MetaPhys meta-trains, transcribed from
 * `higher_model.py` (Temporal Shift Convolutional Attention Network, Liu et
 * al., NeurIPS 2020).
 *
 * The repository ships architecture and training code but no checkpoint, so
 * nothing here can produce a pulse on its own. Two things are provided:
 *
 * - `TSCAN_CONFIG`, the exact layer geometry, so a checkpoint converted to
 *   ONNX/TFLite can be checked against what the preprocessing in
 *   `preprocess.ts` produces.
 * - `temporalShift` and `attentionMask`, faithful ports of the two custom
 *   layers, for a backend that has convolutions but not these.
 *
 * A runtime is *injected* rather than imported: this app does not carry an
 * inference runtime, and adding a multi-megabyte one that can never run
 * without weights would be dead weight. Register a backend and
 * `lib/vitals/index.ts` prefers it over the POS fallback automatically.
 */

import type { TscanInput } from "./preprocess";

/** Layer geometry from higher_model.py:TSCAN.__init__. */
export const TSCAN_CONFIG = {
  inChannels: 3,
  nbFilters1: 32,
  nbFilters2: 64,
  kernelSize: 3,
  dropoutRate1: 0.25,
  dropoutRate2: 0.5,
  poolSize: [2, 2] as const,
  nbDense: 128,
  /** Flattened size feeding final_dense_1 — 64 channels × 7 × 7. */
  flattenedSize: 3136,
  /** train_higher.py constructs the model with frame_depth=20. */
  frameDepth: 20,
  /** TSM channel fold — higher_model.py:TSM(fold_div=3). */
  foldDiv: 3,
} as const;

/**
 * Temporal Shift Module — higher_model.py:TSM.forward.
 *
 * Shifts the first 1/3 of channels one step back in time, the second 1/3 one
 * step forward, and leaves the rest alone, giving 2D convolutions a view of
 * neighbouring frames at zero parameter cost. Operates in place on a flat
 * [frames, channels, height, width] tensor.
 */
export function temporalShift(
  data: Float32Array,
  frames: number,
  channels: number,
  height: number,
  width: number,
  nSegment: number = TSCAN_CONFIG.frameDepth,
  foldDiv: number = TSCAN_CONFIG.foldDiv
): Float32Array {
  const plane = height * width;
  const perFrame = channels * plane;
  const fold = Math.floor(channels / foldDiv);
  const out = new Float32Array(data.length);
  const batches = Math.floor(frames / nSegment);

  for (let batch = 0; batch < batches; batch++) {
    for (let t = 0; t < nSegment; t++) {
      const frame = batch * nSegment + t;
      for (let c = 0; c < channels; c++) {
        // Channels [0, fold) read from t+1; [fold, 2·fold) read from t−1;
        // the remainder is copied. Out-of-range reads stay zero, matching
        // the reference's zeros_like initialisation.
        let sourceT = t;
        if (c < fold) sourceT = t + 1;
        else if (c < 2 * fold) sourceT = t - 1;
        if (sourceT < 0 || sourceT >= nSegment) continue;
        const sourceFrame = batch * nSegment + sourceT;
        const from = sourceFrame * perFrame + c * plane;
        const to = frame * perFrame + c * plane;
        out.set(data.subarray(from, from + plane), to);
      }
    }
  }
  // Frames beyond the last complete segment are passed through untouched.
  const covered = batches * nSegment * perFrame;
  if (covered < data.length) out.set(data.subarray(covered), covered);
  return out;
}

/**
 * Softmax-style spatial attention — higher_model.py:Attention_mask.forward:
 * `x / sum(x) * H * W * 0.5`. Normalises each frame's mask so its mean is 0.5,
 * keeping the gating scale independent of ROI size.
 */
export function attentionMask(
  x: Float32Array,
  frames: number,
  height: number,
  width: number
): Float32Array {
  const plane = height * width;
  const out = new Float32Array(x.length);
  for (let f = 0; f < frames; f++) {
    const base = f * plane;
    let total = 0;
    for (let i = 0; i < plane; i++) total += x[base + i];
    const scale = total > 1e-9 ? (plane * 0.5) / total : 0;
    for (let i = 0; i < plane; i++) out[base + i] = x[base + i] * scale;
  }
  return out;
}

/**
 * Inference runtime for a TS-CAN checkpoint. `predict` receives the 6-channel
 * tensor from `buildTscanInput` and returns one pulse-derivative sample per
 * frame — the same domain the POS fallback and `postprocess.ts` use.
 */
export interface TscanBackend {
  name: string;
  predict(input: TscanInput): Promise<Float64Array>;
}

let backend: TscanBackend | null = null;

/**
 * Install a TS-CAN runtime (e.g. onnxruntime-web with a converted MetaPhys
 * checkpoint). Pass null to remove it and fall back to POS.
 */
export function registerTscanBackend(next: TscanBackend | null): void {
  backend = next;
}

export function getTscanBackend(): TscanBackend | null {
  return backend;
}

export function isTscanAvailable(): boolean {
  return backend !== null;
}
