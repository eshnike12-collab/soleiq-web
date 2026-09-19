"""
Structure from motion — real COLMAP, in-process via pycolmap.

Produces camera intrinsics, per-frame extrinsics, and a sparse point cloud.
Everything downstream is anchored to these poses; the learned depth model
only fills in density between them.

`pycolmap.has_cuda` is False on Apple Silicon, so dense MVS
(patch_match_stereo / stereo_fusion) is unavailable and is not attempted.
Sparse SfM itself is CPU and runs fine.
"""

from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pycolmap

from .errors import ReconstructionError

# Reproducible reconstruction, on by default. Set SOLEIQ_DETERMINISTIC=0 to
# trade it back for speed once a scan is understood.
DETERMINISTIC = os.environ.get("SOLEIQ_DETERMINISTIC", "1") != "0"


@dataclass
class FramePose:
    """One registered camera. World-to-camera, COLMAP convention."""

    name: str
    image_id: int
    K: np.ndarray          # 3x3 intrinsics
    R: np.ndarray          # 3x3 rotation, world -> camera
    t: np.ndarray          # 3, translation, world -> camera

    def center(self) -> np.ndarray:
        """Camera centre in world coordinates."""
        return -self.R.T @ self.t


@dataclass
class SfmResult:
    poses: list[FramePose]
    # Sparse world points and the observations that produced them, keyed by
    # image_id -> (Nx2 pixel coords, Nx3 world points).
    observations: dict[int, tuple[np.ndarray, np.ndarray]]
    mean_reproj_error_px: float
    registered: int
    submitted: int


def run_sfm(image_dir: Path, work_dir: Path, *, sequential: bool = True) -> SfmResult:
    """
    Feature extraction -> matching -> incremental mapping.

    `sequential` suits an orbit, where consecutive frames overlap. Exhaustive
    matching is the fallback for an unordered photo burst; it is O(n^2) and
    noticeably slower past ~40 frames.
    """
    # Fix COLMAP's RNG. Its incremental mapper seeds RANSAC randomly, and the
    # consequence is not subtle: the same 39 frames registered 39/39 on one run
    # and 2/39 on the next. A reconstruction you cannot re-run is one you
    # cannot debug, and an intermittent failure reads to a user as a broken
    # feature. Determinism costs nothing here.
    pycolmap.set_random_seed(0)

    work_dir.mkdir(parents=True, exist_ok=True)
    db_path = work_dir / "database.db"
    out_dir = work_dir / "sparse"
    if db_path.exists():
        db_path.unlink()
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    pycolmap.extract_features(
        database_path=str(db_path),
        image_path=str(image_dir),
        # SIMPLE_RADIAL with a shared camera: every frame comes from the same
        # phone in one sitting, so solving one intrinsic set is both correct
        # and much better conditioned than solving one per frame.
        camera_mode=pycolmap.CameraMode.SINGLE,
        camera_model="SIMPLE_RADIAL",
    )

    # Single-threaded matching when determinism is asked for. Seeding the RNG
    # alone was not enough — three consecutive runs over identical frames gave
    # 39/39, 39/39, then 2/39, because match order varies with thread
    # scheduling and the mapper's seed pair is chosen from it. Slower, but a
    # reconstruction that cannot be reproduced cannot be debugged.
    sift_opts = pycolmap.SiftMatchingOptions()
    if DETERMINISTIC:
        sift_opts.num_threads = 1

    if sequential:
        pycolmap.match_sequential(database_path=str(db_path), sift_options=sift_opts)
    else:
        pycolmap.match_exhaustive(database_path=str(db_path), sift_options=sift_opts)

    map_opts = pycolmap.IncrementalPipelineOptions()
    if DETERMINISTIC:
        # Force the CPU path in bundle adjustment too: the multi-threaded
        # branch reduces residuals in a nondeterministic order.
        map_opts.ba_min_num_residuals_for_cpu_multi_threading = 10**9

    maps = pycolmap.incremental_mapping(
        database_path=str(db_path),
        image_path=str(image_dir),
        output_path=str(out_dir),
        options=map_opts,
    )

    if not maps:
        raise ReconstructionError(
            "Could not work out where the photos were taken from. Re-take the "
            "scan moving slowly and steadily around the foot, keeping it in "
            "frame the whole time.",
            stage="sfm",
        )

    # incremental_mapping can return several disconnected sub-models when the
    # orbit breaks. The largest is the real one; the rest are fragments.
    rec = max(maps.values(), key=lambda r: r.num_reg_images())

    poses: list[FramePose] = []
    observations: dict[int, tuple[np.ndarray, np.ndarray]] = {}

    for image_id, image in rec.images.items():
        if not image.has_pose:
            continue
        cam = rec.cameras[image.camera_id]
        # `cam_from_world` is a property in pycolmap 3.11, not a method.
        rigid = image.cam_from_world
        R = rigid.rotation.matrix()
        t = np.asarray(rigid.translation, dtype=np.float64)

        poses.append(
            FramePose(
                name=image.name,
                image_id=int(image_id),
                K=np.asarray(cam.calibration_matrix(), dtype=np.float64),
                R=np.asarray(R, dtype=np.float64),
                t=t,
            )
        )

        px: list[list[float]] = []
        xyz: list[list[float]] = []
        for p2d in image.points2D:
            if not p2d.has_point3D():
                continue
            # pycolmap's map type is not a dict — no .get(), and indexing a
            # missing id throws rather than returning None.
            pid = p2d.point3D_id
            if pid not in rec.points3D:
                continue
            pt3 = rec.points3D[pid]
            px.append([float(p2d.xy[0]), float(p2d.xy[1])])
            xyz.append([float(v) for v in pt3.xyz])
        if px:
            observations[int(image_id)] = (
                np.asarray(px, dtype=np.float64),
                np.asarray(xyz, dtype=np.float64),
            )

    if len(poses) < 8:
        raise ReconstructionError(
            f"Only {len(poses)} of the photos could be placed in 3D. The scan "
            "needs more overlap between neighbouring shots.",
            stage="sfm",
        )

    errors = [p.error for p in rec.points3D.values() if p.error >= 0]
    mean_err = float(np.mean(errors)) if errors else float("nan")
    if not np.isfinite(mean_err):
        raise ReconstructionError(
            "Reconstruction produced no usable reprojection statistics.",
            stage="sfm",
        )

    return SfmResult(
        poses=poses,
        observations=observations,
        mean_reproj_error_px=mean_err,
        registered=len(poses),
        submitted=len(list(image_dir.iterdir())),
    )


def angular_coverage_pct(poses: list[FramePose]) -> float:
    """
    How much of a full orbit the cameras actually span.

    Camera centres are projected onto the best-fit plane through them and
    their bearings binned into 24 sectors of 15 degrees. The share of
    non-empty sectors is the coverage. This is a real measurement of the
    capture path, not a proxy for frame count.
    """
    if len(poses) < 3:
        return 0.0
    C = np.stack([p.center() for p in poses])
    C = C - C.mean(axis=0)
    # Plane of the orbit = span of the two dominant singular directions.
    _, _, Vt = np.linalg.svd(C, full_matrices=False)
    basis = Vt[:2]
    proj = C @ basis.T
    ang = np.arctan2(proj[:, 1], proj[:, 0])
    bins = np.unique(((ang + np.pi) / (2 * np.pi) * 24).astype(int) % 24)
    return round(100.0 * len(bins) / 24.0, 1)
