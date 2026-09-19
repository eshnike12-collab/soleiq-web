"""
The scan lifecycle: upload -> extract -> score -> reconstruct -> record.

Sits between the HTTP layer and the existing reconstruction pipeline. Its one
job is that nothing is lost: every step writes its outcome to SQLite before
moving on, so a scan that dies halfway still explains itself.

Only accepted frames are handed to reconstruction. Rejected frames stay on
disk and in the database so the decision can be reviewed.
"""

from __future__ import annotations

import json
import logging
import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from src.recon import ReconstructionError, reconstruct
from . import db
from .config import CONFIG
from .frames import (
    ExtractionError,
    score_stills,
    admit_to_bank,
    extract_and_score,
    spread_of_paths,
)

log = logging.getLogger("soleiq.store.scan")

# One at a time: reconstruction is CPU- and GPU-bound, and two concurrent runs
# on this hardware make both slower than running them in sequence.
_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="scan")
_LOCK = threading.Lock()


def new_scan_id() -> str:
    return uuid.uuid4().hex


def scan_dir(scan_id: str) -> Path:
    return CONFIG.scans_dir / scan_id


def paths_for(scan_id: str) -> dict[str, Path]:
    root = scan_dir(scan_id)
    return {
        "root": root,
        "raw": root / "raw",
        "stills": root / "raw" / "stills",
        "frames": root / "frames",
        "artifacts": root / "artifacts",
    }


def create_scan(side: str | None = None, bank_id: str | None = None) -> str:
    """Register a scan and lay out its directories. Returns the scanId."""
    scan_id = new_scan_id()
    p = paths_for(scan_id)
    for d in ("raw", "frames", "artifacts"):
        p[d].mkdir(parents=True, exist_ok=True)
    db.create_scan(scan_id, side, bank_id)
    log.info("scan created: %s (side=%s) at %s", scan_id, side, p["root"])
    return scan_id


def save_video(scan_id: str, source, filename: str) -> Path:
    """Persist the uploaded video verbatim under the scan's raw/ directory."""
    suffix = Path(filename or "").suffix.lower() or ".webm"
    if suffix not in (".webm", ".mp4", ".mov", ".mkv"):
        suffix = ".webm"
    dest = paths_for(scan_id)["raw"] / f"video{suffix}"
    with dest.open("wb") as out:
        shutil.copyfileobj(source, out)
    size = dest.stat().st_size
    db.update_scan(scan_id, status="uploaded", raw_video_path=str(dest))
    log.info("scan %s: video saved %s (%.1f MB)", scan_id, dest, size / 1e6)
    if size == 0:
        raise ExtractionError("The uploaded video was empty (0 bytes).")
    return dest


def save_stills(scan_id: str, uploads) -> int:
    """Persist the client's full-resolution stills. Returns how many landed.

    Best effort per file: one unreadable still must not fail a scan that has
    thirty good ones. The count is what decides whether this source is used
    (see process()).
    """
    dest_dir = paths_for(scan_id)["stills"]
    dest_dir.mkdir(parents=True, exist_ok=True)
    saved = 0
    for index, upload in enumerate(uploads or []):
        try:
            dest = dest_dir / f"still-{index:04d}.jpg"
            with dest.open("wb") as out:
                shutil.copyfileobj(upload.file, out)
            if dest.stat().st_size == 0:
                dest.unlink(missing_ok=True)
                continue
            saved += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("scan %s: still %d could not be saved: %s", scan_id, index, exc)
    if saved:
        log.info("scan %s: %d stills saved", scan_id, saved)
    return saved


def process(scan_id: str, *, foot_length_mm: float | None, side: str) -> None:
    """Run the whole pipeline for a scan. Intended for a worker thread."""
    p = paths_for(scan_id)
    row = db.get_scan(scan_id)
    if not row or not row.get("raw_video_path"):
        log.error("scan %s: no raw video recorded, cannot process", scan_id)
        db.update_scan(scan_id, status="failed",
                       failure_stage="upload",
                       failure_reason="No raw video was saved for this scan.")
        return

    # ---- extract + score --------------------------------------------------
    try:
        db.update_scan(scan_id, status="extracting")
        # Prefer the client's full-resolution stills when it managed to send
        # them: they are originals, where the video frames are compressed
        # predictions of originals. The video is still kept, so a scan can be
        # re-scored later either way.
        stills = sorted(p["stills"].glob("*.jpg")) if p["stills"].exists() else []
        if len(stills) >= CONFIG.min_accepted_frames:
            frame_source = "stills"
            extraction = score_stills(stills, p["frames"])
        else:
            if stills:
                log.info(
                    "scan %s: only %d stills supplied (need %d) — falling back "
                    "to video extraction",
                    scan_id, len(stills), CONFIG.min_accepted_frames,
                )
            frame_source = "video"
            extraction = extract_and_score(Path(row["raw_video_path"]), p["frames"])
        log.info("scan %s: frame source = %s", scan_id, frame_source)
        records = extraction.records
    except ExtractionError as e:
        log.error("scan %s: extraction failed: %s", scan_id, e)
        db.update_scan(scan_id, status="failed", failure_stage="extract",
                       failure_reason=str(e))
        return

    db.update_scan(scan_id, status="scoring")
    db.insert_frames(scan_id, [r.as_row() for r in records])
    accepted = [r for r in records if r.accepted]
    db.update_scan(
        scan_id,
        total_frames=len(records),
        accepted_frames=len(accepted),
        rejected_frames=len(records) - len(accepted),
        viewpoint_spread=extraction.viewpoint_spread,
    )
    summary = db.reject_summary(scan_id)
    log.info("scan %s: %d/%d accepted | %s", scan_id, len(accepted), len(records), summary)

    # ---- the bank ---------------------------------------------------------
    #
    # Usable frames are kept and pooled across attempts rather than discarded
    # when one sweep falls short. A scan that yields 14 good frames is not a
    # failure, it is 14 frames of progress — the next attempt adds to it and
    # reconstruction runs on the pile once the pile is big enough.
    #
    # A scan with no bank_id is its own bank of one, which preserves the old
    # single-shot behaviour for any caller that does not opt in.
    bank_id = row.get("bank_id") or scan_id

    # Only frames showing an angle the bank does not already hold are saved.
    # Quality acceptance and bank admission are recorded separately so the
    # debug UI can say which of the two a frame failed.
    existing = [f["image_path"] for f in db.get_bank_frames(bank_id)]
    decisions, admitted = admit_to_bank(
        existing, [(r.frame_index, r.image_path) for r in accepted]
    )
    db.set_banked(scan_id, decisions)
    log.info(
        "scan %s: %d of %d usable frames added new viewpoints to bank %s",
        scan_id, admitted, len(accepted), bank_id,
    )

    bank_frames = db.get_bank_frames(bank_id)
    bank_paths = [f["image_path"] for f in bank_frames]
    bank_spread = spread_of_paths(bank_paths)
    prior = len(bank_frames) - admitted
    log.info(
        "scan %s: bank %s now holds %d accepted frames (+%d this scan) "
        "across %d viewpoints",
        scan_id, bank_id, len(bank_frames), len(accepted), bank_spread,
    )

    # Short of the floor is "keep going", not "failed". The frames are on disk
    # and counted; the user is told what is still missing.
    if len(bank_frames) < CONFIG.min_accepted_frames:
        breakdown = ", ".join(f"{n} {r}" for r, n in summary.items() if r != "accepted")
        short = CONFIG.min_accepted_frames - len(bank_frames)
        reason = (
            f"Kept {admitted} new viewpoints from this scan"
            + (f" ({len(accepted) - admitted} repeated angles already held)"
               if admitted < len(accepted) else "")
            + (f" (bank now holds {len(bank_frames)})" if prior else "")
            + f". {short} more needed before a model can be built."
            + (f" Rejected this scan: {breakdown}." if breakdown else "")
        )
        log.info("scan %s: %s", scan_id, reason)
        db.update_scan(scan_id, status="banked", failure_stage="quality",
                       failure_reason=reason)
        return

    # Enough frames is not the same as enough scan, and conflating the two is
    # what let a bad capture through. Frames taken from one position have no
    # parallax, so structure-from-motion has nothing to triangulate — it then
    # fails deep inside COLMAP with "the scan needs more overlap", which tells
    # the user nothing they can act on. Checked here instead, before minutes
    # of reconstruction are spent, and phrased as the thing to do differently.
    if bank_spread < CONFIG.min_viewpoints:
        reason = (
            f"The bank holds {len(bank_frames)} usable frames but they cover only "
            f"about {bank_spread} distinct viewpoints, and {CONFIG.min_viewpoints} "
            f"are needed. Scan again from angles you have not captured yet — move "
            f"the camera farther around the foot."
        )
        log.info("scan %s: %s", scan_id, reason)
        db.update_scan(scan_id, status="banked", failure_stage="diversity",
                       failure_reason=reason)
        return

    # ---- reconstruct (the whole bank) -------------------------------------
    recon_input = p["root"] / "recon_input"
    shutil.rmtree(recon_input, ignore_errors=True)
    recon_input.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(bank_frames):
        shutil.copy(f["image_path"], recon_input / f"frame_{i:04d}.jpg")

    db.update_scan(scan_id, status="reconstructing", viewpoint_spread=bank_spread)
    log.info("scan %s: reconstruction starting with %d banked frames", scan_id, len(bank_frames))
    try:
        result = reconstruct(
            image_dir=recon_input,
            work_dir=p["root"] / "work",
            out_dir=p["artifacts"],
            foot_length_mm=foot_length_mm,
            sequential=True,
        )
    except ReconstructionError as e:
        log.error("scan %s: reconstruction failed at %s: %s", scan_id, e.stage, e)
        db.update_scan(scan_id, status="failed", failure_stage=e.stage,
                       failure_reason=str(e))
        return
    except Exception as e:  # noqa: BLE001
        log.exception("scan %s: unexpected reconstruction error", scan_id)
        db.update_scan(scan_id, status="failed", failure_stage="reconstruct",
                       failure_reason=f"Unexpected error: {type(e).__name__}: {e}")
        return

    artifacts = {
        "glb": str(result.glb_path),
        "cameras": str(result.cameras_path),
        "quality": str(result.quality_path),
    }
    db.update_scan(
        scan_id,
        status="done",
        artifacts_json=json.dumps(artifacts),
        quality_json=json.dumps(result.quality),
    )
    log.info("scan %s: DONE — %s", scan_id, artifacts["glb"])


def submit(scan_id: str, *, foot_length_mm: float | None, side: str) -> None:
    _EXECUTOR.submit(process, scan_id, foot_length_mm=foot_length_mm, side=side)


def delete_scan(scan_id: str) -> bool:
    """Remove a scan's files and its rows. Frames are PHI; this is the purge."""
    shutil.rmtree(scan_dir(scan_id), ignore_errors=True)
    with db.connect() as c:
        c.execute("delete from frames where scan_id = ?", (scan_id,))
        cur = c.execute("delete from scans where scan_id = ?", (scan_id,))
        return cur.rowcount > 0
