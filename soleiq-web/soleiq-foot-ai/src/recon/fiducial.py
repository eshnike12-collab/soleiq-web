"""
Metric scale from a fiducial marker.

WHY
---
Scale today comes from `from_foot_length(extent, foot_length_mm)`, where the
foot length is derived from the patient's self-reported shoe size. That is an
anthropometric guess, and quality.json already concedes it by reporting
`scaleUncertaintyPct: 100.0`. Every millimetre the product prints inherits
that guess.

A marker of known physical size in the same frame replaces the guess with a
measurement. The reference is ISO/IEC 7810 ID-1 — the credit-card format,
85.60mm x 53.98mm — because every patient already owns one and nobody needs a
printer.

WHAT THIS DOES AND DOES NOT GIVE YOU
------------------------------------
It gives scale IN THE MARKER'S PLANE. If the card lies flat beside the foot
and the camera looks roughly down at both, the foot is close enough to that
plane for the scale to hold. A card propped at an angle, or lying far below
the part of the foot being measured, introduces perspective error this cannot
see. So the uncertainty reported here is the spread across detections, which
captures noise and mild perspective — it is not a claim about a card someone
stood upright.

The contract that must not be broken: when no marker is found and no foot
length was supplied, scale stays `unscaled` and the client shows no
measurements at all. A wrong millimetre reading is worse than none.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

log = logging.getLogger("soleiq.recon.fiducial")

#: ISO/IEC 7810 ID-1, the credit-card format. The long edge is the reference.
ID1_LONG_EDGE_MM = 85.60
ID1_SHORT_EDGE_MM = 53.98

#: 4x4 is the most robust small dictionary at phone-camera resolutions: fewer
#: bits per marker means fewer bits to misread when the card is at an angle.
_DICT = cv2.aruco.DICT_4X4_50

#: Below this many independent detections the consensus is not worth trusting;
#: one bad detection out of two has nothing to be outvoted by.
MIN_DETECTIONS = 3


@dataclass(frozen=True)
class FiducialScale:
    mm_per_px: float
    #: Relative spread across detections, as a percentage. Reported to the
    #: client as scaleUncertaintyPct — a real measurement, not a placeholder.
    uncertainty_pct: float
    detections: int
    marker_length_mm: float

    @property
    def method(self) -> str:
        return "aruco_id1"


def _detector() -> "cv2.aruco.ArucoDetector":
    params = cv2.aruco.DetectorParameters()
    # Corner refinement is what turns a 1-2px corner estimate into a sub-pixel
    # one, and scale is computed directly from corner distances — so this is
    # the difference between ~2% and ~0.3% error on the marker edge.
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
    return cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(_DICT), params)


def _edge_lengths_px(corners: np.ndarray) -> list[float]:
    """The four side lengths of one detected marker, in pixels."""
    pts = corners.reshape(4, 2)
    return [
        float(np.linalg.norm(pts[i] - pts[(i + 1) % 4])) for i in range(4)
    ]


def detect_scale(
    image_paths: list[Path],
    marker_length_mm: float = ID1_LONG_EDGE_MM,
) -> FiducialScale | None:
    """Median mm-per-pixel across every frame the marker was found in.

    Median rather than mean on purpose: a marker seen edge-on in one frame
    produces a wildly short edge and would drag a mean with it. Returns None
    when the marker is absent or seen too few times to cross-check — the
    caller must then fall back, and must not invent a scale.
    """
    detector = _detector()
    samples: list[float] = []

    for path in image_paths:
        image = cv2.imread(str(path))
        if image is None:
            continue
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        corners, ids, _ = detector.detectMarkers(gray)
        if ids is None or len(corners) == 0:
            continue
        for marker in corners:
            edges = _edge_lengths_px(marker)
            # A square marker's four edges should agree; when they do not, the
            # card is steeply tilted and this frame's scale is not reliable.
            longest, shortest = max(edges), min(edges)
            if longest <= 0 or shortest / longest < 0.7:
                continue
            samples.append(marker_length_mm / float(np.mean(edges)))

    if len(samples) < MIN_DETECTIONS:
        log.info(
            "fiducial: %d usable detection(s) across %d frames — need %d, "
            "falling back",
            len(samples), len(image_paths), MIN_DETECTIONS,
        )
        return None

    arr = np.asarray(samples, dtype=np.float64)
    median = float(np.median(arr))
    # Median absolute deviation, scaled to a standard-deviation equivalent.
    # Robust to the one frame where a corner was misplaced, which a plain
    # stdev is not.
    mad = float(np.median(np.abs(arr - median))) * 1.4826
    uncertainty_pct = float(100.0 * mad / median) if median > 0 else 100.0

    log.info(
        "fiducial: %d detections, %.4f mm/px, +/-%.2f%%",
        len(samples), median, uncertainty_pct,
    )
    return FiducialScale(
        mm_per_px=median,
        uncertainty_pct=round(uncertainty_pct, 2),
        detections=len(samples),
        marker_length_mm=marker_length_mm,
    )
