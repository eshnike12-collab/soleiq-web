"""
Reconstruction endpoints.

    POST   /reconstruct                        -> {"job_id": ...}   (async)
    GET    /reconstruct/{job_id}               -> job state
    GET    /reconstruct/{job_id}/artifact/{n}  -> model.glb / cameras.json / quality.json
    DELETE /reconstruct/{job_id}               -> purge frames + artifacts

Kept in its own router rather than added to app.py, so the existing /predict
service is untouched and this can be mounted or not independently.

The GET response is exactly the shape `reconJobSchema` validates on the
client — a done job always carries artifacts and a quality report, a failed
job always carries a readable reason.
"""

from __future__ import annotations

import re
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from src.recon.compare import align
from src.recon.errors import ReconstructionError
from src.recon.jobs import create_job, get_job, purge, submit

router = APIRouter(tags=["reconstruction"])

# Frames land here, one directory per job. tempdir rather than the repo so a
# crash cannot leave patient photographs inside a git working tree.
JOB_ROOT = Path(tempfile.gettempdir()) / "soleiq-recon"

# Only these three artifacts are downloadable, by exact name. Anything else
# is a path-traversal attempt or a bug.
ALLOWED_ARTIFACTS = {"model.glb", "cameras.json", "quality.json"}

MAX_FRAMES = 120
SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


@router.post("/reconstruct")
async def start_reconstruction(
    frames: list[UploadFile] = File(...),
    visit_id: str = Form(...),
    side: str = Form(...),
    scale_method: str = Form("anthropometric"),
    foot_length_mm: float | None = Form(None),
    sequential: bool = Form(True),
):
    """
    Accept a capture and start reconstructing. Returns immediately.

    `foot_length_mm` supplies anthropometric scale. Without it the model is
    built in SfM units and `quality.json` records `scaleMethod: "unscaled"`,
    which the client must treat as "display no measurements".
    """
    if side not in ("left", "right"):
        raise HTTPException(422, "side must be 'left' or 'right'")
    if scale_method not in ("fiducial", "anthropometric"):
        raise HTTPException(422, "scale_method must be 'fiducial' or 'anthropometric'")
    if not frames:
        raise HTTPException(422, "no frames supplied")
    if len(frames) > MAX_FRAMES:
        raise HTTPException(413, f"too many frames (max {MAX_FRAMES})")
    if scale_method == "fiducial":
        # Detecting the marker is implemented (scale.detect_aruco_edge_px) but
        # not yet wired into the pipeline, so accepting this would silently
        # produce anthropometric or unscaled output under a 'fiducial' label —
        # exactly the mislabelling this service must not do.
        raise HTTPException(
            501,
            "fiducial scaling is not wired into the pipeline yet; "
            "send scale_method=anthropometric with foot_length_mm",
        )

    job = create_job(visit_id=visit_id, side=side, root=JOB_ROOT / "pending")
    job.root = JOB_ROOT / job.job_id
    frame_dir = job.root / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)

    for i, f in enumerate(frames):
        # Never trust a client-supplied filename on a path join.
        suffix = Path(f.filename or "").suffix.lower()
        if suffix not in (".jpg", ".jpeg", ".png"):
            suffix = ".jpg"
        dest = frame_dir / f"frame_{i:04d}{suffix}"
        if not SAFE_NAME.match(dest.name):
            raise HTTPException(422, "invalid frame name")
        with dest.open("wb") as out:
            shutil.copyfileobj(f.file, out)

    submit(job, foot_length_mm=foot_length_mm, sequential=sequential)
    return {"job_id": job.job_id}


@router.get("/reconstruct/{job_id}")
async def reconstruction_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "no such job")
    return job.snapshot()


@router.get("/reconstruct/{job_id}/artifact/{name}")
async def reconstruction_artifact(job_id: str, name: str):
    if name not in ALLOWED_ARTIFACTS:
        raise HTTPException(404, "no such artifact")
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "no such job")
    if job.status != "done":
        raise HTTPException(409, f"job is {job.status}, not done")

    path = (job.root / "out" / name).resolve()
    # Belt and braces: the name is already allow-listed, but confirm the
    # resolved path really is inside this job's directory.
    if not str(path).startswith(str(job.root.resolve())) or not path.exists():
        raise HTTPException(404, "artifact missing")

    media = "model/gltf-binary" if name.endswith(".glb") else "application/json"
    return FileResponse(path, media_type=media, filename=name)


@router.post("/compare")
async def compare_models(
    previous: UploadFile = File(...),
    current: UploadFile = File(...),
):
    """
    Rigidly align two models and report how well they fit.

    Takes the .glb files themselves rather than job ids so it works for models
    that have been stored durably and whose jobs are long gone.

    The response always carries `fitness` and `relative_rmse`, and `reliable`
    is false when either is poor. A caller that draws an overlay anyway is
    showing registration error as anatomical change.
    """
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        prev_path = tmpdir / "previous.glb"
        curr_path = tmpdir / "current.glb"
        for upload, dest in ((previous, prev_path), (current, curr_path)):
            with dest.open("wb") as out:
                shutil.copyfileobj(upload.file, out)
        try:
            result = align(prev_path, curr_path)
        except ReconstructionError as e:
            raise HTTPException(422, str(e)) from None
    return result.to_dict()


@router.delete("/reconstruct/{job_id}")
async def delete_reconstruction(job_id: str):
    """Purge the uploaded frames and every derived artifact. Idempotent."""
    return {"purged": purge(job_id)}
