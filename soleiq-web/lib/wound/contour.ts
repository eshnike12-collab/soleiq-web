import type { Mask } from "./segment";
import { connectedComponents, maskFromIndices } from "./segment";

/**
 * The outline of a segmented change, as a smooth closed ring.
 *
 * Replaces the four-corner rectangle that used to be drawn over a finding.
 * A box says "somewhere in here"; a patient comparing two visits needs to see
 * the shape itself, because that is what changes first — a wound closes from
 * its edges inward long before its bounding box moves.
 *
 * Three stages, each doing one job:
 *
 *   MARCHING SQUARES walks the boundary BETWEEN pixels rather than along
 *   their centres, so the ring hugs the region rather than sitting a half
 *   pixel outside it.
 *
 *   CHAIKIN corner-cutting removes the 90-degree staircase that any
 *   pixel-grid boundary has. Two iterations: one still looks angular, three
 *   starts rounding off real detail like the notch of a fissure.
 *
 *   DOUGLAS-PEUCKER then drops the points that carry no shape, so the SVG
 *   path is tens of points rather than thousands.
 *
 * Coordinates come back normalised to 0..1 so the overlay is independent of
 * the resolution the photo happened to be analysed at.
 */

export type ContourPoint = [number, number];

/** Rings shorter than this are noise, not a finding. */
const MIN_PERIMETER_PX = 20;

/** Simplification tolerance, as a fraction of the image diagonal. */
const SIMPLIFY_EPSILON_FRACTION = 0.004;

const CHAIKIN_ITERATIONS = 2;

/**
 * The outer ring of the mask's largest component, normalised to 0..1.
 * Null when there is nothing big enough to be worth outlining.
 */
export function contourOf(mask: Mask): ContourPoint[] | null {
  if (mask.count === 0) return null;

  const components = connectedComponents(mask);
  if (components.length === 0) return null;
  // Largest only. Satellite lesions are real, but merging them into one ring
  // would draw an outline spanning the healthy skin between them.
  const largest = components.reduce((best, c) => (c.length > best.length ? c : best));
  const isolated = maskFromIndices(largest, mask.width, mask.height);

  const ring = marchingSquares(isolated);
  if (!ring) return null;

  if (perimeter(ring) < MIN_PERIMETER_PX) return null;

  const diagonal = Math.hypot(mask.width, mask.height);
  const smoothed = chaikin(ring, CHAIKIN_ITERATIONS);
  const simplified = simplifyClosed(
    smoothed,
    diagonal * SIMPLIFY_EPSILON_FRACTION
  );

  // A ring needs three points to enclose anything.
  if (simplified.length < 3) return null;

  return simplified.map(
    ([x, y]) => [x / mask.width, y / mask.height] as ContourPoint
  );
}

/* ── Stage 1: boundary ─────────────────────────────────────────────────── */

/**
 * Marching squares over the mask's corner lattice.
 *
 * Walks vertices of the pixel grid. At each vertex the four surrounding cells
 * give a 4-bit state, and the state says which way the boundary continues.
 * The two ambiguous states (6 and 9) are saddles — two diagonal cells set —
 * and are resolved by where we came from, which keeps the walk on one ring
 * instead of jumping between two that touch at a corner.
 */
function marchingSquares(mask: Mask): ContourPoint[] | null {
  const { width, height, data } = mask;
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : data[y * width + x];

  // Vertex (x, y) sits at the top-left corner of cell (x, y).
  const stateAt = (x: number, y: number): number =>
    at(x - 1, y - 1) * 1 + at(x, y - 1) * 2 + at(x - 1, y) * 4 + at(x, y) * 8;

  // Start at the first vertex with a boundary through it.
  let startX = -1;
  let startY = -1;
  outer: for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      const s = stateAt(x, y);
      if (s !== 0 && s !== 15) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return null;

  const points: ContourPoint[] = [];
  let x = startX;
  let y = startY;
  let previous: "up" | "down" | "left" | "right" | null = null;
  // A ring cannot be longer than the lattice has vertices; the cap stops a
  // malformed state table from spinning forever.
  const limit = (width + 2) * (height + 2) * 4;

  for (let step = 0; step < limit; step++) {
    points.push([x, y]);
    const state = stateAt(x, y);
    let move: "up" | "down" | "left" | "right";

    switch (state) {
      case 1:
      case 5:
      case 13:
        move = "up";
        break;
      case 2:
      case 3:
      case 7:
        move = "right";
        break;
      case 4:
      case 12:
      case 14:
        move = "left";
        break;
      case 8:
      case 10:
      case 11:
        move = "down";
        break;
      case 6:
        // Saddle: arriving from above continues left, otherwise right.
        move = previous === "up" ? "left" : "right";
        break;
      case 9:
        move = previous === "right" ? "up" : "down";
        break;
      default:
        // 0 or 15 — off the boundary entirely. Should be unreachable.
        return points.length >= 3 ? points : null;
    }

    if (move === "up") y -= 1;
    else if (move === "down") y += 1;
    else if (move === "left") x -= 1;
    else x += 1;
    previous = move;

    if (x === startX && y === startY) break;
  }

  return points.length >= 3 ? points : null;
}

function perimeter(ring: ContourPoint[]): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    total += Math.hypot(bx - ax, by - ay);
  }
  return total;
}

/* ── Stage 2: smoothing ────────────────────────────────────────────────── */

/**
 * Chaikin corner cutting on a closed ring.
 *
 * Each segment is replaced by its quarter and three-quarter points, which
 * rounds every corner without pulling the outline away from the region — the
 * result stays inside the convex hull of the input.
 */
export function chaikin(ring: ContourPoint[], iterations: number): ContourPoint[] {
  let current = ring;
  for (let pass = 0; pass < iterations; pass++) {
    if (current.length < 3) return current;
    const next: ContourPoint[] = [];
    for (let i = 0; i < current.length; i++) {
      const [ax, ay] = current[i];
      const [bx, by] = current[(i + 1) % current.length];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    current = next;
  }
  return current;
}

/* ── Stage 3: simplification ───────────────────────────────────────────── */

function perpendicularDistance(
  point: ContourPoint,
  a: ContourPoint,
  b: ContourPoint
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared;
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(
    point[0] - (a[0] + clamped * dx),
    point[1] - (a[1] + clamped * dy)
  );
}

export function douglasPeucker(
  points: ContourPoint[],
  epsilon: number
): ContourPoint[] {
  if (points.length <= 2) return points;
  let worst = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > worst) {
      worst = distance;
      index = i;
    }
  }
  if (worst <= epsilon) return [first, last];
  const left = douglasPeucker(points.slice(0, index + 1), epsilon);
  const right = douglasPeucker(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

/**
 * Douglas-Peucker on a closed ring.
 *
 * Split at two far-apart anchors before simplifying. Running it on the raw
 * sequence would treat the ring as an open line whose ends happen to meet,
 * and the join would be pinned while the rest relaxed — leaving a visible
 * kink at whichever pixel the trace happened to start from.
 */
export function simplifyClosed(
  ring: ContourPoint[],
  epsilon: number
): ContourPoint[] {
  if (ring.length <= 4) return ring;
  const half = Math.floor(ring.length / 2);
  const firstHalf = douglasPeucker([...ring.slice(0, half + 1)], epsilon);
  const secondHalf = douglasPeucker(
    [...ring.slice(half), ring[0]],
    epsilon
  );
  return [...firstHalf.slice(0, -1), ...secondHalf.slice(0, -1)];
}
