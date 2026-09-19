"""
Metric scale.

SfM reconstructs up to an unknown similarity: the geometry is right, the size
is arbitrary. Something of known size in the scene, or a known dimension of
the subject, is what fixes it.

Two supported methods, and the difference matters clinically:

  fiducial        an ArUco marker or an ISO/IEC 7810 ID-1 card
                  (85.60 x 53.98 mm) was detected and measured. Tight
                  uncertainty; measurements derived from it may be presented
                  as measured.
  anthropometric  no marker; scale inferred from the patient's own recorded
                  foot length. That figure is self-reported, so everything
                  downstream is an estimate and must be labelled as one.

A reconstruction with neither is returned unscaled and the caller must not
display any millimetre figure from it.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

# ISO/IEC 7810 ID-1 — bank card, driving licence. The long edge.
ID1_CARD_LONG_EDGE_MM = 85.60

# Self-reported shoe size maps to foot length with real spread: sizing is not
# standardised across brands and people misreport. 5% (1 sigma) is a fair,
# slightly generous figure and it is what the UI shows as the uncertainty.
ANTHROPOMETRIC_UNCERTAINTY_PCT = 5.0

# A detected fiducial is limited by corner localisation, not by self-report.
FIDUCIAL_UNCERTAINTY_PCT = 1.0


@dataclass(frozen=True)
class ScaleEstimate:
    """Multiply reconstruction units by `mm_per_unit` to get millimetres."""

    mm_per_unit: float
    method: str            # "fiducial" | "anthropometric"
    uncertainty_pct: float
    detail: str


def from_foot_length(
    reconstruction_extent_units: float, foot_length_mm: float
) -> ScaleEstimate:
    """
    Anthropometric scale: the model's longest axis is the foot.

    Only valid when the reconstruction has already been cropped to the foot —
    otherwise the longest axis is the floor and the scale is nonsense. The
    caller is responsible for that ordering.
    """
    if reconstruction_extent_units <= 0:
        raise ValueError("reconstruction extent must be positive")
    if not (150.0 <= foot_length_mm <= 350.0):
        raise ValueError(
            f"foot length {foot_length_mm} mm is outside the plausible adult range"
        )
    return ScaleEstimate(
        mm_per_unit=foot_length_mm / reconstruction_extent_units,
        method="anthropometric",
        uncertainty_pct=ANTHROPOMETRIC_UNCERTAINTY_PCT,
        detail=f"scaled to a self-reported foot length of {foot_length_mm:.0f} mm",
    )


def detect_aruco_edge_px(image_path: Path) -> float | None:
    """Longest edge, in pixels, of the first ArUco marker found. None if absent."""
    img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    try:
        adict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        detector = cv2.aruco.ArucoDetector(adict, cv2.aruco.DetectorParameters())
        corners, ids, _ = detector.detectMarkers(img)
    except AttributeError:
        # opencv built without the aruco contrib module.
        return None
    if ids is None or len(corners) == 0:
        return None
    c = corners[0].reshape(4, 2)
    edges = [float(np.linalg.norm(c[i] - c[(i + 1) % 4])) for i in range(4)]
    return max(edges)
