"""
Poisson surface reconstruction, run out-of-process.

Two decisions here, both forced by measurement rather than preference.

**COLMAP's Poisson, not Open3D's.** Open3D 0.19's extension failed on the
Fountain fixture at every octree depth tried (6, 7, 8, 9) with
"Failed to close loop" inside FEMTree.IsoSurface.specialized.inl, followed by
either SIGSEGV or an unbounded hang. COLMAP's implementation, reached through
`pycolmap.poisson_meshing`, meshed the identical cloud in 3.1 s producing
244k vertices with colors intact. Note COLMAP's `trim` is an absolute density
threshold, not a quantile, and its default of 10.0 sits *above* the density
range of an object-scale cloud — leaving it alone silently trims every vertex
and yields an empty mesh. `TRIM` below is set accordingly.

**Out of process.** A SIGSEGV in a C++ extension cannot be caught with
try/except; it takes the whole interpreter with it, so inside a FastAPI
worker one bad scan would kill the service for every user. The child can
crash freely: the parent sees a non-zero exit and raises an ordinary
ReconstructionError. Worth keeping even now that the mesher is the stable
one — it is the difference between "this scan failed" and "the server fell
over".

Run directly as a script (`python -m src.recon.mesher in.npz out.ply`) it is
the child; imported, `mesh_out_of_process` is the parent side.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np

from .errors import ReconstructionError

# COLMAP octree depth. 9 measured at ~3 s for an 84k-point object cloud.
POISSON_DEPTH = 9

# Absolute density threshold, NOT a quantile. Poisson invents surface wherever
# the cloud is sparse and this removes the resulting inflated shell. Measured
# density range on the fixture was [2.10, 8.27]; 3.0 clips the thinnest
# regions while keeping the subject. COLMAP's own default of 10.0 is above
# that whole range and empties the mesh.
POISSON_TRIM = 3.0

# Wall-clock ceiling for the child. Past this the scan is not going to
# finish in a clinically useful time and is failed rather than left hanging.
MESH_TIMEOUT_S = 240


def _child(npz_path: Path, out_path: Path) -> int:
    """Runs in the subprocess. Everything here is allowed to crash."""
    import open3d as o3d
    import pycolmap

    d = np.load(npz_path)
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(d["points"])
    pcd.normals = o3d.utility.Vector3dVector(d["normals"])
    if "colors" in d:
        pcd.colors = o3d.utility.Vector3dVector(d["colors"])

    # COLMAP's mesher works on files, so the cloud goes to disk beside the
    # output. Binary PLY — ascii would be several times the size for no gain.
    ply_in = out_path.with_name("poisson_in.ply")
    if not o3d.io.write_point_cloud(str(ply_in), pcd, write_ascii=False):
        return 5

    opts = pycolmap.PoissonMeshingOptions()
    opts.depth = int(d["depth"])
    opts.trim = float(d["trim"])
    pycolmap.poisson_meshing(
        input_path=str(ply_in), output_path=str(out_path), options=opts
    )

    if not out_path.exists():
        return 3
    mesh = o3d.io.read_triangle_mesh(str(out_path))
    if len(mesh.triangles) == 0:
        # Almost always the trim threshold sitting above the density range.
        return 4
    return 0


def mesh_out_of_process(
    points: np.ndarray,
    normals: np.ndarray,
    colors: np.ndarray | None,
    work_dir: Path,
    *,
    depth: int = POISSON_DEPTH,
    trim: float = POISSON_TRIM,
):
    """
    Poisson-mesh a cloud in a child process and read the result back.

    Returns an open3d TriangleMesh. Raises ReconstructionError — never
    crashes the caller — if the child dies, times out, or produces nothing.
    """
    import open3d as o3d

    work_dir.mkdir(parents=True, exist_ok=True)
    npz = work_dir / "poisson_in.npz"
    ply = work_dir / "poisson_out.ply"
    if ply.exists():
        ply.unlink()

    payload = {
        "points": np.asarray(points, dtype=np.float64),
        "normals": np.asarray(normals, dtype=np.float64),
        "depth": np.asarray(depth),
        "trim": np.asarray(trim),
    }
    if colors is not None:
        payload["colors"] = np.clip(np.asarray(colors, dtype=np.float64), 0, 1)
    np.savez(npz, **payload)

    try:
        proc = subprocess.run(
            [sys.executable, "-m", "src.recon.mesher", str(npz), str(ply)],
            cwd=str(Path(__file__).resolve().parents[2]),
            capture_output=True,
            timeout=MESH_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        raise ReconstructionError(
            f"Building the surface took longer than {MESH_TIMEOUT_S} seconds "
            "and was stopped. The scan is too large or too noisy to process.",
            stage="surface",
        ) from None

    if proc.returncode != 0 or not ply.exists():
        # Negative return codes are signals: -11 is SIGSEGV.
        if proc.returncode < 0:
            detail = f"the surface builder crashed (signal {-proc.returncode})"
        elif proc.returncode == 3:
            detail = "the surface builder produced no output"
        elif proc.returncode == 4:
            detail = "the surface builder produced an empty mesh"
        elif proc.returncode == 5:
            detail = "the point cloud could not be written for meshing"
        else:
            tail = proc.stderr.decode("utf-8", "replace").strip().splitlines()
            detail = tail[-1] if tail else f"exit code {proc.returncode}"
        raise ReconstructionError(
            f"Could not build a surface from this scan — {detail}. "
            "This usually means the photos did not cover enough of the foot, "
            "or moved too much between shots.",
            stage="surface",
        )

    mesh = o3d.io.read_triangle_mesh(str(ply))
    if len(mesh.triangles) == 0:
        raise ReconstructionError(
            "The surface builder returned an empty mesh.", stage="surface"
        )
    return mesh


if __name__ == "__main__":
    raise SystemExit(_child(Path(sys.argv[1]), Path(sys.argv[2])))
