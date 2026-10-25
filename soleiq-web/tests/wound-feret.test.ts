import { describe, expect, it } from "vitest";
import { convexHull, feretDiameters } from "@/lib/wound/feret";
import type { ContourPoint } from "@/lib/wound/contour";

const ring = (
  n: number,
  f: (t: number) => [number, number]
): ContourPoint[] =>
  Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2));

describe("feret length", () => {
  it("is the diameter of a circle", () => {
    const circle = ring(120, (t) => [Math.cos(t) * 50, Math.sin(t) * 50]);
    const result = feretDiameters(circle)!;
    expect(result.lengthPx).toBeCloseTo(100, 0);
    expect(result.widthPx).toBeCloseTo(100, 0);
  });

  it("finds the long axis of an ellipse whatever its rotation", () => {
    for (const angle of [0, Math.PI / 6, Math.PI / 4, Math.PI / 3]) {
      const ellipse = ring(200, (t) => {
        const x = Math.cos(t) * 70;
        const y = Math.sin(t) * 25;
        return [
          x * Math.cos(angle) - y * Math.sin(angle),
          x * Math.sin(angle) + y * Math.cos(angle),
        ];
      });
      const result = feretDiameters(ellipse)!;
      // Rotation must not change the measurement — that is the whole point.
      expect(result.lengthPx).toBeCloseTo(140, 0);
      expect(result.widthPx).toBeCloseTo(50, 0);
    }
  });

  it("does not overstate a diagonal shape the way a bounding box does", () => {
    // A thin bar at 45°. Its bounding box diagonal is much longer than the bar.
    const bar: ContourPoint[] = [
      [0, 0],
      [100, 100],
      [97, 103],
      [-3, 3],
    ];
    const result = feretDiameters(bar)!;
    const boundingDiagonal = Math.hypot(103, 103);
    expect(result.lengthPx).toBeCloseTo(Math.hypot(100, 100), 0);
    expect(result.lengthPx).toBeLessThan(boundingDiagonal);
  });

  it("measures width across the contour, not across a concavity", () => {
    // A V: the hull would bridge the opening and report a wide shape.
    const v: ContourPoint[] = [
      [0, 0],
      [50, 100],
      [100, 0],
      [90, 0],
      [50, 80],
      [10, 0],
    ];
    const result = feretDiameters(v)!;
    // The longest chord of this V is base-corner to apex, not base to base:
    // hypot(50, 100) = 111.8. That IS the true Feret diameter.
    expect(result.lengthPx).toBeCloseTo(Math.hypot(50, 100), 0);
    // Width is taken perpendicular to that axis, over the CONTOUR points. A
    // hull-based width would span the mouth of the V, which the shape does
    // not occupy.
    expect(result.widthPx).toBeLessThan(result.lengthPx);
    expect(result.widthPx).toBeGreaterThan(0);
  });

  it("returns null for degenerate input", () => {
    expect(feretDiameters([])).toBeNull();
    expect(feretDiameters([[1, 1]])).toBeNull();
    expect(feretDiameters([[2, 2], [2, 2], [2, 2]])).toBeNull();
  });
});

describe("convexHull", () => {
  it("drops interior points", () => {
    const square: ContourPoint[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 5],
    ];
    expect(convexHull(square)).toHaveLength(4);
  });

  it("returns short inputs unchanged", () => {
    expect(convexHull([[0, 0], [1, 1]])).toHaveLength(2);
  });
});
