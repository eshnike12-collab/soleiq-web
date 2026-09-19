"""Video loading for rPPG.

The one thing that matters here is getting the *frame rate right*. Every
downstream number — pulse rate in bpm, the 0.75-2.5 Hz band edges, the
bandpass coefficients — is scaled by fps. A clip read at an assumed 30 fps
that was actually recorded at 24 fps yields a heart rate that is wrong by
25% and looks completely plausible.

iPhones record variable-frame-rate video. The container's nominal FPS is a
*declaration*, not a measurement: it is frequently 30.0 for a clip whose
real inter-frame spacing wanders between 28 and 32 fps, and under low light
iOS will silently halve the capture rate. So this module reads
`CAP_PROP_POS_MSEC` for every frame, derives an effective fps from the
timestamps, and reports the disagreement. Callers get both numbers and a
`fps_source` telling them which one was used.

Memory: rPPG only ever consumes *spatial averages* over the ROI, so full
sensor resolution is wasted. Frames are downscaled to a configured analysis
width on load (default 256 px). A 30 s clip then costs ~400 MB as float32
rather than ~4.5 GB.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, List, Optional, Tuple

import cv2
import numpy as np


@dataclass
class VideoClip:
    """A decoded clip plus everything needed to trust its time axis.

    `frames` is [T, H, W, 3] float32 RGB in 0..1 — the layout the rest of
    the perfusion package expects.
    """

    frames: np.ndarray
    fps: float
    fps_source: str                      # "timestamps" | "container" | "fallback"
    fps_container: float
    fps_effective: Optional[float]
    timestamps_ms: Optional[np.ndarray]
    frame_interval_jitter_ms: float
    path: Path
    source_size: Tuple[int, int]         # (width, height) as recorded
    analysis_size: Tuple[int, int]       # (width, height) after downscale
    n_frames_declared: int
    truncated: bool                      # hit max_frames before EOF
    warnings: List[str] = field(default_factory=list)

    @property
    def n_frames(self) -> int:
        return int(self.frames.shape[0])

    @property
    def duration_s(self) -> float:
        if self.fps <= 0:
            return 0.0
        return float(self.n_frames) / float(self.fps)

    def to_dict(self) -> dict:
        return {
            "path": str(self.path),
            "n_frames": self.n_frames,
            "fps": float(self.fps),
            "fps_source": self.fps_source,
            "fps_container": float(self.fps_container),
            "fps_effective": (
                float(self.fps_effective) if self.fps_effective is not None else None
            ),
            "frame_interval_jitter_ms": float(self.frame_interval_jitter_ms),
            "duration_s": float(self.duration_s),
            "source_size": list(self.source_size),
            "analysis_size": list(self.analysis_size),
            "n_frames_declared": int(self.n_frames_declared),
            "truncated": bool(self.truncated),
            "warnings": list(self.warnings),
        }


class VideoReadError(RuntimeError):
    """Raised when a clip cannot be opened or contains no decodable frames."""


def _resize_width(frame: np.ndarray, max_width: Optional[int]) -> np.ndarray:
    if not max_width or frame.shape[1] <= max_width:
        return frame
    scale = float(max_width) / float(frame.shape[1])
    new_h = max(1, int(round(frame.shape[0] * scale)))
    # INTER_AREA is the correct kernel for downscaling: it averages the
    # source pixels in each output cell, which is exactly the spatial mean
    # rPPG wants. INTER_LINEAR would alias high-frequency skin texture.
    return cv2.resize(frame, (max_width, new_h), interpolation=cv2.INTER_AREA)


def iter_frames(
    path: str | Path,
    max_width: Optional[int] = None,
    max_frames: Optional[int] = None,
) -> Iterator[Tuple[np.ndarray, float]]:
    """Stream (frame_rgb_float32_0_1, timestamp_ms) without holding the clip.

    Used by callers that only need running statistics and cannot afford to
    materialise the whole array.
    """
    path = Path(path)
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise VideoReadError(f"could not open video: {path}")
    try:
        i = 0
        while True:
            if max_frames is not None and i >= max_frames:
                break
            # Read the timestamp BEFORE grabbing: CAP_PROP_POS_MSEC advances
            # to the *next* frame's position once read() succeeds.
            ts = float(cap.get(cv2.CAP_PROP_POS_MSEC))
            ok, bgr = cap.read()
            if not ok or bgr is None:
                break
            bgr = _resize_width(bgr, max_width)
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            yield rgb.astype(np.float32) / 255.0, ts
            i += 1
    finally:
        cap.release()


def load_video(
    path: str | Path,
    max_width: Optional[int] = 256,
    max_frames: Optional[int] = 1800,
    fps_disagreement_tolerance: float = 0.5,
    fallback_fps: float = 30.0,
) -> VideoClip:
    """Decode a clip to [T, H, W, 3] float32 RGB with a trustworthy fps.

    Raises VideoReadError if the file cannot be opened or decodes to fewer
    than two frames (one frame has no time axis and no pulse).
    """
    path = Path(path)
    if not path.exists():
        raise VideoReadError(f"video not found: {path}")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise VideoReadError(
            f"could not open video: {path} "
            "(OpenCV was built with FFMPEG/AVFoundation; check the codec)"
        )

    warnings: List[str] = []
    try:
        fps_container = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        n_declared = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        frames: List[np.ndarray] = []
        stamps: List[float] = []
        truncated = False
        while True:
            if max_frames is not None and len(frames) >= max_frames:
                # Peek: only flag truncation if there was actually more.
                truncated = cap.grab()
                break
            ts = float(cap.get(cv2.CAP_PROP_POS_MSEC))
            ok, bgr = cap.read()
            if not ok or bgr is None:
                break
            frames.append(cv2.cvtColor(_resize_width(bgr, max_width), cv2.COLOR_BGR2RGB))
            stamps.append(ts)
    finally:
        cap.release()

    if len(frames) < 2:
        raise VideoReadError(
            f"decoded {len(frames)} frame(s) from {path}; need at least 2"
        )

    arr = np.stack(frames, axis=0).astype(np.float32) / 255.0
    del frames

    timestamps = np.asarray(stamps, dtype=np.float64)
    fps_effective, jitter_ms = _fps_from_timestamps(timestamps)

    fps, fps_source = _choose_fps(
        fps_container=fps_container,
        fps_effective=fps_effective,
        tolerance=fps_disagreement_tolerance,
        fallback=fallback_fps,
        warnings=warnings,
    )

    if truncated:
        warnings.append(
            f"clip truncated to max_frames={max_frames} "
            f"({len(arr) / fps:.1f} s analysed)"
        )
    if jitter_ms > 0 and fps > 0 and jitter_ms > (1000.0 / fps) * 0.25:
        warnings.append(
            f"irregular frame spacing (jitter {jitter_ms:.1f} ms vs nominal "
            f"{1000.0 / fps:.1f} ms) — variable-frame-rate capture degrades rPPG"
        )

    return VideoClip(
        frames=arr,
        fps=fps,
        fps_source=fps_source,
        fps_container=fps_container,
        fps_effective=fps_effective,
        timestamps_ms=timestamps,
        frame_interval_jitter_ms=jitter_ms,
        path=path,
        source_size=(src_w, src_h),
        analysis_size=(int(arr.shape[2]), int(arr.shape[1])),
        n_frames_declared=n_declared,
        truncated=truncated,
        warnings=warnings,
    )


def _fps_from_timestamps(
    timestamps_ms: np.ndarray,
) -> Tuple[Optional[float], float]:
    """Effective fps and inter-frame jitter (ms std) from decoder timestamps.

    Some container/codec combinations report POS_MSEC as a flat 0 for every
    frame. That is detectable (zero span) and returns None rather than a
    divide-by-zero or an absurd fps.
    """
    if timestamps_ms.size < 3:
        return None, 0.0
    span_ms = float(timestamps_ms[-1] - timestamps_ms[0])
    if span_ms <= 0:
        return None, 0.0
    fps = float(timestamps_ms.size - 1) * 1000.0 / span_ms
    diffs = np.diff(timestamps_ms)
    diffs = diffs[np.isfinite(diffs)]
    jitter = float(np.std(diffs)) if diffs.size else 0.0
    if not np.isfinite(fps) or fps <= 0 or fps > 1000:
        return None, jitter
    return fps, jitter


def _choose_fps(
    fps_container: float,
    fps_effective: Optional[float],
    tolerance: float,
    fallback: float,
    warnings: List[str],
) -> Tuple[float, str]:
    """Pick the fps to analyse with, preferring measured over declared."""
    container_ok = np.isfinite(fps_container) and 1.0 < fps_container < 1000.0

    if fps_effective is None:
        if container_ok:
            warnings.append(
                "decoder reported no frame timestamps; using container fps "
                f"({fps_container:.3f}) unverified"
            )
            return float(fps_container), "container"
        warnings.append(
            f"no usable fps from container or timestamps; assuming {fallback} fps — "
            "pulse rate from this clip is NOT trustworthy"
        )
        return float(fallback), "fallback"

    if container_ok and abs(fps_effective - fps_container) > tolerance:
        warnings.append(
            f"container fps ({fps_container:.3f}) disagrees with timestamp-derived "
            f"fps ({fps_effective:.3f}) by {abs(fps_effective - fps_container):.3f} — "
            "using the measured value (typical of iPhone variable-frame-rate capture)"
        )
    return float(fps_effective), "timestamps"
