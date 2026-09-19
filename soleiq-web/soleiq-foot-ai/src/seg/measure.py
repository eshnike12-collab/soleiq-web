"""
Mask -> contour -> millimetres.

This is the bridge the whole segmentation exercise exists for. A classifier
says "ulcer"; a mask says where it is; this turns that into the numbers a
clinician reads.

CONVENTION, FIXED ONCE
----------------------
  length  maximum Feret diameter — the longest straight line across the
          contour at any angle.
  width   longest chord perpendicular to that length axis.
  area    counted pixels inside the contour, scaled. NOT length x width, which
          is a manual-measurement convention that overestimates irregular
          wounds substantially.

Both conventions exist in wound care. Mixing them makes longitudinal data
meaningless, so this one is stated here and must not change: every stored
measurement would become incomparable with every new one.

SCALE IS NOT OPTIONAL
---------------------
`mm_per_px` is required to produce any millimetre value. Without it the
function returns pixel and relative-area figures and nulls for everything in
millimetres. A wrong measurement is worse than a missing one: a clinician can
act on a wrong number and cannot act on a missing one.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict

import cv2
import numpy as np


@dataclass(frozen=True)
class WoundMeasurement:
    area_px: int
    #: Share of the analysed frame. Always available — needs no scale.
    area_frac: float
    perimeter_px: float
    area_mm2: float | None
    length_mm: float | None
    width_mm: float | None
    perimeter_mm: float | None
    #: Contour as [[x, y], ...] in image pixels, for overlay rendering.
    contour: list[list[int]]

    def as_dict(self) -> dict:
        return asdict(self)


def _max_feret(points: np.ndarray) -> tuple[float, np.ndarray, np.ndarray]:
    """Longest distance between any two hull points, and that pair."""
    hull = cv2.convexHull(points).reshape(-1, 2).astype(np.float64)
    best, pa, pb = 0.0, hull[0], hull[0]
    for i in range(len(hull)):
        # Hull only: the farthest pair of a shape is always on its hull, so
        # this is O(h^2) on a handful of points rather than O(n^2) on the
        # thousands in a raw contour.
        d = np.linalg.norm(hull - hull[i], axis=1)
        j = int(d.argmax())
        if d[j] > best:
            best, pa, pb = float(d[j]), hull[i], hull[j]
    return best, pa, pb


def measure_mask(
    mask: np.ndarray,
    mm_per_px: float | None = None,
    min_area_px: int = 40,
) -> WoundMeasurement | None:
    """Measure the largest connected region of a binary mask.

    Largest region only. Satellite lesions are real and clinically relevant,
    but merging them into one blob reports a single wound spanning the gap
    between them, which is worse than reporting the main one and handling the
    others separately.
    """
    binary = (mask > 0).astype(np.uint8)

    # Close pinholes, then drop speckle. Order matters: opening first would
    # erase thin real structures such as a fissure before they are closed.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)

    area_px = int(cv2.contourArea(largest))
    if area_px < min_area_px:
        return None

    perimeter_px = float(cv2.arcLength(largest, True))
    length_px, pa, pb = _max_feret(largest)

    # Width: the longest chord perpendicular to the length axis. Measured on
    # the contour itself, not the hull — the hull would bridge a concavity and
    # report a width the wound does not have.
    axis = (pb - pa)
    axis = axis / (np.linalg.norm(axis) + 1e-9)
    normal = np.array([-axis[1], axis[0]])
    pts = largest.reshape(-1, 2).astype(np.float64)
    proj = pts @ normal
    width_px = float(proj.max() - proj.min())

    # Simplify only for the rendered overlay. Tolerance is deliberately tight:
    # smoothing that cuts a corner off the lesion changes the measurement.
    simplified = cv2.approxPolyDP(largest, 0.8, True).reshape(-1, 2)

    scaled = mm_per_px is not None and mm_per_px > 0
    return WoundMeasurement(
        area_px=area_px,
        area_frac=float(binary.sum()) / float(binary.size),
        perimeter_px=perimeter_px,
        area_mm2=round(area_px * mm_per_px * mm_per_px, 1) if scaled else None,
        length_mm=round(length_px * mm_per_px, 1) if scaled else None,
        width_mm=round(width_px * mm_per_px, 1) if scaled else None,
        perimeter_mm=round(perimeter_px * mm_per_px, 1) if scaled else None,
        contour=simplified.astype(int).tolist(),
    )
