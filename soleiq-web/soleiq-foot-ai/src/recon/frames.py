"""
Frame selection.

The reconstruction is only as good as the frames it is given, and a blurred
or blown-out frame does more harm than omitting it: it contributes bad
matches that drag the whole bundle. So frames are scored and the worst are
dropped before SfM ever sees them.

Nothing here fabricates frames. If too few survive, the caller fails the job.
"""

from __future__ import annotations

import os

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

# Below this many usable frames a reconstruction is not worth attempting;
# §3.1 of the spec sets the floor at 20.
MIN_USABLE_FRAMES = 20

# Variance of the Laplacian, measured at a FIXED analysis width.
#
# The width matters as much as the number. Laplacian variance is per-pixel
# high-frequency energy, so it falls sharply with resolution: the same 29
# frames from a real capture scored 3.1-6.5 at their native 1440px and
# 30.9-87.3 downsampled to 512px. This floor was previously applied at native
# resolution, which meant it rejected every frame of every compressed video —
# VP9 smooths exactly the detail the Laplacian measures — including frames
# that then registered 39/39 in SfM at 1.16px reprojection error.
#
# Both values are read from the same environment variables the local scan
# store uses, so there is one threshold in the system rather than two that
# disagree.
SHARPNESS_ANALYSIS_WIDTH = int(os.environ.get("SOLEIQ_ANALYSIS_WIDTH", "512"))
SHARPNESS_FLOOR = float(os.environ.get("SOLEIQ_BLUR_MIN", "15"))

# Mean luma outside this band is under- or over-exposed past recovery.
LUMA_MIN, LUMA_MAX = 25.0, 230.0


@dataclass(frozen=True)
class FrameScore:
    path: Path
    sharpness: float
    luma: float
    usable: bool
    reason: str = ""


def score_frame(path: Path) -> FrameScore:
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        return FrameScore(path, 0.0, 0.0, False, "unreadable")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Normalise resolution before measuring, so the floor means one thing
    # whatever the camera produced.
    if gray.shape[1] != SHARPNESS_ANALYSIS_WIDTH:
        h = max(1, round(gray.shape[0] * SHARPNESS_ANALYSIS_WIDTH / gray.shape[1]))
        gray = cv2.resize(gray, (SHARPNESS_ANALYSIS_WIDTH, h), interpolation=cv2.INTER_AREA)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    luma = float(gray.mean())

    if sharpness < SHARPNESS_FLOOR:
        return FrameScore(path, sharpness, luma, False, "blurred")
    if luma < LUMA_MIN:
        return FrameScore(path, sharpness, luma, False, "too dark")
    if luma > LUMA_MAX:
        return FrameScore(path, sharpness, luma, False, "over-exposed")
    return FrameScore(path, sharpness, luma, True)


def select_frames(paths: list[Path], *, max_frames: int = 60) -> list[FrameScore]:
    """
    Score every frame, keep the usable ones, and cap the count.

    The cap keeps the sharpest frames but preserves capture order, because
    sequential matching depends on neighbouring frames actually being
    neighbours in time. Sorting by sharpness and truncating would shred the
    orbit into a random subset.
    """
    scored = [score_frame(p) for p in paths]
    usable = [s for s in scored if s.usable]

    if len(usable) > max_frames:
        # Keep the max_frames sharpest, then restore capture order.
        keep = sorted(usable, key=lambda s: s.sharpness, reverse=True)[:max_frames]
        keep_paths = {s.path for s in keep}
        usable = [s for s in usable if s.path in keep_paths]

    return usable


def coverage_pct(kept: int, requested: int) -> float:
    """
    Share of the requested orbit that survived selection.

    Deliberately not a measure of angular coverage — that would need the
    poses, and this runs before SfM. `pipeline` overwrites this with a
    pose-derived figure once the poses exist.
    """
    if requested <= 0:
        return 0.0
    return round(min(100.0, 100.0 * kept / requested), 1)
