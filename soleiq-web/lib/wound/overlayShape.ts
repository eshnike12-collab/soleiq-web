import type { ContourPoint } from "./contour";

/**
 * Turning a detection into something drawable.
 *
 * THE RECTANGLE IS GONE AND MUST NOT COME BACK. A hard-cornered box over
 * someone's foot reads as a machine asserting a boundary it has not actually
 * found — and when the box is merely the model's rough region, that assertion
 * is false. There are three honest states and each looks different:
 *
 *   traced       a real segmented outline        solid stroke
 *   approximate  only a region, so a soft blob   dashed stroke
 *   none         nothing to draw                 no overlay at all
 */

export type ShapeConfidence = "traced" | "approximate";

/** An SVG path `d` in 0..1 coordinates, plus how much to trust it. */
export interface OverlayShape {
  d: string;
  confidence: ShapeConfidence;
  /** Centre, for placing a label. */
  centre: [number, number];
}

/** Closed path through the points, straight segments. */
function pathOf(points: ContourPoint[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return (
    `M ${first[0].toFixed(4)} ${first[1].toFixed(4)} ` +
    rest.map((p) => `L ${p[0].toFixed(4)} ${p[1].toFixed(4)}`).join(" ") +
    " Z"
  );
}

function centroid(points: ContourPoint[]): [number, number] {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point[0];
    y += point[1];
  }
  return [x / points.length, y / points.length];
}

/**
 * A rounded blob inscribed in a box.
 *
 * Used when the model gave a region but segmentation found no border. It is
 * drawn DASHED and labelled "approximate area", because the only honest claim
 * here is "somewhere around here" — and a soft shape says that where a
 * rectangle would imply a measured edge.
 *
 * Inscribed rather than circumscribed: it stays inside the region the model
 * named instead of spilling onto skin the model said nothing about.
 */
export function blobInBox(
  x: number,
  y: number,
  w: number,
  h: number,
  points = 24
): ContourPoint[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = (w / 2) * 0.92;
  const ry = (h / 2) * 0.92;
  const ring: ContourPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    // A gentle, fixed wobble so it reads as organic rather than as a
    // geometric ellipse — deterministic, so it does not shimmer on re-render.
    const wobble = 1 + 0.06 * Math.sin(t * 3) + 0.035 * Math.cos(t * 5);
    ring.push([cx + Math.cos(t) * rx * wobble, cy + Math.sin(t) * ry * wobble]);
  }
  return ring;
}

/**
 * The shape to draw for a detection, or null when there is nothing honest to
 * draw.
 */
export function shapeFor(detection: {
  contour?: ContourPoint[] | null;
  polygon?: ContourPoint[];
}): OverlayShape | null {
  if (detection.contour && detection.contour.length >= 3) {
    return {
      d: pathOf(detection.contour),
      confidence: "traced",
      centre: centroid(detection.contour),
    };
  }

  const box = detection.polygon;
  if (!box || box.length < 4) return null;
  const xs = box.map(([x]) => x);
  const ys = box.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  if (w <= 0 || h <= 0) return null;

  const blob = blobInBox(minX, minY, w, h);
  return {
    d: pathOf(blob),
    confidence: "approximate",
    centre: [minX + w / 2, minY + h / 2],
  };
}

/**
 * The size caption, in units the measurement actually supports.
 *
 * Millimetres only when a scale exists AND it is reliable. Otherwise pixels,
 * which need no calibration and cannot be mistaken for a ruler reading.
 * Never a millimetre figure dressed up as measured.
 */
export function sizeLabel(detection: {
  lengthMm?: number | null;
  widthMm?: number | null;
  lengthPx?: number;
  widthPx?: number;
  scaleReliable?: boolean;
}): string | null {
  const { lengthMm, widthMm, lengthPx, widthPx, scaleReliable } = detection;
  if (scaleReliable && lengthMm != null && widthMm != null) {
    return `${Math.round(lengthMm)} × ${Math.round(widthMm)} mm`;
  }
  if (lengthMm != null && widthMm != null) {
    // Scaled, but from a foot outline we do not trust. Say so.
    return `≈ ${Math.round(lengthMm)} × ${Math.round(widthMm)} mm`;
  }
  if (lengthPx && widthPx) {
    return `${lengthPx} × ${widthPx} px`;
  }
  return null;
}
