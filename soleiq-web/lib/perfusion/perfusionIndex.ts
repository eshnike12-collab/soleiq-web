/**
 * Pulsatile perfusion of the foot, from the same camera pipeline as
 * `lib/vitals` but pointed at the foot instead of the face.
 *
 * WHAT THIS IS NOT: a blood pressure. There is no validated way to get a
 * pressure in mmHg out of a camera, and inventing one for a diabetic foot —
 * where a falsely reassuring number delays care for critical ischaemia — would
 * be the single most dangerous thing this app could do. Ankle and toe
 * pressures come from a cuff and a Doppler; see `abi.ts`, which interprets
 * values measured that way.
 *
 * WHAT THIS IS: evidence that the foot has a pulsatile blood supply the camera
 * can see, how strong it is, and — the part that carries real information —
 * how it compares between the two feet and against this patient's own earlier
 * visits. Perfusion index is the standard AC/DC ratio a pulse oximeter
 * reports, computed here in reflectance from ambient light.
 */

import {
  butterBandpass,
  filtfilt,
  mean,
  standardDeviation,
} from "@/lib/vitals/dsp";
import type { PosParams, RgbTraces } from "@/lib/vitals/pos";
import { posPrediction } from "@/lib/vitals/pos";
import {
  PULSE_BAND_HIGH_HZ,
  PULSE_BAND_LOW_HZ,
  estimatePulse,
} from "@/lib/vitals/postprocess";

export interface PerfusionSignal {
  /**
   * AC/DC ratio as a percentage.
   *
   * Camera reflectance under ambient light is NOT the same measurement as an
   * oximeter's transmission at 660/940 nm, so this number must never be
   * compared against oximeter thresholds like "PI < 0.4% is poor". It is
   * meaningful compared with the other foot, or with the same foot at an
   * earlier visit under similar light.
   */
  perfusionIndexPct: number;
  /** Pulse rate seen in the foot — a sanity check that the signal is cardiac. */
  pulseRateBpm: number;
  snrDb: number;
  /** True when a cardiac-rate pulsation is actually present above the noise. */
  pulsatile: boolean;
  /** 0–1 quality of the underlying trace. */
  confidence: number;
  sampleRateHz: number;
  durationSeconds: number;
}

/** Below this the trace is noise, and any "perfusion index" from it is noise too. */
const PULSATILE_SNR_DB = 0;
/** Plausible cardiac range; a foot "pulse" outside it is an artefact. */
const PLAUSIBLE_BPM: [number, number] = [40, 150];

/**
 * Perfusion index from an RGB trace of a foot ROI.
 *
 * AC is the RMS of the band-passed green channel scaled to an equivalent
 * peak-to-peak, DC is its mean level. Green carries the strongest pulsatile
 * component in camera rPPG; the red channel is used as a fallback when green
 * is clipped.
 */
export function measurePerfusionSignal(
  traces: RgbTraces,
  sampleRateHz: number,
  /**
   * MetaPhys personalisation for this patient (lib/vitals/metaphys). The
   * adapted projection was fitted to their own skin tone and lighting, which
   * is exactly the nuisance that otherwise makes a weak-looking foot signal
   * indistinguishable from weak perfusion.
   */
  params?: PosParams
): PerfusionSignal | null {
  const n = traces.g.length;
  if (n < sampleRateHz * 4) return null;

  const filter = butterBandpass(PULSE_BAND_LOW_HZ, PULSE_BAND_HIGH_HZ, sampleRateHz);
  const channel = channelForPulsation(traces);
  const dc = mean(channel);
  if (!Number.isFinite(dc) || dc <= 1e-6) return null;
  const ac = filtfilt(filter, channel);
  // RMS → peak-to-peak for a sinusoid is 2√2; the pulse is not a sinusoid, but
  // the same convention is what oximeter PI uses, so the numbers stay
  // comparable between feet and between visits.
  const acAmplitude = standardDeviation(ac) * 2 * Math.SQRT2;
  const perfusionIndexPct = (acAmplitude / dc) * 100;

  const estimate = estimatePulse(posPrediction(traces, sampleRateHz, params), {
    sampleRateHz,
  });
  if (estimate.windows.length === 0) return null;

  const plausibleRate =
    estimate.heartRateBpm >= PLAUSIBLE_BPM[0] &&
    estimate.heartRateBpm <= PLAUSIBLE_BPM[1];

  return {
    perfusionIndexPct: Math.round(perfusionIndexPct * 1000) / 1000,
    pulseRateBpm: Math.round(estimate.heartRateBpm * 10) / 10,
    snrDb: Math.round(estimate.snrDb * 10) / 10,
    pulsatile: estimate.snrDb > PULSATILE_SNR_DB && plausibleRate,
    confidence: estimate.confidence,
    sampleRateHz,
    durationSeconds: n / sampleRateHz,
  };
}

/** Green unless it is clipped or flat, in which case red. */
function channelForPulsation(traces: RgbTraces): Float64Array {
  const greenSpread = standardDeviation(traces.g);
  const redSpread = standardDeviation(traces.r);
  const greenClipped = mean(traces.g) > 0.97 || mean(traces.g) < 0.03;
  return greenClipped || greenSpread < redSpread * 0.25 ? traces.r : traces.g;
}

export interface BilateralPerfusion {
  left: PerfusionSignal | null;
  right: PerfusionSignal | null;
  /** |L − R| / max(L, R), 0–1. Null unless both sides gave a usable trace. */
  asymmetryIndex: number | null;
  /** The weaker side, when the difference is large enough to name one. */
  weakerSide: "left" | "right" | null;
  /** Both feet measured with a pulsatile signal present. */
  comparable: boolean;
}

/**
 * A single foot's perfusion index means little on its own — skin tone, light
 * and camera exposure all move it. The difference between a patient's own two
 * feet cancels most of that, and unilateral loss is exactly the pattern
 * peripheral arterial disease produces.
 */
export const ASYMMETRY_CONCERN_THRESHOLD = 0.4;

export function compareFeet(
  left: PerfusionSignal | null,
  right: PerfusionSignal | null
): BilateralPerfusion {
  const comparable = !!left?.pulsatile && !!right?.pulsatile;
  if (!comparable || !left || !right) {
    return {
      left,
      right,
      asymmetryIndex: null,
      weakerSide: null,
      comparable: false,
    };
  }
  const l = left.perfusionIndexPct;
  const r = right.perfusionIndexPct;
  const peak = Math.max(l, r);
  if (peak <= 0) {
    return { left, right, asymmetryIndex: null, weakerSide: null, comparable: false };
  }
  const asymmetryIndex = Math.abs(l - r) / peak;
  return {
    left,
    right,
    asymmetryIndex: Math.round(asymmetryIndex * 1000) / 1000,
    weakerSide:
      asymmetryIndex >= ASYMMETRY_CONCERN_THRESHOLD ? (l < r ? "left" : "right") : null,
    comparable: true,
  };
}
