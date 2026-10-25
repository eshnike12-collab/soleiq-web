import { describe, expect, it } from "vitest";
import { chaikin, contourOf, douglasPeucker, simplifyClosed } from "@/lib/wound/contour";
import { emptyMask, type Mask } from "@/lib/wound/segment";

/** Build a mask from a predicate, so each test states its shape in one line. */
function maskOf(
  width: number,
  height: number,
  inside: (x: number, y: number) => boolean
): Mask {
  const mask = emptyMask(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (inside(x, y)) {
        mask.data[y * width + x] = 1;
        mask.count++;
      }
    }
  }
  return mask;
}

/** Contours come back normalised; these helpers read them in pixels. */
const bounds = (ring: [number, number][], w: number, h: number) => {
  const xs = ring.map(([x]) => x * w);
  const ys = ring.map(([, y]) => y * h);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const area = (ring: [number, number][], w: number, h: number) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    sum += ax * w * (by * h) - bx * w * (ay * h);
  }
  return Math.abs(sum / 2);
};

describe("contourOf — circle", () => {
  const W = 120;
  const H = 120;
  const R = 30;
  const mask = maskOf(W, H, (x, y) => Math.hypot(x - 60, y - 60) <= R);

  it("returns a closed ring", () => {
    const ring = contourOf(mask)!;
    expect(ring).not.toBeNull();
    expect(ring.length).toBeGreaterThanOrEqual(3);
  });

  it("is normalised to 0..1", () => {
    const ring = contourOf(mask)!;
    for (const [x, y] of ring) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it("hugs the real circle rather than its bounding box", () => {
    const ring = contourOf(mask)!;
    // A box would enclose (2R)^2 = 3600; the circle is πR² ≈ 2827.
    expect(area(ring, W, H)).toBeGreaterThan(Math.PI * R * R * 0.85);
    expect(area(ring, W, H)).toBeLessThan(Math.PI * R * R * 1.15);
  });

  it("spans the circle's extent in both axes", () => {
    const b = bounds(contourOf(mask)!, W, H);
    expect(b.maxX - b.minX).toBeGreaterThan(2 * R * 0.9);
    expect(b.maxY - b.minY).toBeGreaterThan(2 * R * 0.9);
  });

  it("simplifies to far fewer points than boundary pixels", () => {
    // The raw boundary is ~190 pixels; a usable SVG path is tens of points.
    expect(contourOf(mask)!.length).toBeLessThan(80);
  });
});

describe("contourOf — ellipse", () => {
  const W = 200;
  const H = 120;
  const mask = maskOf(
    W,
    H,
    (x, y) => ((x - 100) / 70) ** 2 + ((y - 60) / 25) ** 2 <= 1
  );

  it("keeps the long axis long and the short axis short", () => {
    const b = bounds(contourOf(mask)!, W, H);
    const width = b.maxX - b.minX;
    const height = b.maxY - b.minY;
    expect(width).toBeGreaterThan(2 * 70 * 0.9);
    expect(height).toBeLessThan(2 * 25 * 1.2);
    expect(width / height).toBeGreaterThan(2);
  });
});

describe("contourOf — concave blob", () => {
  const W = 160;
  const H = 160;
  // A crescent: the concavity is the point of this test.
  const mask = maskOf(
    W,
    H,
    (x, y) => Math.hypot(x - 80, y - 80) <= 45 && Math.hypot(x - 100, y - 80) > 32
  );

  it("follows the concavity instead of filling it in", () => {
    const ring = contourOf(mask)!;
    const traced = area(ring, W, H);
    const filled = Math.PI * 45 * 45;
    // A convex hull would be close to the full disc; the crescent is much
    // smaller. This is the property a bounding box destroys.
    expect(traced).toBeLessThan(filled * 0.8);
  });

  it("still returns a single ring", () => {
    expect(contourOf(mask)!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("contourOf — rejection", () => {
  it("returns null for an empty mask", () => {
    expect(contourOf(emptyMask(50, 50))).toBeNull();
  });

  it("returns null for a speck below the perimeter floor", () => {
    // 2x2 pixels: perimeter 8, under the 20px floor.
    const mask = maskOf(50, 50, (x, y) => x >= 10 && x < 12 && y >= 10 && y < 12);
    expect(contourOf(mask)).toBeNull();
  });

  it("traces only the largest component when several exist", () => {
    const W = 200;
    const H = 100;
    const mask = maskOf(
      W,
      H,
      (x, y) =>
        Math.hypot(x - 50, y - 50) <= 30 || Math.hypot(x - 160, y - 50) <= 12
    );
    const b = bounds(contourOf(mask)!, W, H);
    // The ring must sit on the big blob, not span the gap to the small one.
    expect(b.maxX).toBeLessThan(120);
  });
});

describe("chaikin", () => {
  it("doubles the point count per pass and rounds corners", () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(chaikin(square, 1)).toHaveLength(8);
    expect(chaikin(square, 2)).toHaveLength(16);
  });

  it("stays inside the convex hull of the input", () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    for (const [x, y] of chaikin(square, 3)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(10);
    }
  });
});

describe("douglas-peucker", () => {
  it("collapses a straight line to its endpoints", () => {
    const line: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    expect(douglasPeucker(line, 0.1)).toEqual([
      [0, 0],
      [4, 0],
    ]);
  });

  it("keeps a corner that carries shape", () => {
    const bend: [number, number][] = [
      [0, 0],
      [5, 5],
      [10, 0],
    ];
    expect(douglasPeucker(bend, 0.1)).toHaveLength(3);
  });

  it("drops a deviation smaller than epsilon", () => {
    const nearly: [number, number][] = [
      [0, 0],
      [5, 0.05],
      [10, 0],
    ];
    expect(douglasPeucker(nearly, 0.5)).toHaveLength(2);
  });

  it("leaves a closed ring closed", () => {
    const ring: [number, number][] = Array.from({ length: 40 }, (_, i) => {
      const t = (i / 40) * Math.PI * 2;
      return [Math.cos(t) * 10, Math.sin(t) * 10] as [number, number];
    });
    const simplified = simplifyClosed(ring, 0.5);
    expect(simplified.length).toBeGreaterThanOrEqual(3);
    expect(simplified.length).toBeLessThan(ring.length);
  });
});
