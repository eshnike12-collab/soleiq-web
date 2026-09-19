"""
Async reconstruction jobs.

A reconstruction takes ~20 s on the fixture and will take longer on a full
orbit, so POST /reconstruct cannot block the request. This is a small
in-process job registry: a thread pool, a dict of job records, and a lock.

Deliberately not Celery/RQ/Redis. There is one server, one clinician at a
time, and jobs do not need to survive a restart — a lost job means "run the
scan again", not a lost record, because nothing is written to the patient's
chart until the model is complete. When that stops being true this should be
replaced rather than extended.

PHI: `purge` deletes the uploaded frames and every artifact. The API exposes
it as DELETE /reconstruct/{job_id} so a patient's raw frames can be removed
on request, which §7 requires.
"""

from __future__ import annotations

import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from .errors import ReconstructionError
from .pipeline import reconstruct

JobStatus = Literal["queued", "running", "failed", "done"]
JobStage = Literal[
    "queued", "matching", "reconstructing", "texturing", "annotating", "ready"
]

# One at a time. Reconstruction is CPU- and GPU-bound and two concurrent runs
# on this hardware make both slower than running them in sequence.
_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="recon")


@dataclass
class Job:
    job_id: str
    visit_id: str
    side: str
    root: Path
    status: JobStatus = "queued"
    stage: JobStage = "queued"
    progress: float = 0.0
    error: str | None = None
    quality: dict | None = None
    artifacts: dict | None = None
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def snapshot(self) -> dict:
        """
        The exact shape `reconJobSchema` validates on the client.

        The invariants the schema enforces are enforced here too: a done job
        always carries artifacts and quality, a failed job always carries a
        reason.
        """
        with self._lock:
            return {
                "job_id": self.job_id,
                "status": self.status,
                "progress": round(self.progress, 3),
                "error": self.error,
                "artifacts": dict(self.artifacts) if self.artifacts else None,
                "quality": dict(self.quality) if self.quality else None,
                "stage": self.stage,
            }


_JOBS: dict[str, Job] = {}
_JOBS_LOCK = threading.Lock()


def create_job(*, visit_id: str, side: str, root: Path) -> Job:
    job = Job(job_id=uuid.uuid4().hex, visit_id=visit_id, side=side, root=root)
    with _JOBS_LOCK:
        _JOBS[job.job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    with _JOBS_LOCK:
        return _JOBS.get(job_id)


def submit(job: Job, *, foot_length_mm: float | None, sequential: bool) -> None:
    _EXECUTOR.submit(_run, job, foot_length_mm, sequential)


def _run(job: Job, foot_length_mm: float | None, sequential: bool) -> None:
    def progress(frac: float, stage: str) -> None:
        with job._lock:
            job.progress = float(frac)
            job.stage = stage  # type: ignore[assignment]

    with job._lock:
        job.status = "running"
        job.stage = "matching"

    try:
        result = reconstruct(
            image_dir=job.root / "frames",
            work_dir=job.root / "work",
            out_dir=job.root / "out",
            foot_length_mm=foot_length_mm,
            sequential=sequential,
            progress=progress,
        )
    except ReconstructionError as e:
        with job._lock:
            job.status = "failed"
            job.error = str(e)
            job.stage = e.stage  # type: ignore[assignment]
            job.progress = 1.0
        return
    except Exception as e:  # noqa: BLE001
        # Anything unexpected still has to reach the user as a job failure
        # rather than a silent stall. The detail is deliberately generic —
        # a stack trace is not something to show a patient.
        with job._lock:
            job.status = "failed"
            job.error = (
                "The scan could not be processed because of an internal error. "
                "Please try again."
            )
            job.progress = 1.0
        raise

    with job._lock:
        job.status = "done"
        job.stage = "ready"
        job.progress = 1.0
        job.quality = result.quality
        job.artifacts = {
            "glb": f"/reconstruct/{job.job_id}/artifact/model.glb",
            "cameras": f"/reconstruct/{job.job_id}/artifact/cameras.json",
            "quality": f"/reconstruct/{job.job_id}/artifact/quality.json",
            "pointcloud": None,
        }


def purge(job_id: str) -> bool:
    """
    Delete a job's frames and artifacts. Idempotent.

    Both the uploaded photographs and the derived model are PHI, so this
    removes the whole job directory, not just the outputs.
    """
    with _JOBS_LOCK:
        job = _JOBS.pop(job_id, None)
    if job is None:
        return False
    shutil.rmtree(job.root, ignore_errors=True)
    return True
