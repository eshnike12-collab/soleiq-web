import { describe, expect, it } from "vitest";

import {
  compareWound,
  findUlcerCandidates,
  footMask,
  maskExtent,
  measureUlcerInRegion,
  scaleFromFoot,
  skinReference,
} from "@/lib/wound";

const WIDTH = 300;
const HEIGHT = 400;
/** Semi-axes of the synthetic foot, in pixels. */
const FOOT_RX = 0.25 * WIDTH;
const FOOT_RY = 0.42 * HEIGHT;
const FOOT_LENGTH_MM = 260;
/** Second moments of a filled ellipse give back its full major axis. */
const EXPECTED_MAJOR_AXIS_PX = 2 * FOOT_RY;
const MM_PER_PX = FOOT_LENGTH_MM / EXPECTED_MAJOR_AXIS_PX;

type Rgb = [number, number, number];

const LIGHT_SKIN: Rgb = [232, 184, 162];
const DARK_SKIN: Rgb = [92, 62, 48];
const BACKGROUND: Rgb = [104, 112, 132];
/** Beefy red granulation tissue. */
const GRANULATION: Rgb = [163, 52, 48];
/** Black necrotic eschar. */
const ESCHAR: Rgb = [28, 22, 20];

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

interface Blob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: Rgb;
}

/**
 * Synthetic top-of-foot photo: a skin-coloured ellipse on a non-skin
 * background, optional wound blobs, and sensor noise so the robust statistics
 * have a realistic spread to work with.
 */
function makeFootImage(options: {
  skin: Rgb;
  blobs?: Blob[];
  noise?: number;
  seed?: number;
  /** Reddened halo around the first blob, to simulate periwound erythema. */
  erythemaRing?: { radius: number; strength: number };
}): Uint8ClampedArray {
  const { skin, blobs = [], noise = 5 } = options;
  const random = makeRandom(options.seed ?? 1);
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      const insideFoot =
        ((x - cx) / FOOT_RX) ** 2 + ((y - cy) / FOOT_RY) ** 2 <= 1;
      let color: Rgb = insideFoot ? skin : BACKGROUND;

      if (insideFoot && options.erythemaRing && blobs[0]) {
        const blob = blobs[0];
        const distance = Math.hypot(x - blob.cx, y - blob.cy);
        const inner = Math.max(blob.rx, blob.ry);
        if (distance > inner && distance <= inner + options.erythemaRing.radius) {
          color = [
            Math.min(255, skin[0] + options.erythemaRing.strength),
            Math.max(0, skin[1] - options.erythemaRing.strength * 0.5),
            Math.max(0, skin[2] - options.erythemaRing.strength * 0.5),
          ];
        }
      }

      for (const blob of blobs) {
        const inside =
          ((x - blob.cx) / blob.rx) ** 2 + ((y - blob.cy) / blob.ry) ** 2 <= 1;
        if (inside && insideFoot) color = blob.color;
      }

      for (let c = 0; c < 3; c++) {
        pixels[i * 4 + c] = Math.max(
          0,
          Math.min(255, color[c] + (random() - 0.5) * noise)
        );
      }
      pixels[i * 4 + 3] = 255;
    }
  }
  return pixels;
}

describe("foot segmentation and scale", () => {
  it.each([
    ["light skin", LIGHT_SKIN],
    ["dark skin", DARK_SKIN],
  ])("finds the foot on %s", (_label, skin) => {
    const pixels = makeFootImage({ skin: skin as Rgb });
    const foot = footMask(pixels, WIDTH, HEIGHT)!;
    expect(foot).not.toBeNull();
    const trueArea = Math.PI * FOOT_RX * FOOT_RY;
    expect(Math.abs(foot.count - trueArea) / trueArea).toBeLessThan(0.05);
  });

  it("recovers the foot's long axis from its second moments", () => {
    const foot = footMask(makeFootImage({ skin: LIGHT_SKIN }), WIDTH, HEIGHT)!;
    const extent = maskExtent(foot)!;
    expect(Math.abs(extent.majorAxisPx - EXPECTED_MAJOR_AXIS_PX)).toBeLessThan(8);
  });

  it("converts pixels to millimetres from the known foot length", () => {
    const foot = footMask(makeFootImage({ skin: LIGHT_SKIN }), WIDTH, HEIGHT)!;
    const scale = scaleFromFoot(foot, FOOT_LENGTH_MM)!;
    expect(scale.reliable).toBe(true);
    expect(Math.abs(scale.mmPerPixel - MM_PER_PX) / MM_PER_PX).toBeLessThan(0.05);
  });

  it("flags the scale as unreliable when the foot runs off the frame", () => {
    // A foot mask that touches every edge: scale would read short.
    const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      pixels[i * 4] = LIGHT_SKIN[0];
      pixels[i * 4 + 1] = LIGHT_SKIN[1];
      pixels[i * 4 + 2] = LIGHT_SKIN[2];
      pixels[i * 4 + 3] = 255;
    }
    const foot = footMask(pixels, WIDTH, HEIGHT)!;
    const scale = scaleFromFoot(foot, FOOT_LENGTH_MM)!;
    expect(scale.reliable).toBe(false);
    expect(scale.reason).toMatch(/edge/i);
  });

  it("gives no scale without a recorded foot length", () => {
    const foot = footMask(makeFootImage({ skin: LIGHT_SKIN }), WIDTH, HEIGHT)!;
    expect(scaleFromFoot(foot, undefined)).toBeNull();
  });
});

describe("ulcer measurement", () => {
  const ulcer: Blob = {
    cx: WIDTH / 2,
    cy: HEIGHT / 2,
    rx: 20,
    ry: 20,
    color: GRANULATION,
  };
  const region = {
    x: (ulcer.cx - 35) / WIDTH,
    y: (ulcer.cy - 35) / HEIGHT,
    w: 70 / WIDTH,
    h: 70 / HEIGHT,
  };
  const trueAreaPx = Math.PI * ulcer.rx * ulcer.ry;
  const trueAreaMm2 = trueAreaPx * MM_PER_PX * MM_PER_PX;

  it.each([
    ["light skin", LIGHT_SKIN],
    ["dark skin", DARK_SKIN],
  ])("measures the area in mm² on %s", (_label, skin) => {
    const pixels = makeFootImage({ skin: skin as Rgb, blobs: [ulcer] });
    const analysis = measureUlcerInRegion(pixels, WIDTH, HEIGHT, region, {
      side: "left",
      view: "top",
      footLengthMm: FOOT_LENGTH_MM,
    })!;
    expect(analysis).not.toBeNull();
    expect(analysis.measurement.areaMm2).not.toBeNull();
    const error =
      Math.abs(analysis.measurement.areaMm2! - trueAreaMm2) / trueAreaMm2;
    expect(error).toBeLessThan(0.15);
  });

  it("measures the same wound the same size regardless of skin tone", () => {
    const light = measureUlcerInRegion(
      makeFootImage({ skin: LIGHT_SKIN, blobs: [ulcer] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    const dark = measureUlcerInRegion(
      makeFootImage({ skin: DARK_SKIN, blobs: [ulcer] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    const gap =
      Math.abs(light.measurement.areaMm2! - dark.measurement.areaMm2!) /
      light.measurement.areaMm2!;
    expect(gap).toBeLessThan(0.1);
  });

  it("still reports a size as a share of the foot with no shoe size", () => {
    const analysis = measureUlcerInRegion(
      makeFootImage({ skin: LIGHT_SKIN, blobs: [ulcer] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top" }
    )!;
    expect(analysis.measurement.areaMm2).toBeNull();
    expect(analysis.measurement.areaFootPct).toBeGreaterThan(0);
    expect(analysis.notes.join(" ")).toMatch(/shoe size/i);
  });

  it("calls red tissue granulation and black tissue eschar", () => {
    const red = measureUlcerInRegion(
      makeFootImage({ skin: LIGHT_SKIN, blobs: [ulcer] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    expect(red.measurement.tissue.granulationPct).toBeGreaterThan(70);

    const black = measureUlcerInRegion(
      makeFootImage({ skin: LIGHT_SKIN, blobs: [{ ...ulcer, color: ESCHAR }] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    expect(black.measurement.tissue.escharPct).toBeGreaterThan(70);
    expect(black.notes.join(" ")).toMatch(/dark tissue/i);
  });

  it("detects reddened skin around the wound", () => {
    const withHalo = measureUlcerInRegion(
      makeFootImage({
        skin: LIGHT_SKIN,
        blobs: [ulcer],
        erythemaRing: { radius: 14, strength: 40 },
      }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    expect(withHalo.measurement.periwoundErythemaSigma).toBeGreaterThan(2);
    expect(withHalo.notes.join(" ")).toMatch(/redder|infection/i);
  });

  it("finds nothing on an intact foot", () => {
    const clean = makeFootImage({ skin: LIGHT_SKIN, noise: 6, seed: 42 });
    expect(
      measureUlcerInRegion(clean, WIDTH, HEIGHT, region, {
        side: "left",
        view: "top",
        footLengthMm: FOOT_LENGTH_MM,
      })
    ).toBeNull();
    expect(
      findUlcerCandidates(clean, WIDTH, HEIGHT, {
        side: "left",
        view: "top",
        footLengthMm: FOOT_LENGTH_MM,
      })
    ).toHaveLength(0);
  });

  it("finds the wound without a region hint", () => {
    const candidates = findUlcerCandidates(
      makeFootImage({ skin: DARK_SKIN, blobs: [ulcer] }),
      WIDTH,
      HEIGHT,
      { side: "right", view: "sole", footLengthMm: FOOT_LENGTH_MM }
    );
    expect(candidates.length).toBeGreaterThan(0);
    const error =
      Math.abs(candidates[0].measurement.areaMm2! - trueAreaMm2) / trueAreaMm2;
    expect(error).toBeLessThan(0.15);
    expect(candidates[0].notes.join(" ")).toMatch(/without the image model/i);
  });

  it("scales measured area with the real wound size", () => {
    const small = measureUlcerInRegion(
      makeFootImage({ skin: LIGHT_SKIN, blobs: [{ ...ulcer, rx: 10, ry: 10 }] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    const large = measureUlcerInRegion(
      makeFootImage({ skin: LIGHT_SKIN, blobs: [ulcer] }),
      WIDTH,
      HEIGHT,
      region,
      { side: "left", view: "top", footLengthMm: FOOT_LENGTH_MM }
    )!;
    // Radius doubled → area roughly four times larger.
    const ratio = large.measurement.areaMm2! / small.measurement.areaMm2!;
    expect(ratio).toBeGreaterThan(3.2);
    expect(ratio).toBeLessThan(4.8);
  });
});

describe("wound change between visits", () => {
  const base = {
    areaMm2: 400,
    areaFootPct: 2,
    areaPx: 100,
    maxLengthMm: 25,
    maxWidthMm: 20,
    tissue: {
      granulationPct: 80,
      sloughPct: 10,
      escharPct: 0,
      indeterminatePct: 10,
    },
    periwoundErythemaSigma: 0.5,
    centre: { x: 0.5, y: 0.5 },
    scaleReliable: true,
  };

  it("reports shrinkage as a negative percentage", () => {
    const change = compareWound({ ...base, areaMm2: 150 }, base, 28)!;
    expect(change.areaChangePct).toBeCloseTo(-62.5, 1);
    expect(change.summary).toMatch(/smaller/);
  });

  it("applies the four-week healing-trajectory rule only near four weeks", () => {
    expect(compareWound({ ...base, areaMm2: 150 }, base, 28)!.onHealingTrajectory).toBe(true);
    expect(compareWound({ ...base, areaMm2: 350 }, base, 28)!.onHealingTrajectory).toBe(false);
    // Too early for the rule to mean anything.
    expect(compareWound({ ...base, areaMm2: 150 }, base, 5)!.onHealingTrajectory).toBeNull();
  });

  it("falls back to foot-area share when neither visit had a scale", () => {
    const current = { ...base, areaMm2: null, areaFootPct: 1 };
    const prior = { ...base, areaMm2: null, areaFootPct: 2 };
    const change = compareWound(current, prior, 30)!;
    expect(change.areaChangePct).toBeCloseTo(-50, 1);
  });

  it("refuses to compare millimetres against a foot-area share", () => {
    const current = { ...base, areaMm2: 200 };
    const prior = { ...base, areaMm2: null, areaFootPct: 2 };
    expect(compareWound(current, prior, 30)).toBeNull();
  });
});
