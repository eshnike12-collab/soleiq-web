"""
Measurement from a mask, against shapes of exactly known size.

Synthetic geometry, so ground truth is arithmetic rather than another
estimate. This validates the maths only — field accuracy needs printed
phantoms photographed at varied distance and angle.
"""

import cv2
import numpy as np
import pytest

from src.seg.measure import measure_mask


def disc(d_px: int, canvas: int = 400) -> np.ndarray:
    m = np.zeros((canvas, canvas), np.uint8)
    cv2.circle(m, (canvas // 2, canvas // 2), d_px // 2, 1, -1)
    return m


def rect(w: int, h: int, canvas: int = 400) -> np.ndarray:
    m = np.zeros((canvas, canvas), np.uint8)
    x, y = (canvas - w) // 2, (canvas - h) // 2
    cv2.rectangle(m, (x, y), (x + w, y + h), 1, -1)
    return m


MM_PER_PX = 0.2  # a 400px frame covering 80mm


def test_disc_area_matches_geometry():
    r = measure_mask(disc(200), MM_PER_PX)
    assert r is not None
    true_mm2 = np.pi * (100 * MM_PER_PX) ** 2
    assert r.area_mm2 == pytest.approx(true_mm2, rel=0.02)


def test_disc_length_and_width_are_the_diameter():
    r = measure_mask(disc(200), MM_PER_PX)
    d_mm = 200 * MM_PER_PX
    assert r.length_mm == pytest.approx(d_mm, rel=0.03)
    assert r.width_mm == pytest.approx(d_mm, rel=0.03)


def test_rectangle_length_is_the_diagonal_not_the_side():
    """Max Feret is the longest line at ANY angle — for a rectangle, the
    diagonal. Getting the side instead is the classic implementation slip."""
    w, h = 200, 100
    r = measure_mask(rect(w, h), MM_PER_PX)
    diagonal_mm = np.hypot(w, h) * MM_PER_PX
    assert r.length_mm == pytest.approx(diagonal_mm, rel=0.03)


def test_area_is_planimetric_not_length_times_width():
    """A disc's true area is pi*r^2; length*width would give the bounding
    square, ~27% larger. Manual methods overestimate for exactly this reason."""
    r = measure_mask(disc(200), MM_PER_PX)
    bounding = r.length_mm * r.width_mm
    assert r.area_mm2 < bounding * 0.85


def test_scale_doubling_quadruples_area():
    a = measure_mask(disc(100), MM_PER_PX)
    b = measure_mask(disc(200), MM_PER_PX)
    assert b.area_mm2 / a.area_mm2 == pytest.approx(4.0, rel=0.05)


def test_no_scale_means_no_millimetres():
    """The load-bearing contract. Relative area survives; absolutes do not."""
    r = measure_mask(disc(200), None)
    assert r.area_mm2 is None and r.length_mm is None and r.width_mm is None
    assert r.area_px > 0 and r.area_frac > 0


def test_speckle_is_rejected():
    m = np.zeros((400, 400), np.uint8)
    for x, y in [(50, 50), (120, 200), (300, 90), (210, 330)]:
        cv2.circle(m, (x, y), 2, 1, -1)
    assert measure_mask(m, MM_PER_PX) is None


def test_largest_region_wins_and_satellites_are_not_merged():
    m = disc(160)
    cv2.circle(m, (60, 60), 20, 1, -1)  # satellite lesion
    r = measure_mask(m, MM_PER_PX)
    # Measures the main wound only — a merged blob would span the gap and
    # report a length far larger than either region.
    assert r.length_mm == pytest.approx(160 * MM_PER_PX, rel=0.06)
