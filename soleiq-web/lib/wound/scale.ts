/**
 * Pixels → millimetres, without asking the patient to put a coin in the shot.
 *
 * The questionnaire already captures shoe size, from which the app derives
 * `footLengthMm`. In a top or sole photo where the whole foot is in frame, the
 * foot's own long axis is therefore a ruler of known length lying in the same
 * plane as the wound. Wound area in mm² follows.
 *
 * The accuracy of that ruler is the accuracy of the shoe-size-to-foot-length
 * mapping and of the camera being roughly perpendicular, so every result
 * carries a reliability flag rather than pretending to caliper precision.
 * Wound *change* between visits — which is the number that actually predicts
 * healing — survives a constant scale error that cancels on both sides.
 */

import { type Mask } from "./segment";

export interface PixelScale {
  mmPerPixel: number;
  /** Foot length in pixels the scale was derived from. */
  footLengthPx: number;
  /** False when the foot touches the frame edge or looks cropped. */
  reliable: boolean;
  reason?: string;
}

export interface MaskExtent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Longest axis of the region, in pixels. */
  majorAxisPx: number;
  /** Shortest axis, in pixels. */
  minorAxisPx: number;
  centroidX: number;
  centroidY: number;
}

/**
 * Extent and principal axes of a mask, from its second moments — a foot
 * photographed at an angle in the frame still yields its true long axis.
 */
export function maskExtent(mask: Mask): MaskExtent | null {
  if (mask.count === 0) return null;
  let minX = mask.width;
  let maxX = -1;
  let minY = mask.height;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (!mask.data[i]) continue;
    const x = i % mask.width;
    const y = (i / mask.width) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    sumX += x;
    sumY += y;
  }
  const centroidX = sumX / mask.count;
  const centroidY = sumY / mask.count;

  let mxx = 0;
  let myy = 0;
  let mxy = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (!mask.data[i]) continue;
    const dx = (i % mask.width) - centroidX;
    const dy = ((i / mask.width) | 0) - centroidY;
    mxx += dx * dx;
    myy += dy * dy;
    mxy += dx * dy;
  }
  mxx /= mask.count;
  myy /= mask.count;
  mxy /= mask.count;

  // Eigenvalues of the 2×2 covariance matrix.
  const trace = mxx + myy;
  const determinant = mxx * myy - mxy * mxy;
  const gap = Math.sqrt(Math.max(trace * trace / 4 - determinant, 0));
  const major = trace / 2 + gap;
  const minor = trace / 2 - gap;
  // For a uniform ellipse, axis length = 4√λ.
  return {
    minX,
    maxX,
    minY,
    maxY,
    majorAxisPx: 4 * Math.sqrt(Math.max(major, 0)),
    minorAxisPx: 4 * Math.sqrt(Math.max(minor, 0)),
    centroidX,
    centroidY,
  };
}

/**
 * Derive mm-per-pixel from the foot silhouette and the known foot length.
 * Returns null when there is no usable foot or no known length.
 */
export function scaleFromFoot(
  foot: Mask,
  footLengthMm: number | undefined
): PixelScale | null {
  if (!footLengthMm || footLengthMm <= 0) return null;
  const extent = maskExtent(foot);
  if (!extent || extent.majorAxisPx <= 1) return null;

  // A foot running off the edge of the frame is shorter in pixels than it is
  // in life, which would silently shrink every wound measured from it.
  const margin = 2;
  const cropped =
    extent.minX <= margin ||
    extent.minY <= margin ||
    extent.maxX >= foot.width - 1 - margin ||
    extent.maxY >= foot.height - 1 - margin;

  return {
    mmPerPixel: footLengthMm / extent.majorAxisPx,
    footLengthPx: Math.round(extent.majorAxisPx),
    reliable: !cropped,
    reason: cropped
      ? "The foot runs to the edge of the photo, so its length in pixels is an underestimate and sizes may read small."
      : undefined,
  };
}
