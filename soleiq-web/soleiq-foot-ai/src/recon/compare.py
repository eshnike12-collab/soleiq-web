"""
Aligning one visit's model to another.

Two scans of the same foot come out in unrelated coordinate frames — the SfM
solution is only defined up to a similarity, and the patient stood differently
anyway. Comparing them means solving for the rigid transform between them
first, and then being honest about how well that transform actually fit.

That second half is the point. A wrong alignment does not look wrong: it looks
like the foot changed shape. So every result carries `fitness` and `inlier_rmse`
straight from Open3D, and the caller is expected to refuse to draw an overlay
when they are poor rather than showing a confident-looking lie.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import open3d as o3d

from .errors import ReconstructionError

# Points sampled from each surface for registration. Enough to constrain a
# rigid transform on an object this size; more mostly costs time.
SAMPLE_POINTS = 30_000

# Below this share of overlapping points the transform is not describing the
# same object twice. Open3D's `fitness` is the fraction of source points with
# a correspondence inside the threshold.
MIN_FITNESS = 0.55

# Above this RMSE (as a fraction of the model's own radius) the fit is loose
# enough that a delta would be reporting registration error as anatomy.
MAX_RELATIVE_RMSE = 0.04


@dataclass
class AlignmentResult:
    transform: list[list[float]]
    fitness: float
    inlier_rmse: float
    relative_rmse: float
    scale_applied: float
    reliable: bool
    reason: str
    # Signed surface distance, current minus previous, over matched points.
    mean_delta: float | None
    p95_abs_delta: float | None

    def to_dict(self) -> dict:
        return asdict(self)


def _load_points(path: Path) -> o3d.geometry.PointCloud:
    mesh = o3d.io.read_triangle_mesh(str(path))
    if len(mesh.triangles) == 0:
        raise ReconstructionError(
            "One of the models could not be read for comparison.",
            stage="compare",
        )
    mesh.compute_vertex_normals()
    pcd = mesh.sample_points_poisson_disk(
        number_of_points=min(SAMPLE_POINTS, max(1000, len(mesh.vertices)))
    )
    pcd.estimate_normals()
    return pcd


def align(previous_glb: Path, current_glb: Path) -> AlignmentResult:
    """
    Register `current` onto `previous` and report how well it went.

    Coarse global registration is skipped deliberately: both models are
    exported centred on their own bounding box, so they start roughly
    superimposed and point-to-plane ICP converges from there. If that
    assumption ever stops holding, fitness will say so rather than the
    result quietly drifting.
    """
    prev = _load_points(previous_glb)
    curr = _load_points(current_glb)

    # Both are centred already, but not necessarily the same size when the
    # two visits were scaled differently. Normalising by radius first stops
    # a scale difference being absorbed as a bad rigid fit.
    prev_r = float(np.linalg.norm(prev.get_max_bound() - prev.get_min_bound())) / 2
    curr_r = float(np.linalg.norm(curr.get_max_bound() - curr.get_min_bound())) / 2
    if prev_r <= 0 or curr_r <= 0:
        raise ReconstructionError(
            "One of the models has no extent to compare.", stage="compare"
        )
    scale = prev_r / curr_r
    curr.scale(scale, center=curr.get_center())

    threshold = prev_r * 0.05
    reg = o3d.pipelines.registration.registration_icp(
        curr,
        prev,
        threshold,
        np.eye(4),
        o3d.pipelines.registration.TransformationEstimationPointToPlane(),
        o3d.pipelines.registration.ICPConvergenceCriteria(max_iteration=80),
    )

    rel_rmse = reg.inlier_rmse / prev_r if prev_r else float("inf")
    reliable = reg.fitness >= MIN_FITNESS and rel_rmse <= MAX_RELATIVE_RMSE

    if not reliable:
        reason = (
            f"Alignment is unreliable (overlap {reg.fitness:.0%}, "
            f"residual {rel_rmse:.1%} of the model's size). The two scans "
            "probably do not cover the same part of the foot well enough to "
            "compare. No difference is shown."
        )
        return AlignmentResult(
            transform=np.eye(4).tolist(),
            fitness=float(reg.fitness),
            inlier_rmse=float(reg.inlier_rmse),
            relative_rmse=float(rel_rmse),
            scale_applied=float(scale),
            reliable=False,
            reason=reason,
            mean_delta=None,
            p95_abs_delta=None,
        )

    # Signed distance along the previous surface's normals: positive means the
    # current scan sits proud of the old one.
    aligned = o3d.geometry.PointCloud(curr).transform(reg.transformation)
    tree = o3d.geometry.KDTreeFlann(prev)
    prev_pts = np.asarray(prev.points)
    prev_nrm = np.asarray(prev.normals)
    deltas: list[float] = []
    for p in np.asarray(aligned.points):
        k, idx, _ = tree.search_knn_vector_3d(p, 1)
        if k == 0:
            continue
        i = idx[0]
        deltas.append(float(np.dot(p - prev_pts[i], prev_nrm[i])))

    d = np.asarray(deltas) if deltas else np.zeros(0)
    return AlignmentResult(
        transform=np.asarray(reg.transformation).tolist(),
        fitness=float(reg.fitness),
        inlier_rmse=float(reg.inlier_rmse),
        relative_rmse=float(rel_rmse),
        scale_applied=float(scale),
        reliable=True,
        reason="Aligned.",
        mean_delta=float(d.mean()) if d.size else None,
        p95_abs_delta=float(np.percentile(np.abs(d), 95)) if d.size else None,
    )
