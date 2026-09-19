"""
Video -> frames -> per-frame quality, all recorded to disk and SQLite.

This is the traceability layer. Before it, a scan that failed left nothing
behind: frames lived in a tempdir that was wiped, and the only evidence of why
they were rejected was a count in an error string. Now every frame that was
extracted is on disk with its scores next to it, whether it was used or not.

Scoring reuses `src/data/quality_gate.evaluate_quality` rather than
reimplementing blur/exposure/skin detection — same thresholds the rest of the
service already trusts, including its deliberately wide skin range that does
not fail on darker skin tones.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from src.data.quality_gate import evaluate_quality
from .config import CONFIG

log = logging.getLogger("soleiq.store.frames")

# Every reason a frame can be dropped. Kept as a closed set so the debug UI can
# group by it and so a typo cannot invent a new category.
REJECT_BLURRY = "blurry"
REJECT_DARK = "too_dark"
REJECT_BRIGHT = "too_bright"
REJECT_DUPLICATE = "duplicate"
REJECT_NO_FOOT = "foot_not_detected"
REJECT_INVALID = "invalid_image"

REJECT_REASONS = (
    REJECT_BLURRY, REJECT_DARK, REJECT_BRIGHT,
    REJECT_DUPLICATE, REJECT_NO_FOOT, REJECT_INVALID,
)


@dataclass
class FrameRecord:
    frame_index: int
    timestamp_ms: int
    image_path: str
    width: int
    height: int
    blur_score: float
    brightness_score: float
    skin_fraction: float
    similarity_prev: float | None
    novelty_score: float | None
    accepted: bool
    reject_reason: str | None

    def as_row(self) -> dict:
        return self.__dict__.copy()


@dataclass
class ExtractionResult:
    """Per-frame records plus what can only be said about the set as a whole."""
    records: list[FrameRecord]
    #: Distinct viewpoints among the ACCEPTED frames. See viewpoint_spread().
    viewpoint_spread: int


class ExtractionError(RuntimeError):
    """The video could not be read at all."""


def _analysis_gray(bgr: np.ndarray) -> np.ndarray:
    """Grayscale at a FIXED width, so thresholds mean one thing.

    Laplacian variance is strongly resolution-dependent — measured on one real
    photo it was ~180 at 1024px wide and ~8800 at 48x36, because downsampling
    aliases high-frequency detail back in. Scoring every frame at the same
    width is what makes `SOLEIQ_BLUR_MIN` a number you can reason about.
    """
    w = CONFIG.analysis_width
    h = max(1, round(bgr.shape[0] * w / bgr.shape[1]))
    small = cv2.resize(bgr, (w, h), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)


def _similarity(a: np.ndarray | None, b: np.ndarray) -> float | None:
    """1.0 == indistinguishable from the previous kept frame.

    Normalised correlation on a small grayscale thumbnail. Cheap, and immune to
    exposure drift, which would otherwise read as movement.
    """
    if a is None:
        return None
    fa = cv2.resize(a, (64, 48)).astype(np.float32).ravel()
    fb = cv2.resize(b, (64, 48)).astype(np.float32).ravel()
    fa -= fa.mean(); fb -= fb.mean()
    na, nb = np.linalg.norm(fa), np.linalg.norm(fb)
    if na < 1e-6 or nb < 1e-6:
        return 1.0
    return float(np.clip(fa.dot(fb) / (na * nb), -1.0, 1.0))


def _descriptor(gray: np.ndarray) -> np.ndarray:
    """A frame reduced to something comparable: 64x48, zero mean, unit norm.

    Normalising removes exposure differences, which would otherwise register
    as a change of viewpoint — a camera auto-exposing as it swings past a
    window must not read as a new angle.
    """
    v = cv2.resize(gray, (64, 48)).astype(np.float32).ravel()
    v -= v.mean()
    n = np.linalg.norm(v)
    return v / n if n > 1e-6 else v


def _novelty(desc: np.ndarray, window: list[np.ndarray]) -> float | None:
    """1 - max cosine similarity against recent accepted frames. 0 == a copy.

    Compared against a WINDOW rather than only the previous frame, and that is
    the point. A camera rocking between two positions produces a sequence in
    which every frame differs from its immediate predecessor while the set
    contains just two viewpoints. One-back comparison cannot see that.
    """
    if not window:
        return None
    return float(1.0 - max(float(desc.dot(w)) for w in window))


def viewpoint_spread(descriptors: list[np.ndarray], radius: float | None = None) -> int:
    """How many mutually dissimilar viewpoints a set of frames covers.

    Greedy single-pass clustering: a frame joins the first cluster whose
    representative it resembles, or starts a new one. Order-dependent and
    approximate, which is fine — the question is roughly how many sides of the
    foot were seen, and being off by one does not change the answer.

    THIS IS AN APPEARANCE PROXY, NOT A MEASURED ANGLE. Nothing in this path
    knows where the camera was; there is no pose information until COLMAP runs,
    and by then it is too late to tell the user to move. Two genuinely
    different angles almost always land in different clusters, and two frames
    of one angle under different lighting occasionally do too. It is a useful
    floor, not a measurement, and it must never be reported in degrees.
    """
    r = CONFIG.viewpoint_radius if radius is None else radius
    reps: list[np.ndarray] = []
    for d in descriptors:
        if not any(1.0 - float(d.dot(rep)) < r for rep in reps):
            reps.append(d)
    return len(reps)


def score_stills(
    still_paths: list[Path],
    frames_dir: Path,
) -> ExtractionResult:
    """Score full-resolution stills instead of re-extracting from the video.

    WHY THIS PATH EXISTS
    --------------------
    Video frames reach us through a lossy, inter-frame-predicted codec: a
    VP9 or H.264 P-frame is a prediction plus a residual, and the high-
    frequency detail feature matching depends on is exactly what the encoder
    spends its bits avoiding. The client already knows which instants were
    sharp, well exposed and newly-angled — it grabs a full-sensor original at
    each of them, so this scores real pixels.

    Same gates, same thresholds, same order as extract_and_score: only the
    source of the images differs, so the two are comparable in the debug UI.
    """
    frames_dir.mkdir(parents=True, exist_ok=True)
    records: list[FrameRecord] = []
    prev_kept: np.ndarray | None = None
    accepted_descs: list[np.ndarray] = []

    for index, src in enumerate(sorted(still_paths)):
        dest = frames_dir / f"frame-{index:04d}.jpg"
        bgr = cv2.imread(str(src))
        if bgr is None or bgr.size == 0:
            records.append(FrameRecord(
                index, index * 700, str(dest), 0, 0, 0.0, 0.0, 0.0, None, None,
                False, REJECT_INVALID))
            continue

        # Copied into frames/ so the debug UI, the bank and the reconstruction
        # input all read from one place regardless of which source was used.
        cv2.imwrite(str(dest), bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])

        gray = _analysis_gray(bgr)
        pil = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        sim = _similarity(prev_kept, gray)
        desc = _descriptor(gray)
        nov = _novelty(desc, accepted_descs[-CONFIG.novelty_window:])
        accepted, reason, m = _classify(gray, pil, sim)

        records.append(FrameRecord(
            frame_index=index,
            # Stills carry no timeline of their own; spacing them at the
            # sample interval keeps the debug cadence readout meaningful.
            timestamp_ms=index * 700,
            image_path=str(dest),
            width=int(bgr.shape[1]),
            height=int(bgr.shape[0]),
            blur_score=m["blur_score"],
            brightness_score=m["brightness_score"],
            skin_fraction=m["skin_fraction"],
            similarity_prev=sim,
            novelty_score=nov,
            accepted=accepted,
            reject_reason=reason,
        ))
        if accepted:
            prev_kept = gray
            accepted_descs.append(desc)

    if not records:
        raise ExtractionError("No usable stills were uploaded.")

    spread = viewpoint_spread(accepted_descs)
    log.info(
        "stills scored: %d supplied, %d accepted, %d distinct viewpoints",
        len(records), len(accepted_descs), spread,
    )
    return ExtractionResult(records=records, viewpoint_spread=spread)


def spread_of_paths(paths: list[str], radius: float | None = None) -> int:
    """Viewpoint spread over frames already on disk.

    Used for the accumulated bank, whose frames come from several separate
    recordings and so cannot be scored in one pass through a video.
    Unreadable files are skipped rather than counted as a viewpoint.
    """
    descs = []
    for path in paths:
        img = cv2.imread(path)
        if img is None:
            log.warning("bank frame unreadable, skipping: %s", path)
            continue
        descs.append(_descriptor(_analysis_gray(img)))
    return viewpoint_spread(descs, radius)


#: A frame that passed quality but shows an angle the bank already holds.
BANK_SAME_VIEWPOINT = "same_viewpoint"


def _descriptors_for(paths: list[str]) -> list[np.ndarray]:
    out = []
    for path in paths:
        img = cv2.imread(path)
        if img is None:
            log.warning("bank frame unreadable, skipping: %s", path)
            continue
        out.append(_descriptor(_analysis_gray(img)))
    return out


def admit_to_bank(
    existing_paths: list[str],
    candidates: list[tuple[int, str]],
    novelty_min: float | None = None,
) -> tuple[dict[int, tuple[bool, str | None]], int]:
    """Decide which of a scan's usable frames actually go into the bank.

    A frame is admitted when it differs enough from EVERYTHING the bank
    already holds — including frames admitted moments earlier from this same
    scan. Compared against the whole bank rather than a recent window, because
    the question here is "do we already have this angle", and a bank spans
    several recordings that may revisit the same side of the foot.

    Returns per-frame decisions and the number admitted.

    This is the check that makes accumulation meaningful. Without it, scanning
    the same static view five times banks a hundred frames and one viewpoint,
    which reconstructs exactly as badly as twenty frames and one viewpoint —
    measured: uploading one static capture twice gave 28 frames at spread 1.
    """
    threshold = CONFIG.bank_novelty_min if novelty_min is None else novelty_min
    bank = _descriptors_for(existing_paths)
    decisions: dict[int, tuple[bool, str | None]] = {}
    admitted = 0
    for index, path in candidates:
        img = cv2.imread(path)
        if img is None:
            decisions[index] = (False, REJECT_INVALID)
            continue
        d = _descriptor(_analysis_gray(img))
        nov = 1.0 - max((float(d.dot(b)) for b in bank), default=-1.0)
        if bank and nov < threshold:
            decisions[index] = (False, BANK_SAME_VIEWPOINT)
            continue
        decisions[index] = (True, None)
        bank.append(d)
        admitted += 1
    log.info(
        "bank admission: %d/%d candidates admitted (novelty >= %.3f vs %d held)",
        admitted, len(candidates), threshold, len(existing_paths),
    )
    return decisions, admitted


def _classify(gray: np.ndarray, pil: Image.Image, sim: float | None) -> tuple[bool, str | None, dict]:
    """Score one frame and decide. Returns (accepted, reason, metrics)."""
    q = evaluate_quality(pil)
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    luma = float(gray.mean())
    skin = float(q.skin_fraction)
    metrics = {"blur_score": blur, "brightness_score": luma, "skin_fraction": skin}

    # Order matters: report the most actionable problem first. "Too dark" is
    # more useful to a user than "blurry" when the frame is both, because
    # darkness is what caused the blur.
    if luma < CONFIG.brightness_min:
        return False, REJECT_DARK, metrics
    if luma > CONFIG.brightness_max:
        return False, REJECT_BRIGHT, metrics
    if blur < CONFIG.blur_min:
        return False, REJECT_BLURRY, metrics
    if skin < CONFIG.skin_fraction_min:
        # Crude: a skin-coloured-pixel fraction, not a foot detector. It
        # catches a lens cap or a photo of the floor, nothing subtler.
        return False, REJECT_NO_FOOT, metrics
    if sim is not None and sim > CONFIG.duplicate_max_similarity:
        # Near-identical frames add no baseline for structure-from-motion.
        return False, REJECT_DUPLICATE, metrics
    return True, None, metrics


def extract_and_score(
    video_path: Path,
    frames_dir: Path,
    *,
    target_frames: int | None = None,
) -> ExtractionResult:
    """
    Decode the video, sample evenly to `target_frames`, save and score each.

    EVERY sampled frame is written to disk, accepted or not — that is the whole
    point. A rejected frame you cannot look at is not traceability.
    """
    target = target_frames or CONFIG.target_frames
    frames_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ExtractionError(
            f"Could not open the uploaded video ({video_path.name}). "
            "The format may not be decodable by this build of OpenCV."
        )

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 30.0
    log.info(
        "extract: %s | reported frames=%d fps=%.1f | targeting %d",
        video_path.name, total, fps, target,
    )

    # Even sampling across the whole clip. Reported frame counts from WebM are
    # often slightly wrong, so a sequential read with a modulo is used rather
    # than seeking, which is both faster and more reliable here.
    step = max(1, round(total / target)) if total > 0 else 1

    records: list[FrameRecord] = []
    prev_kept: np.ndarray | None = None
    # Descriptors of accepted frames: the last few answer "is this a copy of
    # something recent", all of them answer "did this scan cover any ground".
    accepted_descs: list[np.ndarray] = []
    src_index = 0
    kept_index = 0

    while len(records) < target:
        ok, bgr = cap.read()
        if not ok:
            break
        if src_index % step != 0:
            src_index += 1
            continue

        ts_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC)) or int(src_index / fps * 1000)
        path = frames_dir / f"frame-{kept_index:04d}.jpg"

        if bgr is None or bgr.size == 0:
            records.append(FrameRecord(
                kept_index, ts_ms, str(path), 0, 0, 0.0, 0.0, 0.0, None, None,
                False, REJECT_INVALID))
            kept_index += 1
            src_index += 1
            continue

        # Written before scoring, deliberately: a frame that fails must still
        # be on disk to be looked at.
        cv2.imwrite(str(path), bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])

        gray = _analysis_gray(bgr)
        pil = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        sim = _similarity(prev_kept, gray)
        desc = _descriptor(gray)
        nov = _novelty(desc, accepted_descs[-CONFIG.novelty_window:])
        accepted, reason, m = _classify(gray, pil, sim)

        records.append(FrameRecord(
            frame_index=kept_index,
            timestamp_ms=ts_ms,
            image_path=str(path),
            width=int(bgr.shape[1]),
            height=int(bgr.shape[0]),
            blur_score=m["blur_score"],
            brightness_score=m["brightness_score"],
            skin_fraction=m["skin_fraction"],
            similarity_prev=sim,
            novelty_score=nov,
            accepted=accepted,
            reject_reason=reason,
        ))
        if accepted:
            prev_kept = gray
            accepted_descs.append(desc)
        log.debug(
            "frame %04d t=%dms blur=%.1f luma=%.1f skin=%.3f sim=%s nov=%s -> %s",
            kept_index, ts_ms, m["blur_score"], m["brightness_score"],
            m["skin_fraction"], f"{sim:.3f}" if sim is not None else "-",
            f"{nov:.3f}" if nov is not None else "-",
            "ACCEPT" if accepted else f"REJECT({reason})",
        )
        kept_index += 1
        src_index += 1

    cap.release()

    if not records:
        raise ExtractionError(
            "No frames could be decoded from the uploaded video."
        )

    accepted_n = sum(1 for r in records if r.accepted)
    spread = viewpoint_spread(accepted_descs)
    log.info(
        "extract done: %d frames written, %d accepted, %d rejected, "
        "%d distinct viewpoints (radius %.2f)",
        len(records), accepted_n, len(records) - accepted_n,
        spread, CONFIG.viewpoint_radius,
    )
    return ExtractionResult(records=records, viewpoint_spread=spread)
