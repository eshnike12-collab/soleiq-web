import { describe, expect, it } from "vitest";
import { measureUlcerInRegion } from "@/lib/wound";

/**
 * Precision of the ulcer measurement, against phantoms of known size.
 *
 * This is the only way to answer "how accurate is the measurement" without a
 * printed phantom and a camera: synthesise an image where the true area is
 * known exactly, run the real pipeline, and compare.
 *
 * WHAT THIS CAN AND CANNOT TELL YOU
 *
 * It measures the SEGMENTATION AND SCALING MATH on clean, synthetic input —
 * flat colour, no shadow, no perspective, no camera noise. Real photographs
 * are worse in every one of those ways, so treat any error here as a floor,
 * never as field accuracy. Field accuracy needs printed phantoms photographed
 * at varied distance and angle.
 */

const W = 400;
const H = 500;

/** Skin: must satisfy skinMask's chromaticity band (r 0.32–0.58, g 0.22–0.42). */
const SKIN: [number, number, number] = [205, 150, 120];
/** Granulation red: still skin-plausible, but clearly redder than the surround. */
const WOUND: [number, number, number] = [190, 90, 80];
const BACKGROUND: [number, number, number] = [30, 40, 60];

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * A skin-toned ellipse (the "foot") with a redder ellipse inside it (the
 * "wound"). Returns the pixel buffer and the exact wound area in pixels,
 * counted rather than computed, so the ground truth is not itself an estimate.
 */
function phantom(woundRx: number, woundRy: number) {
  const pixels = new Uint8ClampedArray(W * H * 4);
  const footCx = W / 2;
  const footCy = H / 2;
  const footRx = 110;
  const footRy = 220; // major axis = 440px, the scale reference
  const woundCx = footCx;
  const woundCy = footCy;

  let woundPx = 0;
  let footPx = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let colour = BACKGROUND;
      if (inEllipse(x, y, footCx, footCy, footRx, footRy)) {
        footPx++;
        colour = SKIN;
        if (inEllipse(x, y, woundCx, woundCy, woundRx, woundRy)) {
          woundPx++;
          colour = WOUND;
        }
      }
      pixels[i] = colour[0];
      pixels[i + 1] = colour[1];
      pixels[i + 2] = colour[2];
      pixels[i + 3] = 255;
    }
  }
  return { pixels, woundPx, footPx, footMajorPx: footRy * 2 };
}

/** The region box the vision model would have supplied, in 0..1 coordinates. */
const regionFor = (rx: number, ry: number) => ({
  side: "right" as const,
  view: "sole" as const,
  x: (W / 2 - rx * 1.6) / W,
  y: (H / 2 - ry * 1.6) / H,
  w: (rx * 3.2) / W,
  h: (ry * 3.2) / H,
});

describe("ulcer measurement precision (synthetic phantoms)", () => {
  // 240mm foot over 440px of major axis = 0.5454 mm/px.
  const FOOT_LENGTH_MM = 240;

  it("recovers the area of a known circular wound", () => {
    const { pixels, woundPx, footMajorPx } = phantom(30, 30);
    const mmPerPx = FOOT_LENGTH_MM / footMajorPx;
    const trueAreaMm2 = woundPx * mmPerPx * mmPerPx;

    const analysis = measureUlcerInRegion(pixels, W, H, regionFor(30, 30), {
      footLengthMm: FOOT_LENGTH_MM,
    });

    expect(analysis).not.toBeNull();
    const measured = analysis!.measurement.areaMm2;
    expect(measured).not.toBeNull();

    const errorPct = Math.abs(measured! - trueAreaMm2) / trueAreaMm2 * 100;
    // Reported so a regression shows up as a number, not a pass/fail.
    console.log(
      `  circular  true ${trueAreaMm2.toFixed(1)} mm²  measured ${measured!.toFixed(1)} mm²  error ${errorPct.toFixed(1)}%`
    );
    expect(errorPct).toBeLessThan(25);
  });

  it("recovers the area of an elongated wound", () => {
    const { pixels, woundPx, footMajorPx } = phantom(18, 45);
    const mmPerPx = FOOT_LENGTH_MM / footMajorPx;
    const trueAreaMm2 = woundPx * mmPerPx * mmPerPx;

    const analysis = measureUlcerInRegion(pixels, W, H, regionFor(18, 45), {
      footLengthMm: FOOT_LENGTH_MM,
    });
    expect(analysis).not.toBeNull();
    const measured = analysis!.measurement.areaMm2!;
    const errorPct = Math.abs(measured - trueAreaMm2) / trueAreaMm2 * 100;
    console.log(
      `  elongated true ${trueAreaMm2.toFixed(1)} mm²  measured ${measured.toFixed(1)} mm²  error ${errorPct.toFixed(1)}%`
    );
    expect(errorPct).toBeLessThan(25);
  });

  it("scales linearly — a wound 2x the radius reports ~4x the area", () => {
    const small = measureUlcerInRegion(phantom(20, 20).pixels, W, H, regionFor(20, 20), {
      footLengthMm: FOOT_LENGTH_MM,
    });
    const large = measureUlcerInRegion(phantom(40, 40).pixels, W, H, regionFor(40, 40), {
      footLengthMm: FOOT_LENGTH_MM,
    });
    const ratio = large!.measurement.areaMm2! / small!.measurement.areaMm2!;
    console.log(`  doubling radius -> area ratio ${ratio.toFixed(2)} (ideal 4.00)`);
    expect(ratio).toBeGreaterThan(3.2);
    expect(ratio).toBeLessThan(4.8);
  });

  it("reports NO millimetre value when no foot length is supplied", () => {
    // The load-bearing contract: without a scale reference the system must not
    // invent one. Relative area stays available because it needs no scale.
    const { pixels } = phantom(30, 30);
    const analysis = measureUlcerInRegion(pixels, W, H, regionFor(30, 30), {});
    expect(analysis).not.toBeNull();
    expect(analysis!.measurement.areaMm2).toBeNull();
    expect(analysis!.measurement.maxLengthMm).toBeNull();
    expect(analysis!.measurement.areaFootPct).toBeGreaterThan(0);
  });
});
