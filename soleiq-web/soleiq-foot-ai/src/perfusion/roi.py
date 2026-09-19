"""Foot region-of-interest segmentation and sub-ROI tiling.

Deliberately classical: a skin-colour threshold in YCrCb (intersected with
loose HSV guards), morphological cleanup, largest connected component,
hole filling. Phase 0 is a feasibility test for the *signal*, and a learned
segmenter here would only confound the question — if the pulse is not
recoverable from a hand-drawn-quality mask, a better mask will not save it.

Two decisions worth calling out:

1. **The mask is computed once for the clip, not per frame.** A per-frame
   mask flickers at the boundary as skin pixels cross the threshold, and
   that flicker is itself periodic-ish. Averaging RGB over a wobbling
   support injects a spurious oscillation into the very trace we are
   testing for oscillation. The mask here is a majority vote over frames
   sampled across the whole clip, so the support is fixed for all T.

2. **The colour range is copied verbatim from src/data/quality_gate.py.**
   Those bounds were widened from the classic 2000s Cr 135-180 / Cb 85-135
   range specifically because the narrow version is biased against darker
   skin tones. ROI and the photo quality gate must agree on what counts as
   skin, or a photo can pass the gate and then yield 0% ROI coverage.

Tiles exist because a single global waveform cannot localise anything. An
8x8 grid over the foot bounding box gives a per-region trace, which is what
a perfusion *map* is eventually built from.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple

import cv2
import numpy as np


@dataclass
class Tile:
    """One sub-ROI cell of the foot bounding-box grid."""

    row: int
    col: int
    y0: int
    y1: int
    x0: int
    x1: int
    mask: np.ndarray            # [y1-y0, x1-x0] bool, tile-local
    n_pixels: int               # foot pixels inside the tile
    fill_fraction: float        # n_pixels / tile area

    @property
    def center(self) -> Tuple[float, float]:
        return ((self.y0 + self.y1) / 2.0, (self.x0 + self.x1) / 2.0)

    def to_dict(self) -> dict:
        return {
            "row": self.row,
            "col": self.col,
            "bbox": [self.x0, self.y0, self.x1, self.y1],
            "n_pixels": int(self.n_pixels),
            "fill_fraction": float(self.fill_fraction),
        }


@dataclass
class FootROI:
    """The clip-level foot mask plus its derived geometry."""

    mask: np.ndarray                    # [H, W] bool
    bbox: Optional[Tuple[int, int, int, int]]   # (x0, y0, x1, y1)
    coverage: float                     # foot pixels / frame pixels
    n_pixels: int
    n_components_before_filter: int
    frame_size: Tuple[int, int]         # (width, height)
    reasons: List[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.n_pixels > 0 and self.bbox is not None and not self.reasons

    @property
    def bbox_diagonal(self) -> float:
        if self.bbox is None:
            return 0.0
        x0, y0, x1, y1 = self.bbox
        return float(np.hypot(x1 - x0, y1 - y0))

    def to_dict(self) -> dict:
        return {
            "coverage": float(self.coverage),
            "n_pixels": int(self.n_pixels),
            "bbox": list(self.bbox) if self.bbox else None,
            "bbox_diagonal_px": float(self.bbox_diagonal),
            "n_components_before_filter": int(self.n_components_before_filter),
            "frame_size": list(self.frame_size),
            "reasons": list(self.reasons),
        }


def _as_uint8(frame: np.ndarray) -> np.ndarray:
    """Accept float 0..1 or uint8 RGB; return uint8 RGB."""
    if frame.dtype == np.uint8:
        return frame
    return np.clip(frame * 255.0, 0, 255).astype(np.uint8)


def skin_mask_frame(
    frame: np.ndarray,
    cr_range: Sequence[int] = (130, 185),
    cb_range: Sequence[int] = (75, 140),
    v_min: int = 40,
    s_max: int = 200,
) -> np.ndarray:
    """Raw per-frame skin mask, before any morphology. [H, W] bool."""
    rgb = _as_uint8(frame)
    ycrcb = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
    cr, cb = ycrcb[..., 1], ycrcb[..., 2]
    m = (
        (cr >= cr_range[0]) & (cr <= cr_range[1])
        & (cb >= cb_range[0]) & (cb <= cb_range[1])
    )
    # HSV guards: kill deep shadow (no signal, only noise) and anything
    # implausibly saturated for skin (towel, sock, exam-table paper).
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    m &= hsv[..., 2] >= v_min
    m &= hsv[..., 1] <= s_max
    return m


def _cleanup(
    mask: np.ndarray,
    morph_kernel: int,
    fill_holes: bool,
    largest_component_only: bool,
) -> Tuple[np.ndarray, int]:
    """Morphological open/close, optional hole fill + largest component."""
    m = (mask.astype(np.uint8)) * 255
    if morph_kernel and morph_kernel > 1:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (morph_kernel, morph_kernel))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)    # drop speckle
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)   # bridge toe gaps

    n_comp, labels, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    n_fg = max(0, n_comp - 1)  # label 0 is background

    if largest_component_only and n_fg > 0:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = int(np.argmax(areas)) + 1
        m = np.where(labels == keep, 255, 0).astype(np.uint8)

    if fill_holes and m.any():
        # Fill interior holes (toenails, specular highlights, shadow between
        # toes) by redrawing every external contour solid.
        contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        filled = np.zeros_like(m)
        cv2.drawContours(filled, contours, -1, color=255, thickness=cv2.FILLED)
        m = filled

    return m.astype(bool), n_fg


def segment_foot(
    frames: np.ndarray,
    cr_range: Sequence[int] = (130, 185),
    cb_range: Sequence[int] = (75, 140),
    v_min: int = 40,
    s_max: int = 200,
    morph_kernel: int = 7,
    fill_holes: bool = True,
    largest_component_only: bool = True,
    vote_frames: int = 15,
    vote_fraction: float = 0.6,
    min_coverage: float = 0.06,
) -> FootROI:
    """Clip-level foot mask by majority vote over evenly-sampled frames.

    `frames` is [T, H, W, 3] (float 0..1 or uint8). A pixel joins the mask
    when it looks like skin in at least `vote_fraction` of the sampled
    frames — so a pixel that only flickers into range is excluded.
    """
    if frames.ndim != 4 or frames.shape[-1] != 3:
        raise ValueError(f"expected [T, H, W, 3], got {frames.shape}")

    t, h, w = frames.shape[0], frames.shape[1], frames.shape[2]
    n_vote = int(max(1, min(vote_frames, t)))
    idx = np.unique(np.linspace(0, t - 1, n_vote).astype(int))

    votes = np.zeros((h, w), dtype=np.float32)
    for i in idx:
        votes += skin_mask_frame(frames[i], cr_range, cb_range, v_min, s_max)
    raw = votes >= (vote_fraction * len(idx))

    mask, n_comp = _cleanup(raw, morph_kernel, fill_holes, largest_component_only)

    n_pixels = int(mask.sum())
    coverage = float(n_pixels) / float(h * w)
    bbox: Optional[Tuple[int, int, int, int]] = None
    if n_pixels > 0:
        ys, xs = np.nonzero(mask)
        bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

    reasons: List[str] = []
    if n_pixels == 0:
        reasons.append("no skin-coloured region found in the clip")
    elif coverage < min_coverage:
        reasons.append(
            f"foot occupies only {coverage * 100:.1f}% of the frame "
            f"(need >={min_coverage * 100:.0f}%) — move the camera closer"
        )

    return FootROI(
        mask=mask,
        bbox=bbox,
        coverage=coverage,
        n_pixels=n_pixels,
        n_components_before_filter=n_comp,
        frame_size=(w, h),
        reasons=reasons,
    )


def build_tiles(
    roi: FootROI,
    rows: int = 8,
    cols: int = 8,
    min_fill_fraction: float = 0.5,
    min_pixels: int = 24,
) -> List[Tile]:
    """Grid the foot bounding box into rows x cols sub-ROIs.

    Cells that are mostly background are dropped: averaging a tile that is
    60% exam-table gives a trace dominated by whatever the table does.
    """
    if roi.bbox is None or roi.n_pixels == 0:
        return []

    x0, y0, x1, y1 = roi.bbox
    ys = np.linspace(y0, y1, rows + 1).astype(int)
    xs = np.linspace(x0, x1, cols + 1).astype(int)

    tiles: List[Tile] = []
    for r in range(rows):
        for c in range(cols):
            ty0, ty1 = int(ys[r]), int(ys[r + 1])
            tx0, tx1 = int(xs[c]), int(xs[c + 1])
            if ty1 <= ty0 or tx1 <= tx0:
                continue
            sub = roi.mask[ty0:ty1, tx0:tx1]
            n = int(sub.sum())
            area = int(sub.size)
            fill = float(n) / float(area) if area else 0.0
            if n < min_pixels or fill < min_fill_fraction:
                continue
            tiles.append(
                Tile(
                    row=r, col=c, y0=ty0, y1=ty1, x0=tx0, x1=tx1,
                    mask=sub.copy(), n_pixels=n, fill_fraction=fill,
                )
            )
    return tiles


def rgb_trace(frames: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Spatial mean RGB inside `mask` for every frame. Returns [T, 3] float64.

    Implemented as a weighted matvec against a flattened frame view so no
    [T, n_pixels, 3] intermediate is ever materialised — that copy is
    hundreds of MB for a 30 s clip and is the difference between this
    running on a laptop and swapping.
    """
    if frames.ndim != 4 or frames.shape[-1] != 3:
        raise ValueError(f"expected [T, H, W, 3], got {frames.shape}")
    if mask.shape != frames.shape[1:3]:
        raise ValueError(f"mask {mask.shape} does not match frames {frames.shape[1:3]}")

    n = int(mask.sum())
    if n == 0:
        return np.zeros((frames.shape[0], 3), dtype=np.float64)

    weights = mask.reshape(-1).astype(np.float32) / np.float32(n)
    flat = frames.reshape(frames.shape[0], -1, 3)          # view, no copy
    return np.tensordot(weights, flat, axes=([0], [1])).astype(np.float64)


def tile_traces(frames: np.ndarray, tiles: Sequence[Tile]) -> np.ndarray:
    """Per-tile spatial mean RGB. Returns [n_tiles, T, 3] float64."""
    if not tiles:
        return np.zeros((0, frames.shape[0], 3), dtype=np.float64)
    out = np.empty((len(tiles), frames.shape[0], 3), dtype=np.float64)
    for i, tile in enumerate(tiles):
        sub = frames[:, tile.y0:tile.y1, tile.x0:tile.x1, :]
        out[i] = rgb_trace(sub, tile.mask)
    return out


def overlay_mask(
    frame: np.ndarray,
    roi: FootROI,
    tiles: Optional[Sequence[Tile]] = None,
    color: Tuple[int, int, int] = (0, 255, 128),
    alpha: float = 0.35,
) -> np.ndarray:
    """Render the ROI (and optionally the tile grid) over a frame, for the
    diagnostic PNG. Returns uint8 RGB."""
    rgb = _as_uint8(frame).copy()
    tint = np.zeros_like(rgb)
    tint[roi.mask] = color
    out = cv2.addWeighted(rgb, 1.0, tint, alpha, 0.0)
    if roi.bbox is not None:
        x0, y0, x1, y1 = roi.bbox
        cv2.rectangle(out, (x0, y0), (x1 - 1, y1 - 1), (255, 255, 255), 1)
    for tile in tiles or []:
        cv2.rectangle(
            out, (tile.x0, tile.y0), (tile.x1 - 1, tile.y1 - 1), (255, 220, 0), 1
        )
    return out
