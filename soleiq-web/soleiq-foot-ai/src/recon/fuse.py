"""
Turning per-frame relative depth into one metric colored point cloud.

The join between the two halves of the pipeline. SfM knows *where* each
camera was and the true depth of a few hundred sparse points per frame; the
learned model knows the *shape* of every pixel but not its scale. Fitting the
latter to the former, per frame, gives dense geometry that is consistent
across the whole orbit.

The fit is deliberately robust and deliberately checked: a frame whose depth
prediction does not agree with its own sparse points is dropped rather than
fused, because a badly-fitted frame smears the surface everywhere it touches.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from .depth import predict_relative_depth
from .errors import ReconstructionError
from .sfm import FramePose, SfmResult

# A frame must keep at least this correlation between predicted and observed
# inverse depth at its sparse points, or its geometry is not trustworthy.
MIN_FIT_CORRELATION = 0.80

# Sparse points needed to fit two parameters with any confidence.
MIN_FIT_POINTS = 30

# Keep pixels only where the fitted depth lands inside this multiple of the
# observed sparse depth range. Guards against the fit extrapolating wildly
# into sky/background.
DEPTH_RANGE_SLACK = 1.6


@dataclass
class FrameFit:
    image_id: int
    a: float
    b: float
    correlation: float
    z_min: float
    z_max: float
    used: bool
    reason: str = ""


def _fit_inverse_depth(
    pred: np.ndarray, px: np.ndarray, z_true: np.ndarray
) -> tuple[float, float, float]:
    """
    Least-squares fit of  1/z  ~=  a * pred + b  at the sparse pixels.

    Inverse depth is the right space for this: it is what the network
    actually predicts, and it keeps distant points from dominating the fit.
    Returns (a, b, pearson correlation).
    """
    h, w = pred.shape
    cols = np.clip(np.round(px[:, 0]).astype(int), 0, w - 1)
    rows = np.clip(np.round(px[:, 1]).astype(int), 0, h - 1)
    d = pred[rows, cols].astype(np.float64)
    inv_z = 1.0 / np.maximum(z_true, 1e-6)

    # Trim the extreme decile on both sides before fitting: SfM points behind
    # the camera or on a moving object are outliers that would tilt the line.
    keep = np.ones_like(d, dtype=bool)
    for arr in (d, inv_z):
        lo, hi = np.percentile(arr, [5, 95])
        keep &= (arr >= lo) & (arr <= hi)
    if keep.sum() >= MIN_FIT_POINTS:
        d, inv_z = d[keep], inv_z[keep]

    A = np.stack([d, np.ones_like(d)], axis=1)
    (a, b), *_ = np.linalg.lstsq(A, inv_z, rcond=None)

    pred_inv = A @ np.array([a, b])
    if pred_inv.std() < 1e-12 or inv_z.std() < 1e-12:
        return float(a), float(b), 0.0
    corr = float(np.corrcoef(pred_inv, inv_z)[0, 1])
    return float(a), float(b), corr


def _unproject(
    pose: FramePose, z: np.ndarray, rgb: np.ndarray, stride: int
) -> tuple[np.ndarray, np.ndarray]:
    """Camera-space depth map -> world points + colors, subsampled by `stride`."""
    h, w = z.shape
    vs, us = np.mgrid[0:h:stride, 0:w:stride]
    us = us.ravel()
    vs = vs.ravel()
    zz = z[vs, us]

    valid = np.isfinite(zz) & (zz > 0)
    us, vs, zz = us[valid], vs[valid], zz[valid]
    if us.size == 0:
        return np.empty((0, 3)), np.empty((0, 3))

    K_inv = np.linalg.inv(pose.K)
    rays = K_inv @ np.stack([us, vs, np.ones_like(us)], axis=0).astype(np.float64)
    cam = rays * zz[None, :]
    world = pose.R.T @ (cam - pose.t[:, None])

    colors = rgb[vs, us].astype(np.float64) / 255.0
    return world.T, colors


def fuse_frames(
    image_dir: Path,
    sfm: SfmResult,
    *,
    stride: int = 4,
    progress=None,
) -> tuple[np.ndarray, np.ndarray, list[FrameFit]]:
    """
    Fuse every well-fitting frame into one colored point cloud.

    `stride` subsamples the depth map — at 4 a 640x480 frame contributes about
    19k points, which is plenty of density for a foot and keeps the fused
    cloud manageable.

    Returns (Nx3 world points, Nx3 rgb in 0..1, per-frame fit diagnostics).
    """
    all_pts: list[np.ndarray] = []
    all_col: list[np.ndarray] = []
    fits: list[FrameFit] = []

    for i, pose in enumerate(sfm.poses):
        if progress:
            progress(i / max(1, len(sfm.poses)))

        obs = sfm.observations.get(pose.image_id)
        if obs is None or len(obs[0]) < MIN_FIT_POINTS:
            fits.append(FrameFit(pose.image_id, 0, 0, 0, 0, 0, False, "too few sparse points"))
            continue

        px, xyz = obs
        z_true = (pose.R @ xyz.T + pose.t[:, None])[2]
        in_front = z_true > 1e-6
        if in_front.sum() < MIN_FIT_POINTS:
            fits.append(FrameFit(pose.image_id, 0, 0, 0, 0, 0, False, "sparse points behind camera"))
            continue
        px, z_true = px[in_front], z_true[in_front]

        bgr = cv2.imread(str(image_dir / pose.name), cv2.IMREAD_COLOR)
        if bgr is None:
            fits.append(FrameFit(pose.image_id, 0, 0, 0, 0, 0, False, "frame unreadable"))
            continue
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        h, w = rgb.shape[:2]

        pred = predict_relative_depth(image_dir / pose.name, (h, w))
        a, b, corr = _fit_inverse_depth(pred, px, z_true)

        z_lo, z_hi = float(z_true.min()), float(z_true.max())
        if corr < MIN_FIT_CORRELATION:
            fits.append(
                FrameFit(pose.image_id, a, b, corr, z_lo, z_hi, False,
                         f"depth disagrees with geometry (r={corr:.2f})")
            )
            continue

        inv_z = a * pred + b
        with np.errstate(divide="ignore", invalid="ignore"):
            z = 1.0 / inv_z
        span = (z_hi - z_lo) * DEPTH_RANGE_SLACK
        z[(inv_z <= 0) | (z < z_lo - span) | (z > z_hi + span)] = np.nan

        pts, cols = _unproject(pose, z, rgb, stride)
        if pts.size:
            all_pts.append(pts)
            all_col.append(cols)
        fits.append(FrameFit(pose.image_id, a, b, corr, z_lo, z_hi, True))

    used = [f for f in fits if f.used]
    if not all_pts:
        raise ReconstructionError(
            "None of the photos produced usable depth. This usually means the "
            "foot filled too little of the frame or the lighting changed "
            "between shots.",
            stage="fuse",
        )
    if len(used) < 8:
        raise ReconstructionError(
            f"Only {len(used)} photos produced usable depth, which is not "
            "enough to build a surface. Re-take the scan more slowly.",
            stage="fuse",
        )

    return np.vstack(all_pts), np.vstack(all_col), fits
