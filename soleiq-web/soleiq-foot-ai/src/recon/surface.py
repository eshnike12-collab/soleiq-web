"""
Point cloud -> watertight colored surface -> GLB.

Poisson reconstruction, then the cleanup that decides whether the result is a
model of a foot or a model of a foot plus the floor plus a balloon of
hallucinated geometry around both. The cleanup is most of the value here.

Color is per-vertex throughout. xatlas would not build on this machine, so
there is no UV atlas and `textureKind` is always "vertex_color". That is
recorded in quality.json rather than glossed over.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import open3d as o3d

from .errors import ReconstructionError
from .mesher import POISSON_DEPTH, POISSON_TRIM, mesh_out_of_process

# Depth 9 drove Open3D 0.19's Poisson extension into a SIGSEGV on a cloud
# with large depth spread ("Failed to close loop"). 8 is stable here and is
# ample for an object-scale scan.
POISSON_DEPTH = 8
# Poisson invents surface wherever the cloud is sparse. Dropping the lowest
# density quantile is what removes the characteristic inflated shell.
DENSITY_TRIM_QUANTILE = 0.08
TARGET_TRIANGLES = 80_000


@dataclass
class SurfaceStats:
    vertices: int
    triangles: int
    points_into_poisson: int
    unsupported_removed: int
    components_dropped: int
    plane_points_removed: int
    background_points_removed: int


def _remove_dominant_plane(pcd: o3d.geometry.PointCloud) -> tuple[o3d.geometry.PointCloud, int]:
    """
    Segment out the surface the subject is resting on.

    A foot photographed on the floor sits on a large plane that Poisson would
    happily fold into the mesh. RANSAC finds it; it is only removed if it is
    genuinely dominant, so a scan with no visible floor is left alone.
    """
    if len(pcd.points) < 1000:
        return pcd, 0
    try:
        _, inliers = pcd.segment_plane(
            distance_threshold=0.01, ransac_n=3, num_iterations=200
        )
    except Exception:
        return pcd, 0
    share = len(inliers) / len(pcd.points)
    if share < 0.15 or share > 0.75:
        # Too small to be the floor, or so large that removing it would take
        # the subject with it.
        return pcd, 0
    return pcd.select_by_index(inliers, invert=True), len(inliers)


def _orient_towards_nearest_camera(
    pcd: o3d.geometry.PointCloud, cams: np.ndarray
) -> None:
    """
    Flip every normal to face the camera that could actually see that point.

    Orienting towards the *mean* camera position is wrong for an orbit: the
    mean sits in the middle of the ring, right next to the subject, so points
    on opposite sides of the foot get contradictory orientations. Poisson then
    cannot close the isosurface — observed as "Failed to close loop" followed
    by either a segfault or an unbounded hang.

    Nearest-camera is the correct rule and costs one small KD-tree query per
    point: the surface a given camera photographed must face that camera.
    """
    pts = np.asarray(pcd.points)
    nrm = np.asarray(pcd.normals)
    if pts.size == 0 or nrm.size == 0:
        return
    # cams is tiny (tens of rows), so a brute-force nearest search over it is
    # cheaper than building a tree.
    d2 = ((pts[:, None, :] - cams[None, :, :]) ** 2).sum(axis=2)
    nearest = cams[np.argmin(d2, axis=1)]
    to_cam = nearest - pts
    flip = (nrm * to_cam).sum(axis=1) < 0
    nrm[flip] *= -1.0
    pcd.normals = o3d.utility.Vector3dVector(nrm)


def _crop_to_observed(
    mesh: o3d.geometry.TriangleMesh, observed: o3d.geometry.PointCloud, radius: float
) -> int:
    """
    Delete surface that no photograph actually supports.

    Poisson solves for a closed surface, so wherever the cloud thins out it
    extrapolates — the characteristic skirt around the edge of a partial
    capture. Density trimming does not remove it, because the skirt stays
    topologically connected to the real shell (measured: 98.7% of triangles
    in one component at every trim value tried).

    So the crop is by evidence instead: a mesh vertex further than `radius`
    from the nearest fused point is surface the reconstruction invented, and
    it is removed. That is the same rule the rest of this codebase follows —
    show what was measured, show nothing where nothing was measured.

    Returns the number of vertices removed.
    """
    if len(mesh.vertices) == 0 or len(observed.points) == 0:
        return 0
    tree = o3d.geometry.KDTreeFlann(observed)
    verts = np.asarray(mesh.vertices)
    unsupported = np.zeros(len(verts), dtype=bool)
    for i, v in enumerate(verts):
        k, _, dist2 = tree.search_hybrid_vector_3d(v, radius, 1)
        unsupported[i] = k == 0 or dist2[0] > radius * radius
    if unsupported.all():
        # Radius mis-set; better to keep the mesh than return nothing.
        return 0
    mesh.remove_vertices_by_mask(unsupported)
    mesh.remove_unreferenced_vertices()
    return int(unsupported.sum())


def _keep_largest_cluster(
    pcd: o3d.geometry.PointCloud, voxel: float
) -> tuple[o3d.geometry.PointCloud, int]:
    """
    Keep the biggest spatially-connected blob and discard the rest.

    eps is tied to the voxel size so this behaves the same whatever scale the
    SfM solution came out at. If clustering finds nothing (everything is
    noise) the cloud is returned untouched rather than emptied.
    """
    before = len(pcd.points)
    if before < 2000:
        return pcd, 0
    labels = np.asarray(
        pcd.cluster_dbscan(eps=voxel * 4.0, min_points=12, print_progress=False)
    )
    if labels.size == 0 or labels.max() < 0:
        return pcd, 0
    counts = np.bincount(labels[labels >= 0])
    biggest = int(np.argmax(counts))
    idx = np.where(labels == biggest)[0]
    if idx.size < 2000:
        return pcd, 0
    return pcd.select_by_index(idx), before - int(idx.size)


# Poisson gains nothing from more than this many points at object scale, and
# normal estimation cost grows fast past it.
MAX_POINTS_FOR_SURFACE = 200_000


def build_surface(
    points: np.ndarray,
    colors: np.ndarray,
    *,
    camera_centers: np.ndarray | None = None,
    voxel: float | None = None,
    work_dir: Path | None = None,
) -> tuple[o3d.geometry.TriangleMesh, SurfaceStats]:
    if points.shape[0] < 5000:
        raise ReconstructionError(
            "The scan produced too few surface points to build a model.",
            stage="surface",
        )

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    pcd.colors = o3d.utility.Vector3dVector(np.clip(colors, 0, 1))

    # Voxel size scaled to the cloud so this works whatever the SfM scale is.
    if voxel is None:
        extent = float(np.linalg.norm(pcd.get_max_bound() - pcd.get_min_bound()))
        voxel = max(extent / 600.0, 1e-6)
    pcd = pcd.voxel_down_sample(voxel)

    pcd, plane_removed = _remove_dominant_plane(pcd)

    # Isolate the subject.
    #
    # The fused cloud contains everything the camera saw, including background
    # tens of metres behind the subject. Left in, it inflates the octree's
    # bounding box until the cells around the subject are too coarse to
    # resolve it — and on Open3D 0.19 it can crash the Poisson extension
    # outright. Keeping the largest spatial cluster is also just the right
    # operation: a foot scan wants the foot, not the room.
    pcd, cluster_removed = _keep_largest_cluster(pcd, voxel)

    # Second downsample, now that only the subject remains: the first pass was
    # sized against a bounding box that included the background, so it left far
    # more points than the surface needs.
    if len(pcd.points) > MAX_POINTS_FOR_SURFACE:
        factor = (len(pcd.points) / MAX_POINTS_FOR_SURFACE) ** (1 / 3)
        pcd = pcd.voxel_down_sample(voxel * factor)

    # Statistical outlier removal before normals: a stray point drags the
    # normal of everything near it.
    pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)
    if len(pcd.points) < 2000:
        raise ReconstructionError(
            "Too little of the scan survived cleanup to build a surface.",
            stage="surface",
        )

    pcd.estimate_normals(
        search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=voxel * 6, max_nn=40)
    )
    # Orientation from the cameras, not from tangent-plane propagation.
    #
    # `orient_normals_consistent_tangent_plane` builds a Riemannian MST over
    # every point and is minutes-slow at this size. It is also solving a
    # problem we do not have: SfM already told us where every camera stood,
    # and a surface the camera photographed must face it. One dot product per
    # point instead of a global optimisation.
    if camera_centers is not None and len(camera_centers):
        _orient_towards_nearest_camera(pcd, np.asarray(camera_centers, dtype=np.float64))
    else:
        pcd.orient_normals_consistent_tangent_plane(k=30)

    # Poisson runs in a child process: Open3D 0.19's extension can SIGSEGV on
    # some clouds, and a segfault cannot be caught in-process. See mesher.py.
    pts_before = len(pcd.points)
    mesh = mesh_out_of_process(
        np.asarray(pcd.points),
        np.asarray(pcd.normals),
        np.asarray(pcd.colors) if pcd.has_colors() else None,
        work_dir if work_dir is not None else Path(".recon_work"),
        depth=POISSON_DEPTH,
        trim=POISSON_TRIM,
    )
    # Density trimming happened in the child; the count is not recoverable
    # across the process boundary, so it is reported as the input size.
    removed = pts_before

    # Crop to observed support before connectivity: removing the invented
    # skirt first is what lets the component filter see the real shell.
    unsupported = _crop_to_observed(mesh, pcd, radius=voxel * 2.5)

    # Keep only the largest connected shell; Poisson leaves satellites.
    labels, counts, _ = mesh.cluster_connected_triangles()
    labels = np.asarray(labels)
    counts = np.asarray(counts)
    dropped = 0
    if counts.size > 1:
        keep = int(np.argmax(counts))
        mesh.remove_triangles_by_mask(labels != keep)
        mesh.remove_unreferenced_vertices()
        dropped = int(counts.size - 1)

    if len(mesh.triangles) > TARGET_TRIANGLES:
        mesh = mesh.simplify_quadric_decimation(TARGET_TRIANGLES)

    mesh.remove_degenerate_triangles()
    mesh.remove_duplicated_vertices()
    mesh.remove_non_manifold_edges()
    mesh.compute_vertex_normals()

    if len(mesh.triangles) == 0:
        raise ReconstructionError(
            "Nothing survived surface cleanup — the scan was too noisy.",
            stage="surface",
        )

    return mesh, SurfaceStats(
        vertices=len(mesh.vertices),
        triangles=len(mesh.triangles),
        points_into_poisson=removed,
        unsupported_removed=unsupported,
        components_dropped=dropped,
        plane_points_removed=plane_removed,
        background_points_removed=cluster_removed,
    )


def export_glb(mesh: o3d.geometry.TriangleMesh, out: Path, *, scale_mm_per_unit: float | None) -> Path:
    """
    Write a .glb with per-vertex color.

    glTF is metres by convention, so the mesh is converted from reconstruction
    units to metres when a scale is known. When it is not, the mesh is written
    in raw SfM units and the caller must not present any dimension from it.
    """
    import trimesh

    v = np.asarray(mesh.vertices)
    if scale_mm_per_unit is not None:
        v = v * (scale_mm_per_unit / 1000.0)

    colors = np.asarray(mesh.vertex_colors)
    vertex_colors = (
        (np.clip(colors, 0, 1) * 255).astype(np.uint8) if colors.size else None
    )

    tm = trimesh.Trimesh(
        vertices=v,
        faces=np.asarray(mesh.triangles),
        vertex_colors=vertex_colors,
        process=False,
    )
    # Centre on the origin so the viewer's default camera framing works
    # without per-model tuning.
    tm.apply_translation(-tm.bounds.mean(axis=0))

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(trimesh.exchange.gltf.export_glb(trimesh.Scene(tm)))
    return out
