/**
 * MetaPhys personalisation — the part of the paper that actually matters.
 *
 * MetaPhys (ACM CHIL 2021) trains rPPG models with MAML so that a *new person*
 * can be fitted from roughly 18 seconds of their own video: an inner loop takes
 * a small number of gradient steps on that person's support set, an outer loop
 * trains the initialisation those steps start from. `train_higher.py` runs the
 * inner loop through `higher.innerloop_ctx` with `--num-adapt-steps` SGD steps
 * at `--inner-step-size`, computing MSE on a support split and evaluating on a
 * held-out query split; `--unsupervised` swaps the contact-PPG labels for ones
 * produced by signal processing.
 *
 * What is reproduced here is test-time adaptation — the half a deployed app
 * needs — with the repo's structure kept intact: support/query split, MSE
 * objective, inner-loop SGD at the repo's step size, unsupervised pseudo-labels.
 * The outer loop (meta-training the initialisation across subjects) is a
 * training-time, GPU-side concern and is not run in the browser; the shipped
 * initialisation is the POS projection plane.
 *
 * What is adapted are the projection weights of the estimator in `pos.ts`,
 * which is exactly the per-person nuisance MetaPhys targets: the mixture of
 * skin tone and illumination that decides how the pulse projects onto RGB.
 * When a TS-CAN checkpoint is supplied, the same loop applies to its final
 * dense layer instead — see `tscan.ts`.
 */

import {
  butterBandpass,
  cumulativeSum,
  detrend,
  filtfilt,
  mean,
  periodogramBand,
  standardDeviation,
} from "./dsp";
import {
  DEFAULT_POS_PARAMS,
  type PosParams,
  type RgbTraces,
  clonePosParams,
  posPulse,
} from "./pos";
import {
  DETREND_LAMBDA,
  PULSE_BAND_HIGH_HZ,
  PULSE_BAND_LOW_HZ,
  estimatePulse,
} from "./postprocess";

/** train_higher.py `--inner-step-size`. */
export const DEFAULT_INNER_STEP_SIZE = 0.1;
/**
 * train_higher.py `--num-adapt-steps` is 1, which is the right number when the
 * inner loop updates every weight of a meta-trained network. Adapting six
 * projection coefficients from a generic initialisation is a much smaller
 * problem, so a few more steps are both cheap and useful.
 */
export const DEFAULT_INNER_STEPS = 8;
/** train_higher.py `--num-shots` — support clips per subject. */
export const DEFAULT_NUM_SHOTS = 6;
/** ~18 s at 30 fps is the calibration budget the paper reports. */
export const CALIBRATION_SECONDS = 18;

export interface PersonalizationProfile {
  version: 1;
  params: PosParams;
  /** Held-out SNR before adaptation, dB. */
  baselineSnrDb: number;
  /** Held-out SNR after adaptation, dB. */
  adaptedSnrDb: number;
  innerSteps: number;
  innerStepSize: number;
  supportWindows: number;
  queryWindows: number;
  sampleRateHz: number;
  createdAt: number;
}

export interface AdaptOptions {
  sampleRateHz?: number;
  /** Frames per shot. Defaults to ~3 s, so 18 s yields 6 shots. */
  shotSize?: number;
  innerSteps?: number;
  innerStepSize?: number;
  now?: number;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

function sliceTraces(traces: RgbTraces, start: number, end: number): RgbTraces {
  return {
    r: traces.r.slice(start, end),
    g: traces.g.slice(start, end),
    b: traces.b.slice(start, end),
  };
}

/** Zero mean, unit variance — makes the MSE loss independent of gain. */
function zScore(x: ArrayLike<number>): Float64Array {
  const mu = mean(x);
  const sd = standardDeviation(x) || 1;
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] - mu) / sd;
  return out;
}

/** Detrend + bandpass, the same conditioning `postprocess.ts` applies. */
function conditioned(waveform: ArrayLike<number>, fs: number): Float64Array {
  const filter = butterBandpass(PULSE_BAND_LOW_HZ, PULSE_BAND_HIGH_HZ, fs);
  return filtfilt(filter, detrend(waveform, DETREND_LAMBDA));
}

/**
 * Pseudo-label for one support window.
 *
 * The raw POS output is not a useful target — fitting it exactly would just
 * reproduce POS. Instead the label is POS projected onto its own dominant
 * cardiac frequency and second harmonic by least squares: same beat, same
 * phase, without the broadband noise. Fitting *that* is what gives the
 * adaptation something to gain.
 */
function pseudoLabel(traces: RgbTraces, fs: number): Float64Array | null {
  const raw = conditioned(posPulse(traces, fs, DEFAULT_POS_PARAMS), fs);
  const n = raw.length;
  if (n < fs) return null;
  const nfft = 4 * n;
  const { freqs, pxx } = periodogramBand(
    raw,
    fs,
    nfft,
    PULSE_BAND_LOW_HZ,
    PULSE_BAND_HIGH_HZ
  );
  if (freqs.length === 0) return null;
  let peak = 0;
  for (let i = 1; i < pxx.length; i++) if (pxx[i] > pxx[peak]) peak = i;
  const f0 = freqs[peak];

  // Least-squares fit of cos/sin at f0 and 2·f0 (orthogonal basis over a long
  // enough window, so plain projection is the solution).
  const label = new Float64Array(n);
  for (const harmonic of [1, 2]) {
    const omega = (2 * Math.PI * f0 * harmonic) / fs;
    let cosAcc = 0;
    let sinAcc = 0;
    let cosNorm = 0;
    let sinNorm = 0;
    for (let t = 0; t < n; t++) {
      const c = Math.cos(omega * t);
      const s = Math.sin(omega * t);
      cosAcc += raw[t] * c;
      sinAcc += raw[t] * s;
      cosNorm += c * c;
      sinNorm += s * s;
    }
    const a = cosNorm > 1e-9 ? cosAcc / cosNorm : 0;
    const b = sinNorm > 1e-9 ? sinAcc / sinNorm : 0;
    for (let t = 0; t < n; t++) {
      label[t] += a * Math.cos(omega * t) + b * Math.sin(omega * t);
    }
  }
  return zScore(label);
}

/** Model output for one window under a candidate parameter set. */
function forward(traces: RgbTraces, fs: number, params: PosParams): Float64Array {
  return zScore(conditioned(posPulse(traces, fs, params), fs));
}

function meanSquaredError(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (a[i] - b[i]) ** 2;
  return acc / n;
}

interface Shot {
  traces: RgbTraces;
  label: Float64Array;
}

function supportLoss(shots: Shot[], fs: number, params: PosParams): number {
  if (shots.length === 0) return Infinity;
  let total = 0;
  for (const shot of shots) {
    total += meanSquaredError(forward(shot.traces, fs, params), shot.label);
  }
  return total / shots.length;
}

const PARAM_KEYS: { key: keyof PosParams; index: number }[] = [
  { key: "p1", index: 0 },
  { key: "p1", index: 1 },
  { key: "p1", index: 2 },
  { key: "p2", index: 0 },
  { key: "p2", index: 1 },
  { key: "p2", index: 2 },
];

function readParam(params: PosParams, slot: { key: keyof PosParams; index: number }) {
  return params[slot.key][slot.index];
}

function writeParam(
  params: PosParams,
  slot: { key: keyof PosParams; index: number },
  value: number
) {
  params[slot.key][slot.index] = value;
}

/**
 * Keep the primary projection on the unit sphere. The loss is computed on
 * z-scored signals so it cannot see overall gain, which leaves the scale
 * direction unconstrained — without this the coefficients drift and the
 * alpha-tuning term degenerates.
 */
function normaliseParams(params: PosParams): void {
  const norm = Math.hypot(...params.p1);
  if (norm > 1e-6) {
    const target = Math.hypot(...DEFAULT_POS_PARAMS.p1);
    const scale = target / norm;
    params.p1 = params.p1.map((v) => v * scale) as [number, number, number];
  }
}

/**
 * One inner-loop step: MSE on the support set, plain SGD, gradients by central
 * differences. Six parameters make finite differences cheaper and far simpler
 * than carrying an autodiff graph into the browser.
 */
function innerStep(
  shots: Shot[],
  fs: number,
  params: PosParams,
  stepSize: number
): PosParams {
  const epsilon = 1e-3;
  const gradient = PARAM_KEYS.map((slot) => {
    const original = readParam(params, slot);
    const plus = clonePosParams(params);
    writeParam(plus, slot, original + epsilon);
    const minus = clonePosParams(params);
    writeParam(minus, slot, original - epsilon);
    return (
      (supportLoss(shots, fs, plus) - supportLoss(shots, fs, minus)) /
      (2 * epsilon)
    );
  });

  const next = clonePosParams(params);
  PARAM_KEYS.forEach((slot, i) => {
    const step = clamp(stepSize * gradient[i], -0.5, 0.5);
    writeParam(next, slot, readParam(next, slot) - step);
  });
  normaliseParams(next);
  return next;
}

interface HeldOutScore {
  snrDb: number;
  heartRateBpm: number;
}

function heldOut(
  shots: RgbTraces[],
  fs: number,
  params: PosParams
): HeldOutScore {
  if (shots.length === 0) return { snrDb: -Infinity, heartRateBpm: 0 };
  const scores = shots.map((traces) => {
    const prediction = new Float64Array(traces.r.length);
    const pulse = posPulse(traces, fs, params);
    for (let i = 1; i < pulse.length; i++) prediction[i] = pulse[i] - pulse[i - 1];
    if (prediction.length > 1) prediction[0] = prediction[1];
    return estimatePulse(prediction, {
      sampleRateHz: fs,
      windowSize: prediction.length,
    });
  });
  return {
    snrDb: mean(scores.map((s) => s.snrDb)),
    heartRateBpm: mean(scores.map((s) => s.heartRateBpm)),
  };
}

/**
 * How far the adapted estimator may move the rate before its personalisation
 * is thrown away. A projection that locks onto a harmonic or onto a periodic
 * artefact scores *better* on SNR while being further from the truth, so SNR
 * alone is not a safe acceptance test for something reported as a vital sign.
 */
const MAX_RATE_DRIFT_BPM = 5;

/**
 * Fit a subject-specific estimator from a short calibration clip.
 *
 * Returns null when the clip is too short to split into support and query, and
 * returns the *unadapted* profile when adaptation fails to beat the baseline on
 * the held-out query set — a personalisation that does not generalise is worse
 * than none, and the paper's query split exists precisely to detect that.
 */
export function adaptToSubject(
  traces: RgbTraces,
  options: AdaptOptions = {}
): PersonalizationProfile | null {
  const fs = options.sampleRateHz ?? 30;
  const shotSize = options.shotSize ?? Math.round(fs * 3);
  const innerSteps = options.innerSteps ?? DEFAULT_INNER_STEPS;
  const innerStepSize = options.innerStepSize ?? DEFAULT_INNER_STEP_SIZE;
  const total = traces.r.length;
  const shotCount = Math.floor(total / shotSize);
  if (shotCount < 2) return null;

  // Temporal split rather than splitters.py' shuffle: consecutive windows of
  // one recording are not exchangeable, and an interleaved split would leak
  // the query beat into the support set.
  const supportCount = Math.max(1, Math.floor(shotCount / 2));
  const supportShots: Shot[] = [];
  const queryShots: RgbTraces[] = [];
  for (let i = 0; i < shotCount; i++) {
    const window = sliceTraces(traces, i * shotSize, (i + 1) * shotSize);
    if (i < supportCount) {
      const label = pseudoLabel(window, fs);
      if (label) supportShots.push({ traces: window, label });
    } else {
      queryShots.push(window);
    }
  }
  if (supportShots.length === 0 || queryShots.length === 0) return null;

  let params = clonePosParams(DEFAULT_POS_PARAMS);
  for (let step = 0; step < innerSteps; step++) {
    params = innerStep(supportShots, fs, params, innerStepSize);
  }

  const baseline = heldOut(queryShots, fs, DEFAULT_POS_PARAMS);
  const adapted = heldOut(queryShots, fs, params);
  const improved =
    adapted.snrDb > baseline.snrDb &&
    Math.abs(adapted.heartRateBpm - baseline.heartRateBpm) <= MAX_RATE_DRIFT_BPM;
  const baselineSnrDb = baseline.snrDb;

  return {
    version: 1,
    params: improved ? params : clonePosParams(DEFAULT_POS_PARAMS),
    baselineSnrDb,
    adaptedSnrDb: improved ? adapted.snrDb : baselineSnrDb,
    innerSteps,
    innerStepSize,
    supportWindows: supportShots.length,
    queryWindows: queryShots.length,
    sampleRateHz: fs,
    createdAt: options.now ?? 0,
  };
}

/** Did adaptation actually buy anything on held-out data? */
export function personalizationGainDb(profile: PersonalizationProfile): number {
  return profile.adaptedSnrDb - profile.baselineSnrDb;
}
