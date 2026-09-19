"""
The orchestrator.

frames -> SfM -> per-frame dense depth fitted to the sparse points -> fused
colored cloud -> Poisson surface -> GLB, plus cameras.json and quality.json.

Every exit is either a complete result or a ReconstructionError with a reason
a patient could read. There is no partial success and no fallback geometry:
if the photos will not reconstruct, the job fails and says why.
"""

from __future__ import annotations

import json
import shutil
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np

from .depth import MODEL_ID, MODEL_LICENSE
from .errors import ReconstructionError
from .frames import MIN_USABLE_FRAMES, select_frames
from .fuse import fuse_frames
from .scale import ScaleEstimate, from_foot_length
from .sfm import angular_coverage_pct, run_sfm
from .surface import build_surface, export_glb


@dataclass
class ReconstructionResult:
    glb_path: Path
    cameras_path: Path
    quality_path: Path
    pointcloud_path: Path | None
    quality: dict


def _confidence(coverage_pct: float, reproj_px: float, frames: int) -> str:
    """
    Overall confidence, from things that were actually measured.

    Deliberately conservative and deliberately simple — a formula nobody can
    read is worse than a coarse one everybody can. Any single bad signal caps
    the result; they do not average out.
    """
    if coverage_pct >= 75 and reproj_px <= 1.2 and frames >= 30:
        return "high"
    if coverage_pct >= 45 and reproj_px <= 2.0 and frames >= 20:
        return "medium"
    return "low"


def reconstruct(
    *,
    image_dir: Path,
    work_dir: Path,
    out_dir: Path,
    foot_length_mm: float | None = None,
    sequential: bool = True,
    stride: int = 4,
    progress=None,
    fixture: bool = False,
) -> ReconstructionResult:
    """
    Run the whole pipeline.

    `foot_length_mm` supplies anthropometric scale. Without it the model is
    reconstructed in SfM units and `scale_method` is recorded as `unscaled`,
    which the client is required to treat as "show no measurements".

    `fixture=True` marks the output as test data. It writes a FIXTURE marker
    beside the artifacts so a fixture can never be mistaken for a patient
    model further down the line.
    """
    def step(frac: float, stage: str):
        if progress:
            progress(frac, stage)

    t0 = time.time()
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    # ---- 1. frame selection -------------------------------------------------
    step(0.02, "matching")
    all_frames = sorted(
        p for p in image_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if not all_frames:
        raise ReconstructionError("No photos were supplied.", stage="frames")

    kept = select_frames(all_frames)
    if len(kept) < MIN_USABLE_FRAMES:
        rejected = len(all_frames) - len(kept)
        raise ReconstructionError(
            f"Only {len(kept)} of {len(all_frames)} photos were sharp and "
            f"well-exposed enough to use ({rejected} rejected). At least "
            f"{MIN_USABLE_FRAMES} are needed. Re-take the scan holding the "
            "phone steady in even light.",
            stage="frames",
        )

    # SfM reads a directory, so stage the survivors into their own one.
    staged = work_dir / "frames"
    if staged.exists():
        shutil.rmtree(staged)
    staged.mkdir(parents=True)
    for f in kept:
        shutil.copy(f.path, staged / f.path.name)

    # ---- 2. structure from motion ------------------------------------------
    step(0.10, "reconstructing")
    sfm = run_sfm(staged, work_dir, sequential=sequential)
    coverage = angular_coverage_pct(sfm.poses)

    # ---- 3. dense depth, fitted to the sparse geometry ---------------------
    step(0.30, "reconstructing")
    pts, cols, fits = fuse_frames(
        staged, sfm, stride=stride,
        progress=lambda f: step(0.30 + 0.45 * f, "reconstructing"),
    )
    used_frames = sum(1 for f in fits if f.used)

    # ---- 4. surface --------------------------------------------------------
    step(0.78, "texturing")
    mesh, stats = build_surface(
        pts, cols,
        camera_centers=np.stack([p.center() for p in sfm.poses]),
        work_dir=work_dir,
    )

    # ---- 5. scale ----------------------------------------------------------
    # Applied only after the surface is cropped to the subject, so the longest
    # axis really is the foot and not the floor.
    scale: ScaleEstimate | None = None
    if foot_length_mm is not None:
        extent = float(np.max(mesh.get_max_bound() - mesh.get_min_bound()))
        scale = from_foot_length(extent, foot_length_mm)

    # ---- 6. artifacts ------------------------------------------------------
    step(0.90, "texturing")
    glb = export_glb(
        mesh, out_dir / "model.glb",
        scale_mm_per_unit=scale.mm_per_unit if scale else None,
    )

    cameras = {
        "convention": "world_to_camera, COLMAP (+Z forward)",
        "units": "millimetres" if scale else "sfm_units",
        "scale_mm_per_unit": scale.mm_per_unit if scale else None,
        "cameras": [
            {
                "name": p.name,
                "image_id": p.image_id,
                "K": p.K.tolist(),
                "R": p.R.tolist(),
                "t": p.t.tolist(),
            }
            for p in sfm.poses
        ],
    }
    cameras_path = out_dir / "cameras.json"
    cameras_path.write_text(json.dumps(cameras, indent=2))

    quality = {
        # --- the fields the client's zod schema requires ---
        "frameCount": used_frames,
        "coveragePct": coverage,
        "meanReprojErrorPx": round(sfm.mean_reproj_error_px, 4),
        "scaleMethod": scale.method if scale else "unscaled",
        "scaleUncertaintyPct": scale.uncertainty_pct if scale else 100.0,
        "pipeline": "feedforward",
        "textureKind": "vertex_color",
        "confidence": _confidence(coverage, sfm.mean_reproj_error_px, used_frames),
        # --- provenance beyond the schema, so the label is not the whole story ---
        "provenance": {
            "poseSource": "pycolmap incremental SfM (real COLMAP, CPU)",
            "denseSource": f"{MODEL_ID} ({MODEL_LICENSE})",
            "denseMvsAvailable": False,
            "denseMvsReason": "COLMAP patch_match_stereo requires CUDA; none on this host",
            "uvTexturingAvailable": False,
            "uvTexturingReason": "xatlas wheel would not build on this host",
            "scaleDetail": scale.detail if scale else
                "no fiducial and no foot length supplied — model is in SfM units, "
                "no measurement may be displayed",
        },
        "frames": {
            "supplied": len(all_frames),
            "passedQualityGate": len(kept),
            "registeredBySfm": sfm.registered,
            "contributedDepth": used_frames,
            "rejected": [
                {"image_id": f.image_id, "reason": f.reason}
                for f in fits if not f.used
            ],
        },
        "surface": asdict(stats),
        "timingSeconds": round(time.time() - t0, 1),
        "isFixture": fixture,
    }
    quality_path = out_dir / "quality.json"
    quality_path.write_text(json.dumps(quality, indent=2))

    if fixture:
        (out_dir / "FIXTURE.txt").write_text(
            "TEST FIXTURE - NOT PATIENT DATA. Must never reach a patient-facing screen.\n"
        )

    step(1.0, "ready")
    return ReconstructionResult(
        glb_path=glb,
        cameras_path=cameras_path,
        quality_path=quality_path,
        pointcloud_path=None,
        quality=quality,
    )
