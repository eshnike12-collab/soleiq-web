/**
 * POS — plane-orthogonal-to-skin rPPG (Wang et al., "Algorithmic Principles of
 * Remote PPG", IEEE TBME 2017).
 *
 * Two jobs here:
 *
 * 1. It is the estimator that actually ships. MetaPhys' contribution is the
 *    adaptation scheme, not a released checkpoint — the repo has no weights —
 *    so TS-CAN cannot run until someone supplies one. POS needs no weights and
 *    runs on any phone.
 * 2. It is the pseudo-label source for unsupervised personalisation. MetaPhys'
 *    `--unsupervised` mode swaps its ground-truth PPG for labels produced by a
 *    signal-processing baseline; this is that baseline.
 *
 * Output is deliberately returned in the *derivative* domain, because that is
 * what TS-CAN predicts and what `postprocess.ts` integrates. One estimator can
 * then be swapped for the other behind an unchanged post-processing path.
 */

import { mean, standardDeviation } from "./dsp";

export interface RgbTraces {
  r: Float64Array;
  g: Float64Array;
  b: Float64Array;
}

/**
 * The projection plane. POS fixes these; personalisation is allowed to move
 * them, which is how a per-person skin tone and lighting mix gets absorbed.
 */
export interface PosParams {
  /** Primary projection, POS default [0, 1, −1]. */
  p1: [number, number, number];
  /** Secondary projection, POS default [−2, 1, 1]. */
  p2: [number, number, number];
}

export const DEFAULT_POS_PARAMS: PosParams = {
  p1: [0, 1, -1],
  p2: [-2, 1, 1],
};

export function clonePosParams(params: PosParams): PosParams {
  return { p1: [...params.p1], p2: [...params.p2] };
}

/** POS window length: 1.6 seconds, per the paper. */
export function posWindowLength(sampleRateHz: number): number {
  return Math.max(Math.round(1.6 * sampleRateHz), 8);
}

/**
 * POS pulse waveform via overlap-add over 1.6 s windows.
 *
 * Within each window every channel is divided by its own temporal mean, the
 * two projections are taken, and the second is scaled so its variance matches
 * the first (the "alpha tuning" step) before they are summed.
 */
export function posPulse(
  traces: RgbTraces,
  sampleRateHz: number,
  params: PosParams = DEFAULT_POS_PARAMS
): Float64Array {
  const n = traces.r.length;
  const out = new Float64Array(n);
  if (n === 0) return out;
  const l = Math.min(posWindowLength(sampleRateHz), n);

  const normalised = new Float64Array(3 * l);
  const s1 = new Float64Array(l);
  const s2 = new Float64Array(l);

  for (let end = l; end <= n; end++) {
    const start = end - l;
    const channels: Float64Array[] = [traces.r, traces.g, traces.b];
    for (let c = 0; c < 3; c++) {
      const channel = channels[c];
      let total = 0;
      for (let i = start; i < end; i++) total += channel[i];
      const mu = total / l || 1e-9;
      for (let i = 0; i < l; i++) normalised[c * l + i] = channel[start + i] / mu;
    }
    for (let i = 0; i < l; i++) {
      const r = normalised[i];
      const g = normalised[l + i];
      const b = normalised[2 * l + i];
      s1[i] = params.p1[0] * r + params.p1[1] * g + params.p1[2] * b;
      s2[i] = params.p2[0] * r + params.p2[1] * g + params.p2[2] * b;
    }
    const sd2 = standardDeviation(s2);
    const alpha = sd2 > 1e-9 ? standardDeviation(s1) / sd2 : 0;
    const combined = new Float64Array(l);
    for (let i = 0; i < l; i++) combined[i] = s1[i] + alpha * s2[i];
    const mu = mean(combined);
    // Overlap-add the mean-removed window.
    for (let i = 0; i < l; i++) out[start + i] += combined[i] - mu;
  }
  return out;
}

/** First difference, so `postprocess.ts` can integrate it back. */
export function toDerivative(waveform: ArrayLike<number>): Float64Array {
  const out = new Float64Array(waveform.length);
  for (let i = 1; i < waveform.length; i++) out[i] = waveform[i] - waveform[i - 1];
  if (waveform.length > 1) out[0] = out[1];
  return out;
}

/**
 * POS prediction in the same output domain as TS-CAN: one pulse-derivative
 * sample per frame.
 */
export function posPrediction(
  traces: RgbTraces,
  sampleRateHz: number,
  params: PosParams = DEFAULT_POS_PARAMS
): Float64Array {
  return toDerivative(posPulse(traces, sampleRateHz, params));
}
