import { describe, expect, it } from "vitest";

import {
  butterBandpass,
  cumulativeSum,
  detrend,
  filtfilt,
  periodogramBand,
} from "@/lib/vitals/dsp";
import { estimatePulse } from "@/lib/vitals/postprocess";
import { DEFAULT_POS_PARAMS, posPrediction, posPulse } from "@/lib/vitals/pos";
import { adaptToSubject, personalizationGainDb } from "@/lib/vitals/metaphys";
import {
  ROI_SIZE,
  buildTscanInput,
  frameFromImageData,
  frameMeanRgb,
} from "@/lib/vitals/preprocess";
import { attentionMask, temporalShift } from "@/lib/vitals/tscan";
import { resampleTraces } from "@/lib/vitals/resample";
import { estimateVitals } from "@/lib/vitals";

const FS = 30;

/**
 * Deterministic pseudo-random source — Date.now()/Math.random() would make
 * these assertions flaky, and the point is reproducibility.
 */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Synthetic subject: a pulse at a known rate projected onto RGB through a skin
 * tone / lighting mix, plus a breathing-rate drift and sensor noise. This is
 * the situation MetaPhys personalises for — the projection differs per person.
 */
function syntheticSubject(options: {
  bpm: number;
  seconds: number;
  noise?: number;
  skinTone?: [number, number, number];
  seed?: number;
}) {
  const { bpm, seconds, noise = 0.0025, skinTone = [0.35, 0.75, 0.5] } = options;
  const random = makeRandom(options.seed ?? 7);
  const n = Math.round(seconds * FS);
  const r = new Float64Array(n);
  const g = new Float64Array(n);
  const b = new Float64Array(n);
  const base = [0.62, 0.44, 0.38];
  for (let t = 0; t < n; t++) {
    const phase = (2 * Math.PI * bpm * t) / (60 * FS);
    // Pulse plus a second harmonic, as real PPG has.
    const pulse = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
    const breathing = 0.004 * Math.sin((2 * Math.PI * 0.25 * t) / FS);
    const drift = 0.01 * (t / n);
    for (let c = 0; c < 3; c++) {
      const value =
        base[c] * (1 + drift) +
        0.012 * skinTone[c] * pulse +
        breathing +
        (random() - 0.5) * noise;
      if (c === 0) r[t] = value;
      else if (c === 1) g[t] = value;
      else b[t] = value;
    }
  }
  return { r, g, b };
}

describe("MetaPhys DSP port", () => {
  it("designs the same first-order Butterworth bandpass scipy does", () => {
    // scipy.signal.butter(1, [0.75/30*2, 2.5/30*2], btype="bandpass"),
    // cross-checked against scipy's own buttap → lp2bp_zpk → bilinear_zpk path.
    const { b, a } = butterBandpass(0.75, 2.5, FS);
    expect(b[0]).toBeCloseTo(0.15635952, 8);
    expect(b[1]).toBeCloseTo(0, 12);
    expect(b[2]).toBeCloseTo(-0.15635952, 8);
    expect(a[0]).toBe(1);
    expect(a[1]).toBeCloseTo(-1.61758769, 8);
    expect(a[2]).toBeCloseTo(0.68728096, 8);
  });

  it("passes the cardiac band and rejects outside it", () => {
    const filter = butterBandpass(0.75, 2.5, FS);
    const amplitudeAt = (hz: number) => {
      const n = 600;
      const signal = new Float64Array(n);
      for (let t = 0; t < n; t++) {
        signal[t] = Math.sin((2 * Math.PI * hz * t) / FS);
      }
      const filtered = filtfilt(filter, signal);
      // Ignore edges, where zero-phase filtering has transients.
      let peak = 0;
      for (let t = 100; t < n - 100; t++) peak = Math.max(peak, Math.abs(filtered[t]));
      return peak;
    };
    expect(amplitudeAt(1.2)).toBeGreaterThan(0.7);
    expect(amplitudeAt(0.1)).toBeLessThan(0.1);
    expect(amplitudeAt(6)).toBeLessThan(0.1);
  });

  it("removes a slow trend without eating the pulse", () => {
    const n = 360;
    const signal = new Float64Array(n);
    for (let t = 0; t < n; t++) {
      signal[t] = 5 * (t / n) + Math.sin((2 * Math.PI * 1.2 * t) / FS);
    }
    const detrended = detrend(signal, 100);
    // Trend gone: the two halves now share a mean.
    const firstHalf = detrended.slice(0, n / 2).reduce((s, v) => s + v, 0) / (n / 2);
    const secondHalf = detrended.slice(n / 2).reduce((s, v) => s + v, 0) / (n / 2);
    expect(Math.abs(firstHalf - secondHalf)).toBeLessThan(0.2);
    // Oscillation survives.
    let peak = 0;
    for (let t = 30; t < n - 30; t++) peak = Math.max(peak, Math.abs(detrended[t]));
    expect(peak).toBeGreaterThan(0.8);
  });

  it("puts periodogram power at the true frequency", () => {
    const n = 360;
    const signal = new Float64Array(n);
    for (let t = 0; t < n; t++) signal[t] = Math.sin((2 * Math.PI * 1.25 * t) / FS);
    const { freqs, pxx } = periodogramBand(signal, FS, 4 * n, 0.7, 4);
    let peak = 0;
    for (let i = 1; i < pxx.length; i++) if (pxx[i] > pxx[peak]) peak = i;
    expect(freqs[peak]).toBeCloseTo(1.25, 2);
  });

  it("integrates a derivative signal back before estimating rate", () => {
    const n = 720;
    const derivative = new Float64Array(n);
    for (let t = 0; t < n; t++) {
      derivative[t] = Math.cos((2 * Math.PI * 1.1 * t) / FS);
    }
    const integrated = cumulativeSum(derivative);
    expect(integrated.length).toBe(n);
    const estimate = estimatePulse(derivative, { sampleRateHz: FS });
    expect(estimate.heartRateBpm).toBeGreaterThan(64);
    expect(estimate.heartRateBpm).toBeLessThan(68);
  });
});

describe("TS-CAN layer ports", () => {
  it("shifts a third of channels forward and a third back", () => {
    // 2 frames, 3 channels, 1×1 pixels: fold = 1, so channel 0 reads the next
    // frame, channel 1 the previous, channel 2 stays.
    const data = Float32Array.from([1, 10, 100, 2, 20, 200]);
    const shifted = temporalShift(data, 2, 3, 1, 1, 2, 3);
    expect(Array.from(shifted)).toEqual([2, 0, 100, 0, 10, 200]);
  });

  it("normalises each attention frame to mean 0.5", () => {
    const x = Float32Array.from([1, 2, 3, 4]);
    const masked = attentionMask(x, 1, 2, 2);
    const total = masked.reduce((sum, v) => sum + v, 0);
    // Float32 storage, so single-precision tolerance.
    expect(total / 4).toBeCloseTo(0.5, 6);
  });
});

describe("MetaPhys preprocessing", () => {
  it("builds a 6-channel tensor with a chunk-constant appearance branch", () => {
    const random = makeRandom(11);
    const frames = Array.from({ length: 9 }, () => {
      const pixels = new Uint8ClampedArray(ROI_SIZE * ROI_SIZE * 4);
      for (let i = 0; i < pixels.length; i++) pixels[i] = Math.floor(random() * 255);
      return frameFromImageData(pixels);
    });
    const input = buildTscanInput(frames, 4);
    expect(input.frames).toBe(8);
    expect(input.channels).toBe(6);
    expect(input.data.length).toBe(8 * 6 * ROI_SIZE * ROI_SIZE);

    // Appearance channels are averaged per frame_depth chunk and repeated, so
    // frames inside one chunk must be identical there.
    const perFrame = 6 * ROI_SIZE * ROI_SIZE;
    const appearanceOffset = 3 * ROI_SIZE * ROI_SIZE;
    const first = input.data.slice(
      appearanceOffset,
      appearanceOffset + ROI_SIZE * ROI_SIZE
    );
    const second = input.data.slice(
      perFrame + appearanceOffset,
      perFrame + appearanceOffset + ROI_SIZE * ROI_SIZE
    );
    expect(Array.from(second)).toEqual(Array.from(first));

    // ...and different across chunks.
    const fifth = input.data.slice(
      4 * perFrame + appearanceOffset,
      4 * perFrame + appearanceOffset + ROI_SIZE * ROI_SIZE
    );
    expect(Array.from(fifth)).not.toEqual(Array.from(first));
  });

  it("reads channel means off a preprocessed frame", () => {
    const pixels = new Uint8ClampedArray(ROI_SIZE * ROI_SIZE * 4);
    for (let i = 0; i < ROI_SIZE * ROI_SIZE; i++) {
      pixels[i * 4] = 255;
      pixels[i * 4 + 1] = 128;
      pixels[i * 4 + 2] = 0;
    }
    const [r, g, b] = frameMeanRgb(frameFromImageData(pixels));
    expect(r).toBeCloseTo(1, 6);
    expect(g).toBeCloseTo(128 / 255, 6);
    expect(b).toBeCloseTo(0, 6);
  });
});

describe("pulse estimation", () => {
  it.each([54, 72, 96, 128])("recovers a %i bpm pulse from RGB traces", (bpm) => {
    const traces = syntheticSubject({ bpm, seconds: 20, seed: bpm });
    const prediction = posPrediction(traces, FS);
    const estimate = estimatePulse(prediction, { sampleRateHz: FS });
    expect(Math.abs(estimate.heartRateBpm - bpm)).toBeLessThan(3);
    expect(estimate.snrDb).toBeGreaterThan(0);
  });

  it("reports low confidence for a trace that is only noise", () => {
    const random = makeRandom(3);
    const n = 900;
    const noise = { r: new Float64Array(n), g: new Float64Array(n), b: new Float64Array(n) };
    for (let t = 0; t < n; t++) {
      noise.r[t] = 0.6 + (random() - 0.5) * 0.02;
      noise.g[t] = 0.45 + (random() - 0.5) * 0.02;
      noise.b[t] = 0.4 + (random() - 0.5) * 0.02;
    }
    const estimate = estimatePulse(posPrediction(noise, FS), { sampleRateHz: FS });
    expect(estimate.confidence).toBeLessThan(0.5);
  });

  it("refuses to guess from a clip shorter than one window", async () => {
    const traces = syntheticSubject({ bpm: 70, seconds: 4 });
    expect(await estimateVitals({ traces, sampleRateHz: FS })).toBeNull();
  });

  it("returns a reading with quality and estimator provenance", async () => {
    const traces = syntheticSubject({ bpm: 78, seconds: 20, seed: 21 });
    const reading = await estimateVitals({ traces, sampleRateHz: FS, now: 1_700_000 });
    expect(reading).not.toBeNull();
    expect(Math.abs(reading!.heartRateBpm - 78)).toBeLessThan(3);
    expect(reading!.estimator).toBe("pos");
    expect(reading!.personalized).toBe(false);
    expect(["good", "fair", "poor"]).toContain(reading!.quality);
    expect(reading!.measuredAt).toBe(1_700_000);
  });
});

describe("capture resampling", () => {
  it("recovers the right rate from a jittery camera", async () => {
    // 84 bpm sampled at a wandering 24–36 fps, as a phone under auto-exposure
    // actually delivers. Estimating on the raw samples as if they were 30 fps
    // would read the rate wrong by whatever the drift is.
    const random = makeRandom(17);
    const samples = [];
    let t = 0;
    for (let i = 0; i < 900; i++) {
      const seconds = t / 1000;
      const phase = 2 * Math.PI * (84 / 60) * seconds;
      const pulse = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
      samples.push({
        t,
        r: 0.62 + 0.004 * pulse + (random() - 0.5) * 0.002,
        g: 0.44 + 0.009 * pulse + (random() - 0.5) * 0.002,
        b: 0.38 + 0.006 * pulse + (random() - 0.5) * 0.002,
      });
      t += 1000 / (24 + random() * 12);
    }
    const resampled = resampleTraces(samples, 30);
    expect(resampled).not.toBeNull();
    expect(resampled!.measuredFps).toBeGreaterThan(24);
    expect(resampled!.measuredFps).toBeLessThan(36);

    const reading = await estimateVitals({
      traces: resampled!.traces,
      sampleRateHz: resampled!.sampleRateHz,
    });
    expect(reading).not.toBeNull();
    expect(Math.abs(reading!.heartRateBpm - 84)).toBeLessThan(3);
  });

  it("declines to resample a clip with almost no samples", () => {
    expect(resampleTraces([{ t: 0, r: 1, g: 1, b: 1 }], 30)).toBeNull();
  });
});

describe("MetaPhys personalisation", () => {
  it("splits calibration into support and query shots", () => {
    const traces = syntheticSubject({ bpm: 66, seconds: 18, seed: 5 });
    const profile = adaptToSubject(traces, { sampleRateHz: FS });
    expect(profile).not.toBeNull();
    expect(profile!.supportWindows).toBeGreaterThanOrEqual(1);
    expect(profile!.queryWindows).toBeGreaterThanOrEqual(1);
    expect(profile!.innerStepSize).toBe(0.1);
  });

  it("needs more than one shot before it will adapt", () => {
    const traces = syntheticSubject({ bpm: 66, seconds: 2 });
    expect(adaptToSubject(traces, { sampleRateHz: FS })).toBeNull();
  });

  it("never returns a profile that is worse than the baseline on held-out data", () => {
    // Awkward subject: unusual skin-tone projection and heavy noise, the case
    // where a naive adaptation would overfit its support set.
    const traces = syntheticSubject({
      bpm: 88,
      seconds: 18,
      noise: 0.02,
      skinTone: [0.8, 0.3, 0.15],
      seed: 99,
    });
    const profile = adaptToSubject(traces, { sampleRateHz: FS });
    expect(profile).not.toBeNull();
    expect(personalizationGainDb(profile!)).toBeGreaterThanOrEqual(0);
  });

  it("keeps the heart rate correct after adapting", async () => {
    const traces = syntheticSubject({
      bpm: 84,
      seconds: 24,
      noise: 0.006,
      skinTone: [0.7, 0.55, 0.2],
      seed: 42,
    });
    const profile = adaptToSubject(traces, { sampleRateHz: FS });
    const reading = await estimateVitals({ traces, sampleRateHz: FS, profile });
    expect(reading).not.toBeNull();
    expect(Math.abs(reading!.heartRateBpm - 84)).toBeLessThan(3);
    expect(reading!.personalized).toBe(true);
  });

  it("does not adapt its way onto a different heart rate", () => {
    // Buried pulse: POS itself lands ~5 bpm off here, and an adaptation that
    // improved SNR while moving the rate further would be worse than useless.
    const traces = syntheticSubject({
      bpm: 84,
      seconds: 24,
      noise: 0.012,
      skinTone: [0.7, 0.55, 0.2],
      seed: 42,
    });
    const baseline = estimatePulse(posPrediction(traces, FS, DEFAULT_POS_PARAMS), {
      sampleRateHz: FS,
    });
    const profile = adaptToSubject(traces, { sampleRateHz: FS })!;
    const adapted = estimatePulse(posPrediction(traces, FS, profile.params), {
      sampleRateHz: FS,
    });
    expect(Math.abs(adapted.heartRateBpm - baseline.heartRateBpm)).toBeLessThanOrEqual(5);
  });

  it("flags a buried pulse as poor rather than reporting it confidently", async () => {
    const traces = syntheticSubject({
      bpm: 84,
      seconds: 24,
      noise: 0.012,
      skinTone: [0.7, 0.55, 0.2],
      seed: 42,
    });
    const reading = await estimateVitals({ traces, sampleRateHz: FS });
    expect(reading).not.toBeNull();
    expect(reading!.quality).toBe("poor");
    expect(reading!.confidence).toBeLessThan(0.3);
  });

  it("leaves POS untouched when adaptation is declined", () => {
    const traces = syntheticSubject({ bpm: 70, seconds: 18, seed: 8 });
    const before = posPulse(traces, FS, DEFAULT_POS_PARAMS);
    adaptToSubject(traces, { sampleRateHz: FS });
    const after = posPulse(traces, FS, DEFAULT_POS_PARAMS);
    expect(Array.from(after.slice(0, 50))).toEqual(Array.from(before.slice(0, 50)));
  });
});
