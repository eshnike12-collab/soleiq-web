"""
Fiducial scale must be a measurement, not a plausible-looking number. These
render markers at a known pixel size and check the recovered mm-per-pixel
against the value arithmetic says it must be.
"""

import cv2
import numpy as np
import pytest

from src.recon.fiducial import (
    ID1_LONG_EDGE_MM,
    MIN_DETECTIONS,
    detect_scale,
)


def write_marker(path, marker_px: int, canvas_px: int = 900, marker_id: int = 7):
    """A marker of exactly `marker_px` on a side, centred on white."""
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker = cv2.aruco.generateImageMarker(d, marker_id, marker_px)
    canvas = np.full((canvas_px, canvas_px), 255, dtype=np.uint8)
    off = (canvas_px - marker_px) // 2
    canvas[off:off + marker_px, off:off + marker_px] = marker
    cv2.imwrite(str(path), canvas)
    return path


def test_recovers_a_known_scale(tmp_path):
    """400px of marker representing 85.60mm is 0.214 mm/px, exactly."""
    marker_px = 400
    paths = [
        write_marker(tmp_path / f"f{i}.png", marker_px) for i in range(MIN_DETECTIONS)
    ]
    result = detect_scale(paths)
    assert result is not None
    expected = ID1_LONG_EDGE_MM / marker_px
    # 2% tolerance: the detector's corners land on the marker's outer edge to
    # within a pixel or so at this size.
    assert result.mm_per_px == pytest.approx(expected, rel=0.02)
    assert result.method == "aruco_id1"


def test_scale_tracks_marker_size(tmp_path):
    """A marker twice as large in pixels must halve the mm-per-pixel."""
    small = [write_marker(tmp_path / f"s{i}.png", 200) for i in range(MIN_DETECTIONS)]
    large = [write_marker(tmp_path / f"l{i}.png", 400) for i in range(MIN_DETECTIONS)]
    a, b = detect_scale(small), detect_scale(large)
    assert a and b
    assert a.mm_per_px == pytest.approx(2 * b.mm_per_px, rel=0.03)


def test_uncertainty_is_small_when_detections_agree(tmp_path):
    paths = [write_marker(tmp_path / f"f{i}.png", 400) for i in range(5)]
    result = detect_scale(paths)
    assert result is not None
    # Identical renders should agree almost exactly; this is the floor, and a
    # real capture will be worse.
    assert result.uncertainty_pct < 1.0
    assert result.detections == 5


def test_returns_none_when_no_marker_is_present(tmp_path):
    """The load-bearing contract: no marker means no scale, never a guess."""
    for i in range(4):
        cv2.imwrite(str(tmp_path / f"b{i}.png"), np.full((600, 600), 200, np.uint8))
    assert detect_scale(list(tmp_path.glob("*.png"))) is None


def test_refuses_a_single_uncorroborated_detection(tmp_path):
    """One detection has nothing to be outvoted by, so it is not trusted."""
    paths = [write_marker(tmp_path / "only.png", 400)]
    assert detect_scale(paths) is None


def test_survives_unreadable_files(tmp_path):
    (tmp_path / "broken.png").write_bytes(b"not an image")
    paths = [write_marker(tmp_path / f"f{i}.png", 400) for i in range(MIN_DETECTIONS)]
    assert detect_scale(paths + [tmp_path / "broken.png"]) is not None
