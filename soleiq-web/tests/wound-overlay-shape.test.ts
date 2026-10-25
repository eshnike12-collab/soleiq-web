import { describe, expect, it } from "vitest";
import { blobInBox, shapeFor, sizeLabel } from "@/lib/wound/overlayShape";
import { classifyChange } from "@/lib/wound/changeKind";

const box: [number, number][] = [
  [0.2, 0.3],
  [0.6, 0.3],
  [0.6, 0.7],
  [0.2, 0.7],
];

describe("the rectangle is gone", () => {
  it("draws the traced contour when one exists", () => {
    const contour: [number, number][] = [
      [0.3, 0.3],
      [0.5, 0.35],
      [0.45, 0.6],
      [0.25, 0.5],
    ];
    const shape = shapeFor({ contour, polygon: box })!;
    expect(shape.confidence).toBe("traced");
    expect(shape.d.startsWith("M 0.3000 0.3000")).toBe(true);
    expect(shape.d.endsWith("Z")).toBe(true);
  });

  it("falls back to a soft blob, never the four box corners", () => {
    const shape = shapeFor({ contour: null, polygon: box })!;
    expect(shape.confidence).toBe("approximate");
    // A rectangle would be exactly four points.
    const vertices = shape.d.split("L").length;
    expect(vertices).toBeGreaterThan(10);
    // And none of the box's own corners should appear verbatim.
    expect(shape.d).not.toContain("0.2000 0.3000");
  });

  it("keeps the blob inside the region the model named", () => {
    const ring = blobInBox(0.2, 0.3, 0.4, 0.4);
    for (const [x, y] of ring) {
      expect(x).toBeGreaterThanOrEqual(0.2 - 1e-6);
      expect(x).toBeLessThanOrEqual(0.6 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(0.3 - 1e-6);
      expect(y).toBeLessThanOrEqual(0.7 + 1e-6);
    }
  });

  it("is deterministic, so the shape does not shimmer between renders", () => {
    expect(blobInBox(0.1, 0.1, 0.3, 0.3)).toEqual(blobInBox(0.1, 0.1, 0.3, 0.3));
  });

  it("draws nothing when there is neither contour nor region", () => {
    expect(shapeFor({ contour: null })).toBeNull();
    expect(shapeFor({ contour: null, polygon: [] })).toBeNull();
  });
});

describe("size label never overstates precision", () => {
  it("uses millimetres only when the scale is reliable", () => {
    expect(
      sizeLabel({ lengthMm: 18.4, widthMm: 11.2, scaleReliable: true })
    ).toBe("18 × 11 mm");
  });

  it("marks millimetres approximate when the scale is not reliable", () => {
    const label = sizeLabel({
      lengthMm: 18.4,
      widthMm: 11.2,
      scaleReliable: false,
    })!;
    expect(label).toContain("≈");
    expect(label).toContain("mm");
  });

  it("falls back to pixels when there is no millimetre scale at all", () => {
    // No shoe size recorded. Pixels need no calibration and cannot be
    // mistaken for a ruler reading.
    expect(
      sizeLabel({ lengthMm: null, widthMm: null, lengthPx: 140, widthPx: 90 })
    ).toBe("140 × 90 px");
  });

  it("says nothing rather than guessing", () => {
    expect(sizeLabel({ lengthMm: null, widthMm: null })).toBeNull();
  });
});

describe("every kind of change is measured, not just wounds", () => {
  it.each([
    ["an open ulcer on the heel", "wound"],
    ["thick callus under the big toe", "callus"],
    ["redness across the forefoot", "redness"],
    ["dry, flaking skin on the heel", "dryness"],
    ["deep cracks in the heel", "dryness"],
    ["soggy white skin between the toes", "maceration"],
    ["thickened discoloured toenail", "nail"],
    ["swelling around the ankle", "swelling"],
  ])("classifies %s", (text, expected) => {
    expect(classifyChange(text)).toBe(expected);
  });

  it("prefers wound when a finding mentions both", () => {
    // "dry cracked skin with an open sore" is a wound; measuring it as
    // dryness would outline the wrong thing.
    expect(classifyChange("dry cracked skin with an open sore at the centre")).toBe(
      "wound"
    );
  });

  it("returns null rather than guessing a kind", () => {
    expect(classifyChange("the photo is slightly out of focus")).toBeNull();
    expect(classifyChange("")).toBeNull();
  });
});
