import { describe, expect, it } from "vitest";

import {
  ASYMMETRY_CONCERN_THRESHOLD,
  assessFootPerfusion,
  assessMeasuredPressures,
  compareFeet,
  interpretAbi,
  interpretToePressure,
  measureCapillaryRefill,
  measurePerfusionSignal,
} from "@/lib/perfusion";

const FS = 30;

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Foot trace with a controllable pulsatile amplitude. */
function footTrace(options: {
  bpm: number;
  seconds: number;
  amplitude: number;
  noise?: number;
  seed?: number;
}) {
  const { bpm, seconds, amplitude, noise = 0.0015 } = options;
  const random = makeRandom(options.seed ?? 3);
  const n = Math.round(seconds * FS);
  const r = new Float64Array(n);
  const g = new Float64Array(n);
  const b = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const phase = (2 * Math.PI * bpm * t) / (60 * FS);
    const pulse = Math.sin(phase) + 0.3 * Math.sin(2 * phase);
    r[t] = 0.55 + amplitude * 0.6 * pulse + (random() - 0.5) * noise;
    g[t] = 0.4 + amplitude * pulse + (random() - 0.5) * noise;
    b[t] = 0.34 + amplitude * 0.4 * pulse + (random() - 0.5) * noise;
  }
  return { r, g, b };
}

describe("foot perfusion signal", () => {
  it("finds a pulsatile signal and a plausible rate", () => {
    const traces = footTrace({ bpm: 72, seconds: 20, amplitude: 0.01 });
    const signal = measurePerfusionSignal(traces, FS)!;
    expect(signal).not.toBeNull();
    expect(signal.pulsatile).toBe(true);
    expect(Math.abs(signal.pulseRateBpm - 72)).toBeLessThan(3);
    expect(signal.perfusionIndexPct).toBeGreaterThan(0);
  });

  it("scales the perfusion index with pulse amplitude", () => {
    const strong = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.02, seed: 1 }),
      FS
    )!;
    const weak = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.004, seed: 1 }),
      FS
    )!;
    expect(strong.perfusionIndexPct).toBeGreaterThan(weak.perfusionIndexPct * 2);
  });

  it("reports a flat trace as not pulsatile", () => {
    const random = makeRandom(9);
    const n = 600;
    const flat = {
      r: new Float64Array(n),
      g: new Float64Array(n),
      b: new Float64Array(n),
    };
    for (let t = 0; t < n; t++) {
      flat.r[t] = 0.55 + (random() - 0.5) * 0.002;
      flat.g[t] = 0.4 + (random() - 0.5) * 0.002;
      flat.b[t] = 0.34 + (random() - 0.5) * 0.002;
    }
    expect(measurePerfusionSignal(flat, FS)!.pulsatile).toBe(false);
  });

  it("refuses to measure a clip that is too short", () => {
    expect(measurePerfusionSignal(footTrace({ bpm: 70, seconds: 2, amplitude: 0.01 }), FS))
      .toBeNull();
  });
});

describe("bilateral comparison", () => {
  it("names the weaker foot when one side is markedly reduced", () => {
    const left = measurePerfusionSignal(
      footTrace({ bpm: 74, seconds: 20, amplitude: 0.003, seed: 11 }),
      FS
    );
    const right = measurePerfusionSignal(
      footTrace({ bpm: 74, seconds: 20, amplitude: 0.02, seed: 12 }),
      FS
    );
    const comparison = compareFeet(left, right);
    expect(comparison.comparable).toBe(true);
    expect(comparison.asymmetryIndex).toBeGreaterThan(ASYMMETRY_CONCERN_THRESHOLD);
    expect(comparison.weakerSide).toBe("left");
  });

  it("names no side when the feet match", () => {
    const left = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.012, seed: 21 }),
      FS
    );
    const right = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.012, seed: 21 }),
      FS
    );
    const comparison = compareFeet(left, right);
    expect(comparison.weakerSide).toBeNull();
    expect(comparison.asymmetryIndex).toBeLessThan(0.15);
  });

  it("will not compare when only one foot gave a usable signal", () => {
    const right = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.012 }),
      FS
    );
    const comparison = compareFeet(null, right);
    expect(comparison.comparable).toBe(false);
    expect(comparison.asymmetryIndex).toBeNull();
  });
});

describe("capillary refill", () => {
  /** Press → blanch → release → exponential recovery with time constant tau. */
  function refillClip(options: {
    tauSeconds: number;
    pressSeconds?: number;
    tailSeconds?: number;
    depth?: number;
    fps?: number;
  }) {
    const {
      tauSeconds,
      pressSeconds = 2,
      tailSeconds = 8,
      depth = 0.25,
      fps = 30,
    } = options;
    const samples = [];
    const baselineRedness = 0.42;
    const total = pressSeconds + tailSeconds;
    for (let i = 0; i < total * fps; i++) {
      const t = i / fps;
      const redness =
        t < pressSeconds
          ? baselineRedness * (1 - depth)
          : baselineRedness *
            (1 - depth * Math.exp(-(t - pressSeconds) / tauSeconds));
      // Convert a redness fraction back into RGB with a fixed total.
      const totalLevel = 300;
      const r = redness * totalLevel;
      const rest = totalLevel - r;
      samples.push({ t: t * 1000, r, g: rest * 0.58, b: rest * 0.42 });
    }
    return samples;
  }

  it("recovers a fast refill and calls it normal", () => {
    const result = measureCapillaryRefill(refillClip({ tauSeconds: 0.5 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 90% of recovery is reached at about 2.3 time constants.
    expect(result.refillSeconds).toBeGreaterThan(0.8);
    expect(result.refillSeconds).toBeLessThan(2);
    expect(result.category).toBe("normal");
  });

  it("recovers a slow refill and calls it prolonged", () => {
    const result = measureCapillaryRefill(
      refillClip({ tauSeconds: 3, tailSeconds: 14 })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refillSeconds).toBeGreaterThan(5);
    expect(result.category).toBe("prolonged");
  });

  it("tracks the time constant it was given", () => {
    for (const tau of [0.4, 1, 2]) {
      const result = measureCapillaryRefill(
        refillClip({ tauSeconds: tau, tailSeconds: 16 })
      );
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(Math.abs(result.tau63Seconds - tau)).toBeLessThan(Math.max(0.25, tau * 0.3));
    }
  });

  it("refuses a clip where the skin never blanched", () => {
    const result = measureCapillaryRefill(refillClip({ tauSeconds: 1, depth: 0.005 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/pale/i);
  });

  it("refuses a clip that was cut off before colour returned", () => {
    const result = measureCapillaryRefill(
      refillClip({ tauSeconds: 6, tailSeconds: 2 })
    );
    expect(result.ok).toBe(false);
  });

  it("refuses a clip with almost no frames", () => {
    const result = measureCapillaryRefill([{ t: 0, r: 1, g: 1, b: 1 }]);
    expect(result.ok).toBe(false);
  });
});

describe("measured pressure interpretation", () => {
  it("uses the standard ABI bands", () => {
    expect(interpretAbi(1.1)!.severity).toBe("normal");
    expect(interpretAbi(0.95)!.severity).toBe("borderline");
    expect(interpretAbi(0.7)!.severity).toBe("reduced");
    expect(interpretAbi(0.45)!.severity).toBe("critical");
    expect(interpretAbi(0.3)!.severity).toBe("critical");
  });

  it("treats a high ABI as uninterpretable, not as healthy", () => {
    const high = interpretAbi(1.6)!;
    expect(high.severity).toBe("unreliable");
    expect(high.needsToePressure).toBe(true);
    expect(high.detail).toMatch(/calcified|incompressible/i);
  });

  it("flags a toe pressure below the healing threshold as critical", () => {
    expect(interpretToePressure(25)!.severity).toBe("critical");
    expect(interpretToePressure(45)!.severity).toBe("borderline");
    expect(interpretToePressure(80)!.severity).toBe("normal");
  });

  it("lets the worst test drive the limb's severity", () => {
    const assessment = assessMeasuredPressures({
      side: "left",
      abi: 1.5, // non-compressible
      toePressureMmHg: 20, // critical
    })!;
    expect(assessment.severity).toBe("critical");
    expect(assessment.needsToePressure).toBe(false); // a toe pressure exists
    expect(assessment.findings).toHaveLength(2);
  });

  it("asks for a toe pressure when only a non-compressible ABI exists", () => {
    const assessment = assessMeasuredPressures({ side: "right", abi: 1.45 })!;
    expect(assessment.needsToePressure).toBe(true);
  });
});

describe("combined foot perfusion assessment", () => {
  it("says 'not assessed' rather than 'normal' when nothing was measured", () => {
    const assessment = assessFootPerfusion({});
    expect(assessment.concern).toBe("unknown");
    expect(assessment.empty).toBe(true);
    expect(assessment.actions.join(" ")).toMatch(/ankle-brachial/i);
  });

  it("never lets camera signals alone read as an all-clear", () => {
    const left = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.012, seed: 5 }),
      FS
    );
    const right = measurePerfusionSignal(
      footTrace({ bpm: 70, seconds: 20, amplitude: 0.012, seed: 5 }),
      FS
    );
    const assessment = assessFootPerfusion({ bilateral: compareFeet(left, right) });
    expect(assessment.concern).toBe("reassuring");
    // The disclaimer that matters: a camera cannot exclude arterial disease.
    expect(assessment.actions.join(" ")).toMatch(/cannot rule out/i);
  });

  it("escalates to urgent on a critical measured pressure", () => {
    const assessment = assessFootPerfusion({
      pressures: [{ side: "left", abi: 0.35 }],
    });
    expect(assessment.concern).toBe("urgent");
    expect(assessment.actions.join(" ")).toMatch(/urgent vascular/i);
  });

  it("does not let a normal other foot cancel a critical one", () => {
    const assessment = assessFootPerfusion({
      pressures: [
        { side: "right", abi: 1.1 },
        { side: "left", abi: 0.3 },
      ],
    });
    expect(assessment.concern).toBe("urgent");
  });

  it("treats prolonged refill with an open wound as urgent", () => {
    const withWound = assessFootPerfusion({
      refill: [
        {
          side: "left",
          result: {
            refillSeconds: 7.2,
            tau63Seconds: 3,
            blanchDepth: 0.3,
            category: "prolonged",
            releaseAtMs: 2000,
            sampleCount: 300,
          },
        },
      ],
      woundPresent: true,
    });
    expect(withWound.concern).toBe("urgent");
  });
});
