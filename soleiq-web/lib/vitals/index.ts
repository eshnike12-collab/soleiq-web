/**
 * Contact-free pulse from the front camera, built on MetaPhys
 * (github.com/xliucs/MetaPhys, ACM CHIL 2021).
 *
 * Pipeline, end to end:
 *
 *   frames → preprocess.ts  (36×36 ROI, motion + appearance branches)
 *          → estimator      (TS-CAN when a checkpoint is registered, else POS)
 *          → metaphys.ts    (per-person few-shot adaptation, when calibrated)
 *          → postprocess.ts (integrate, detrend, bandpass, spectral peak)
 *
 * This is a wellness signal, not a medical measurement — the same standing
 * caveat the rest of SoleIQ carries. It exists because resting heart rate and
 * beat-to-beat variability track cardiac autonomic neuropathy, which travels
 * with the diabetic foot risk this app already screens for.
 */

import { type RgbTraces, posPrediction } from "./pos";
import {
  DEFAULT_FRAME_DEPTH,
  type RoiFrame,
  buildTscanInput,
  rgbTraces,
} from "./preprocess";
import { type PersonalizationProfile } from "./metaphys";
import { estimatePulse } from "./postprocess";
import { getTscanBackend } from "./tscan";

export * from "./dsp";
export * from "./metaphys";
export * from "./pos";
export * from "./postprocess";
export * from "./preprocess";
export * from "./resample";
export * from "./tscan";

export type VitalsQuality = "good" | "fair" | "poor";

export interface VitalsReading {
  heartRateBpm: number;
  /** Beat-to-beat variability, only when the trace was clean enough. */
  hrvRmssdMs: number | null;
  snrDb: number;
  /** 0–1 confidence combining SNR and window agreement. */
  confidence: number;
  quality: VitalsQuality;
  /** Which estimator produced this — "tscan" needs a registered checkpoint. */
  estimator: "tscan" | "pos";
  /** True when a MetaPhys-adapted profile was applied. */
  personalized: boolean;
  /** Held-out SNR gain from personalisation, dB. */
  personalizationGainDb: number | null;
  sampleRateHz: number;
  durationSeconds: number;
  measuredAt: number;
}

export interface EstimateVitalsInput {
  /** Preprocessed ROI frames. Required for the TS-CAN path. */
  frames?: RoiFrame[];
  /** Per-frame mean RGB, if frames were reduced during capture. */
  traces?: RgbTraces;
  sampleRateHz: number;
  /** Personalisation from this patient's calibration clip, when they have one. */
  profile?: PersonalizationProfile | null;
  frameDepth?: number;
  now?: number;
}

function qualityFor(confidence: number): VitalsQuality {
  if (confidence >= 0.6) return "good";
  if (confidence >= 0.3) return "fair";
  return "poor";
}

/** Shortest clip worth estimating from: one MetaPhys window, 12 s at 30 fps. */
export const MIN_MEASUREMENT_FRAMES = 360;

export async function estimateVitals(
  input: EstimateVitalsInput
): Promise<VitalsReading | null> {
  const traces = input.traces ?? (input.frames ? rgbTraces(input.frames) : null);
  if (!traces || traces.r.length < MIN_MEASUREMENT_FRAMES) return null;
  const fs = input.sampleRateHz;

  let prediction: Float64Array | null = null;
  let estimator: "tscan" | "pos" = "pos";

  const backend = getTscanBackend();
  if (backend && input.frames && input.frames.length > 1) {
    try {
      const tensor = buildTscanInput(
        input.frames,
        input.frameDepth ?? DEFAULT_FRAME_DEPTH
      );
      prediction = await backend.predict(tensor);
      estimator = "tscan";
    } catch (error) {
      // A broken checkpoint must not cost the patient their measurement.
      console.error("[soleiq] TS-CAN inference failed, falling back to POS", error);
      prediction = null;
    }
  }

  const profile = input.profile ?? null;
  if (!prediction) {
    prediction = posPrediction(traces, fs, profile?.params);
  }

  const estimate = estimatePulse(prediction, { sampleRateHz: fs });
  if (estimate.windows.length === 0) return null;

  const personalized = estimator === "pos" && !!profile;
  return {
    heartRateBpm: Math.round(estimate.heartRateBpm * 10) / 10,
    hrvRmssdMs:
      estimate.hrvRmssdMs === null ? null : Math.round(estimate.hrvRmssdMs),
    snrDb: Math.round(estimate.snrDb * 10) / 10,
    confidence: Math.round(estimate.confidence * 100) / 100,
    quality: qualityFor(estimate.confidence),
    estimator,
    personalized,
    personalizationGainDb:
      personalized && profile
        ? Math.round((profile.adaptedSnrDb - profile.baselineSnrDb) * 10) / 10
        : null,
    sampleRateHz: fs,
    durationSeconds: Math.round(estimate.durationSeconds),
    measuredAt: input.now ?? 0,
  };
}
