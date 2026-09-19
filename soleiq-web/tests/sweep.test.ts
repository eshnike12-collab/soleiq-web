import { describe, expect, it } from "vitest";
import {
  DELTA_H,
  DELTA_W,
  FRESH_TRACKING,
  REANCHOR_AFTER,
  SWEEP_CONFIG,
  decideFrame,
  descriptorOf,
  frameShift,
  noveltyOf,
  referenceFor,
  trackingAfter,
  validateScan,
  viewpointSpread,
  type TrackingState,
} from "@/lib/scan3d/sweep";

/**
 * sweep.ts decides which camera frames reach reconstruction, so every gate
 * here is one a patient can fail without being told why. The module's header
 * claimed "the test suite import these directly" while no such suite existed
 * in this repo — this is that suite.
 *
 * Synthetic frames are fine for exercising thresholds, with one caveat worth
 * stating: random noise is far more distinguishable than two photographs of
 * the same foot, so these prove the LOGIC, not the calibration. The
 * calibration evidence lives in local-data/soleiq.db.
 */

const N = DELTA_W * DELTA_H;
const SHARP = SWEEP_CONFIG.sharpnessFloor * 4;
const LUMA = 128;

/** Deterministic PRNG — a flaky perception test is worse than none. */
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** A wide panorama; windows of it overlap like consecutive orbit frames. */
const PANO_W = DELTA_W + 44 * 6;
const pano = new Float32Array(PANO_W * DELTA_H);
for (let i = 0; i < pano.length; i++) pano[i] = rnd() * 255;

/** Window k, panned 6px per step. */
function orbitFrame(k: number): Float32Array {
  const f = new Float32Array(N);
  for (let y = 0; y < DELTA_H; y++)
    for (let x = 0; x < DELTA_W; x++)
      f[y * DELTA_W + x] = pano[y * PANO_W + (k * 6 + x)];
  return f;
}

const flat = (value: number) => new Float32Array(N).fill(value);

const ctx = (
  banked: Float32Array[],
  tracking: TrackingState = FRESH_TRACKING
) => ({
  previous: referenceFor(banked, tracking),
  recent: banked.slice(-SWEEP_CONFIG.noveltyWindow),
  bankedCount: banked.length,
  elapsedMs: 0,
});

describe("decideFrame — quality gates", () => {
  it("names darkness rather than the blur it causes", () => {
    // Ordering matters: a dark frame is usually blurry too, and telling
    // someone to hold steadier when the room is unlit fixes nothing.
    const d = decideFrame(flat(5), ctx([]), SHARP, 5);
    expect(d.bank).toBe(false);
    expect(d.reason).toBe("too_dark");
    expect(d.hint).toBe("increase_light");
  });

  it("rejects an overexposed frame", () => {
    const d = decideFrame(flat(250), ctx([]), SHARP, 250);
    expect(d.reason).toBe("too_bright");
  });

  it("treats blur during a sweep as speed, because it nearly always is", () => {
    const d = decideFrame(orbitFrame(0), ctx([]), 1, LUMA);
    expect(d.reason).toBe("blurry");
    expect(d.hint).toBe("slow_down");
  });

  it("banks the first sharp, well-exposed frame as the reference", () => {
    expect(decideFrame(orbitFrame(0), ctx([]), SHARP, LUMA).bank).toBe(true);
  });
});

describe("decideFrame — overlap and novelty", () => {
  it("banks a frame inside the movement band", () => {
    const banked = [descriptorOf(orbitFrame(0))];
    const d = decideFrame(orbitFrame(1), ctx(banked), SHARP, LUMA);
    expect(d.bank).toBe(true);
    expect(d.delta).toBeGreaterThan(SWEEP_CONFIG.minShift);
    expect(d.delta).toBeLessThan(SWEEP_CONFIG.maxShift);
  });

  it("rejects an exact duplicate as a repeated angle, not as a still camera", () => {
    const frame = orbitFrame(0);
    const d = decideFrame(frame, ctx([descriptorOf(frame)]), SHARP, LUMA);
    expect(d.bank).toBe(false);
    expect(d.reason).toBe("duplicate");
    expect(d.novelty).toBeLessThan(SWEEP_CONFIG.noveltyMin);
  });

  it("stops banking once the target is reached", () => {
    const banked = Array.from({ length: SWEEP_CONFIG.targetFrames }, (_, i) =>
      descriptorOf(orbitFrame(i))
    );
    const d = decideFrame(orbitFrame(41), ctx(banked), SHARP, LUMA);
    expect(d.bank).toBe(false);
    expect(d.hint).toBe("done");
  });
});

describe("noveltyOf compares against a window, not one predecessor", () => {
  it("catches a camera rocking between two positions", () => {
    // Every frame differs from the one before it, yet the set holds two
    // viewpoints. One-back comparison cannot see that; a window can.
    const a = descriptorOf(orbitFrame(0));
    const b = descriptorOf(orbitFrame(20));
    expect(noveltyOf(a, [b, a])).toBeLessThan(SWEEP_CONFIG.noveltyMin);
    expect(noveltyOf(a, [b])).toBeGreaterThan(SWEEP_CONFIG.noveltyMin);
  });
});

describe("SEARCH must exceed maxShift * DELTA_W", () => {
  it("keeps the too-fast threshold reachable by measurement", () => {
    // A live bug the module documents: the block-matching search looked +/-10
    // analysis px while the threshold sat at 0.22 * 48 = 10.56px, INSIDE the
    // gap. Displacement measured accurately to 10px then jumped to the 1.0
    // alignment-failure fallback, so "slow down" could only ever fire on total
    // failure — which cannot distinguish a quick pan from a different wall.
    const thresholdPx = SWEEP_CONFIG.maxShift * DELTA_W;
    // Measured rather than read from the private constant: a 12px pan sits
    // above the threshold and must report a real displacement, not the
    // saturated 1.0.
    const delta = frameShift(orbitFrame(2), orbitFrame(0));
    expect(thresholdPx).toBeLessThan(14);
    expect(delta).toBeGreaterThan(SWEEP_CONFIG.maxShift);
    expect(delta).toBeLessThan(1);
  });
});

describe("trackingAfter — the re-anchor that breaks a deadlock", () => {
  it("drops the reference after consecutive too-fast rejections", () => {
    let t = FRESH_TRACKING;
    for (let i = 0; i < REANCHOR_AFTER; i++) t = trackingAfter(t, false, "too_fast");
    expect(t.reanchor).toBe(true);
    expect(referenceFor([descriptorOf(orbitFrame(0))], t)).toBeNull();
  });

  it("does not re-anchor on unrelated rejections", () => {
    let t = FRESH_TRACKING;
    for (let i = 0; i < 10; i++) t = trackingAfter(t, false, "too_dark");
    expect(t.reanchor).toBe(false);
  });

  it("resets completely once a frame banks", () => {
    let t = FRESH_TRACKING;
    for (let i = 0; i < REANCHOR_AFTER; i++) t = trackingAfter(t, false, "too_fast");
    t = trackingAfter(t, true, null);
    expect(t).toEqual(FRESH_TRACKING);
  });

  it("recovers instead of rejecting forever once alignment is lost", () => {
    // The deadlock: the reference only advances when something banks, so a
    // stale reference rejects everything and never updates.
    const banked = [descriptorOf(orbitFrame(0))];
    let tracking: TrackingState = FRESH_TRACKING;
    let bankedAnything = false;
    for (let i = 0; i < 8; i++) {
      const frame = orbitFrame(40); // far away, alignment fails
      const d = decideFrame(frame, ctx(banked, tracking), SHARP, LUMA);
      tracking = trackingAfter(tracking, d.bank, d.reason);
      if (d.bank) {
        banked.push(descriptorOf(frame));
        bankedAnything = true;
      }
    }
    expect(bankedAnything).toBe(true);
  });
});

describe("viewpointSpread", () => {
  it("counts identical frames as one viewpoint", () => {
    const d = descriptorOf(orbitFrame(0));
    expect(viewpointSpread(Array.from({ length: 20 }, () => d))).toBe(1);
  });

  it("counts a real orbit as many", () => {
    const orbit = Array.from({ length: 20 }, (_, i) => descriptorOf(orbitFrame(i * 2)));
    expect(viewpointSpread(orbit)).toBeGreaterThan(SWEEP_CONFIG.minViewpoints);
  });
});

describe("validateScan", () => {
  const diverse = (n: number) =>
    Array.from({ length: n }, (_, i) => descriptorOf(orbitFrame(i * 2)));

  it("fails on too few frames and says how many more are needed", () => {
    const v = validateScan(diverse(5));
    expect(v.ok).toBe(false);
    expect(v.failure).toBe("insufficient_frames");
    expect(v.shortBy).toBe(SWEEP_CONFIG.minUsable - 5);
  });

  it("fails a static sweep on variation even with plenty of frames", () => {
    // The case frame-count alone used to pass: many frames, one angle.
    const same = Array.from({ length: 40 }, () => descriptorOf(orbitFrame(0)));
    const v = validateScan(same);
    expect(v.ok).toBe(false);
    expect(v.failure).toBe("insufficient_variation");
  });

  it("judges diversity on the full sample, not the banked subset", () => {
    // Banking selects FOR novelty, so measuring novelty across banked frames
    // answers a question the filter already decided.
    const banked = diverse(SWEEP_CONFIG.minUsable);
    const staticSamples = Array.from({ length: 40 }, () => descriptorOf(orbitFrame(0)));
    const v = validateScan(banked, { samples: staticSamples });
    expect(v.ok).toBe(false);
    expect(v.viewpoints).toBe(1);
  });

  it("passes a scan with enough frames and enough angles", () => {
    const v = validateScan(diverse(SWEEP_CONFIG.minUsable + 4));
    expect(v.ok).toBe(true);
    expect(v.failure).toBeNull();
  });

  it("names the dominant reject reason instead of generic advice", () => {
    const v = validateScan(diverse(5), { rejects: { too_dark: 20, blurry: 2 } });
    expect(v.advice).toContain("too dark");
  });
});
