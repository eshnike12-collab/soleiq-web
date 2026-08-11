/**
 * Heart-rate estimation, ported from MetaPhys' `post_process.py`
 * (`calculate_metric` / `calculate_HR` / `calculate_SNR`).
 *
 * The reference computes metrics against a ground-truth PPG trace; here there
 * is no contact sensor, so the label half is dropped and the prediction half
 * is kept exactly: integrate the predicted derivative, detrend (λ = 100),
 * bandpass 0.75–2.5 Hz, take the spectral peak inside the same band.
 */

import {
  argmax,
  butterBandpass,
  cumulativeSum,
  detrend,
  filtfilt,
  mag2db,
  mean,
  periodogramBand,
  standardDeviation,
} from "./dsp";

/** MetaPhys defaults: post_process.py window_size=360, fs=30. */
export const PULSE_BAND_LOW_HZ = 0.75;
export const PULSE_BAND_HIGH_HZ = 2.5;
export const DEFAULT_WINDOW_SIZE = 360;
export const DEFAULT_SAMPLE_RATE = 30;
/** Detrend regularisation used by post_process.py. */
export const DETREND_LAMBDA = 100;

export interface PulseWindowResult {
  /** First sample of this window in the source signal. */
  startIndex: number;
  heartRateBpm: number;
  /** Signal-to-noise ratio in dB, defined as in post_process.py. */
  snrDb: number;
  /** Detrended, band-passed pulse waveform for this window. */
  waveform: Float64Array;
}

export interface PulseEstimate {
  /** Median of the per-window rates — robust to one bad window. */
  heartRateBpm: number;
  /** Mean per-window SNR in dB. */
  snrDb: number;
  /** 0–1 quality score combining SNR and window-to-window agreement. */
  confidence: number;
  /** Spread of the per-window rates, in bpm. */
  heartRateSpreadBpm: number;
  /** RMSSD in ms, or null when the signal is too noisy for beat timing. */
  hrvRmssdMs: number | null;
  windows: PulseWindowResult[];
  sampleRateHz: number;
  durationSeconds: number;
}

export interface PulseOptions {
  sampleRateHz?: number;
  windowSize?: number;
  bandpass?: boolean;
}

/**
 * post_process.py:calculate_SNR — power within ±0.1 Hz of the estimated rate
 * and its second harmonic, over everything else in 0.75–4 Hz.
 */
function calculateSnrDb(
  freqs: Float64Array,
  pxx: Float64Array,
  heartRateBpm: number
): number {
  const hr = heartRateBpm / 60;
  let signalPower = 0;
  let bandPower = 0;
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    const nearFundamental = f >= hr - 0.1 && f <= hr + 0.1;
    const nearHarmonic = f >= hr * 2 - 0.1 && f <= hr * 2 + 0.1;
    if (nearFundamental || nearHarmonic) signalPower += pxx[i];
    if (f >= 0.75 && f <= 4) bandPower += pxx[i];
  }
  const noisePower = bandPower - signalPower;
  if (noisePower <= 0 || signalPower <= 0) return 0;
  return mag2db(signalPower / noisePower);
}

/**
 * Beat-to-beat RMSSD from the band-passed waveform.
 *
 * Not part of MetaPhys — the paper reports rate, not variability — so it is
 * deliberately conservative: peaks must be at least half a plausible beat
 * apart, and the result is discarded unless enough intervals survive.
 */
function estimateRmssdMs(
  waveform: Float64Array,
  sampleRateHz: number,
  heartRateBpm: number
): number | null {
  const expectedGap = (60 / Math.max(heartRateBpm, 1)) * sampleRateHz;
  const minGap = Math.max(Math.floor(expectedGap * 0.5), 2);
  const threshold = standardDeviation(waveform) * 0.3;
  const peaks: number[] = [];
  for (let i = 1; i < waveform.length - 1; i++) {
    if (
      waveform[i] > threshold &&
      waveform[i] >= waveform[i - 1] &&
      waveform[i] > waveform[i + 1] &&
      (peaks.length === 0 || i - peaks[peaks.length - 1] >= minGap)
    ) {
      peaks.push(i);
    }
  }
  if (peaks.length < 5) return null;
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(((peaks[i] - peaks[i - 1]) / sampleRateHz) * 1000);
  }
  let acc = 0;
  for (let i = 1; i < intervals.length; i++) {
    acc += (intervals[i] - intervals[i - 1]) ** 2;
  }
  return Math.sqrt(acc / (intervals.length - 1));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Turn a predicted pulse-derivative signal into a heart rate.
 *
 * `prediction` is whatever the estimator produced per frame — TS-CAN's output
 * or the POS fallback — in the same derivative domain MetaPhys trains on.
 */
export function estimatePulse(
  prediction: ArrayLike<number>,
  options: PulseOptions = {}
): PulseEstimate {
  const fs = options.sampleRateHz ?? DEFAULT_SAMPLE_RATE;
  const bandpass = options.bandpass ?? true;
  const requested = options.windowSize ?? DEFAULT_WINDOW_SIZE;
  // Reference skips any trailing partial window unless the whole signal is
  // shorter than one window, in which case it uses everything it has.
  const windowSize = Math.min(requested, prediction.length);
  const filter = butterBandpass(PULSE_BAND_LOW_HZ, PULSE_BAND_HIGH_HZ, fs);
  const windows: PulseWindowResult[] = [];

  for (let start = 0; start + windowSize <= prediction.length; start += windowSize) {
    const slice = new Float64Array(windowSize);
    for (let i = 0; i < windowSize; i++) slice[i] = prediction[start + i];

    let processed = detrend(cumulativeSum(slice), DETREND_LAMBDA);
    if (bandpass) processed = filtfilt(filter, processed);

    const nfft = 4 * windowSize;
    const { freqs, pxx } = periodogramBand(processed, fs, nfft, 0.7, 4.05);
    const inBand: number[] = [];
    const inBandIndex: number[] = [];
    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] >= PULSE_BAND_LOW_HZ && freqs[i] <= PULSE_BAND_HIGH_HZ) {
        inBand.push(pxx[i]);
        inBandIndex.push(i);
      }
    }
    if (inBand.length === 0) continue;
    const peak = inBandIndex[argmax(inBand)];
    const heartRateBpm = freqs[peak] * 60;
    windows.push({
      startIndex: start,
      heartRateBpm,
      snrDb: calculateSnrDb(freqs, pxx, heartRateBpm),
      waveform: processed,
    });
  }

  const rates = windows.map((w) => w.heartRateBpm);
  const heartRateBpm = median(rates);
  const snrDb = windows.length ? mean(windows.map((w) => w.snrDb)) : 0;
  const spread = rates.length > 1 ? standardDeviation(rates) : 0;

  // Heuristic, not from the paper: usable rPPG sits around 0 dB and up, and
  // windows that disagree by more than a few bpm mean motion or bad light.
  //
  // Agreement multiplies rather than adds. A periodic artefact — a flickering
  // light, a rolling shutter pattern — produces windows that agree perfectly
  // while carrying no pulse at all, and a weighted sum lets that agreement
  // pull a hopeless trace up into "usable". SNR has to carry the reading.
  const snrScore = clamp01((snrDb + 6) / 14);
  const agreementScore = rates.length > 1 ? clamp01(1 - spread / 8) : 0.6;
  const confidence = clamp01(snrScore * (0.6 + 0.4 * agreementScore));

  const best = windows.reduce<PulseWindowResult | null>(
    (bestSoFar, current) =>
      !bestSoFar || current.snrDb > bestSoFar.snrDb ? current : bestSoFar,
    null
  );
  const hrvRmssdMs =
    best && best.snrDb > 3
      ? estimateRmssdMs(best.waveform, fs, best.heartRateBpm)
      : null;

  return {
    heartRateBpm,
    snrDb,
    confidence,
    heartRateSpreadBpm: spread,
    hrvRmssdMs,
    windows,
    sampleRateHz: fs,
    durationSeconds: prediction.length / fs,
  };
}
