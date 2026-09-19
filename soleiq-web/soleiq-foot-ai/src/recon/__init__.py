"""
Photogrammetric reconstruction for SoleIQ.

Turns a set of overlapping photographs of one foot into a colored 3D surface
with real camera poses and an honest quality report.

What this actually is, so nobody has to guess from the module names:

    poses      pycolmap incremental SfM (CPU). Real COLMAP, in-process.
    dense      Depth Anything V2 Small (Apache-2.0), per-frame relative
               inverse depth, aligned to the SfM sparse points to recover
               scale and shift for that frame.
    surface    Open3D Poisson reconstruction over the fused colored cloud.
    color      Per-vertex, carried from the source pixels. NOT a UV texture:
               xatlas would not build on this machine, so `textureKind` is
               always "vertex_color" and quality.json says so.

COLMAP's dense MVS (patch_match_stereo) is CUDA-only and this machine has no
CUDA (`pycolmap.has_cuda == False`), which is why dense geometry comes from a
learned model rather than from MVS. That makes the honest pipeline label
"feedforward" even though the poses are genuine COLMAP; `quality.json`
records the pose source separately so the distinction is not lost.

Nothing in this package will invent geometry. Every failure path raises
ReconstructionError with a reason a clinician could read, and the caller is
expected to surface it rather than substitute a placeholder.
"""

from .errors import ReconstructionError
from .pipeline import ReconstructionResult, reconstruct

__all__ = ["ReconstructionError", "ReconstructionResult", "reconstruct"]
