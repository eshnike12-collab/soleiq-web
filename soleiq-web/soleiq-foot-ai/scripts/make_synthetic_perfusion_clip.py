#!/usr/bin/env python3
"""Generate synthetic foot-video clips with a KNOWN pulse rate.

Why this exists: before recording real clips we need to know whether the
Phase 0 harness measures correctly at all. A synthetic clip has ground
truth by construction — if CHROM/POS cannot recover 72 bpm from a clip we
built to contain exactly 72 bpm, the bug is in our code, not in the foot.

It is equally important for the negative case: a clip generated with
`--modulation 0` contains no pulse whatsoever, and the harness MUST reject
it. A pipeline that reports a confident heart rate for a pulse-free video
is worse than useless.

Physiology that is modelled:
  * The blood-volume pulse signature Pbv ~ [0.33, 0.77, 0.53] (Wang et al.
    2017) — green is modulated most because haemoglobin absorbs green most
    strongly. This is what makes CHROM and POS behave correctly rather than
    just tracking a grey flicker.
  * A PPG waveform is not a sinusoid. A systolic peak plus dicrotic notch
    is synthesised from harmonics, so the second-harmonic term in the SNR
    definition has something real to find.

Confounds that can be switched on, each matching a real failure mode:
  --motion-px        hand tremor / foot drift
  --exposure-drift   iOS auto-exposure hunting (common-mode intensity swing)
  --codec            H.264/MPEG-4 compression, which quantises small
                     intensity modulations away — the reason a 1% pulse can
                     survive in RAM and die in an .mp4

Examples
--------
    # Clean 72 bpm reference clip
    python scripts/make_synthetic_perfusion_clip.py \\
        --out data/sample/perfusion/clean_72.avi --bpm 72 --modulation 0.02

    # Negative control: no pulse at all
    python scripts/make_synthetic_perfusion_clip.py \\
        --out data/sample/perfusion/nopulse.avi --modulation 0.0

    # Weak pulse under motion, as a foot realistically would be
    python scripts/make_synthetic_perfusion_clip.py \\
        --out data/sample/perfusion/hard_88.avi --bpm 88 \\
        --modulation 0.004 --motion-px 1.5 --exposure-drift 0.03
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

# Normalised blood-volume-pulse signature (Wang et al. 2017). Green carries
# the most modulation; this ratio is what chrominance methods exploit.
PBV = np.array([0.33, 0.77, 0.53], dtype=np.float64)
PBV = PBV / np.linalg.norm(PBV)

# Base skin colour. Sits inside the YCrCb range used by src/perfusion/roi.py
# and src/data/quality_gate.py (Cr ~155, Cb ~110).
SKIN_RGB = np.array([200.0, 150.0, 130.0], dtype=np.float64)
BACKGROUND_RGB = np.array([70.0, 72.0, 78.0], dtype=np.float64)

# Lossless first: FFV1 preserves a 0.4% modulation exactly. mp4v/avc1 are
# offered so compression loss can be measured rather than assumed.
CODECS = {
    "ffv1": ("FFV1", ".avi"),
    "mp4v": ("mp4v", ".mp4"),
    "avc1": ("avc1", ".mp4"),
    "mjpg": ("MJPG", ".avi"),
}


def ppg_waveform(t: np.ndarray, bpm: float) -> np.ndarray:
    """A PPG-shaped unit-amplitude waveform: systolic peak + dicrotic notch.

    Built from the fundamental plus two harmonics with the phase relations
    that give the characteristic asymmetric pulse shape. Peak-to-peak is
    normalised to 1.0 so `--modulation` means what it says.
    """
    f = bpm / 60.0
    w = 2.0 * np.pi * f * t
    y = np.sin(w) + 0.45 * np.sin(2 * w - 0.9) + 0.15 * np.sin(3 * w - 1.8)
    y = y - y.mean()
    span = float(y.max() - y.min())
    return y / span if span > 0 else y


def _foot_mask(h: int, w: int, dx: float = 0.0, dy: float = 0.0) -> np.ndarray:
    """An ellipse standing in for a foot, optionally displaced sub-pixel."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    cy, cx = h / 2.0 + dy, w / 2.0 + dx
    ry, rx = h * 0.36, w * 0.24
    return (((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2) <= 1.0


def synthesize(
    out_path: Path,
    bpm: float = 72.0,
    fps: float = 30.0,
    duration_s: float = 20.0,
    size: Tuple[int, int] = (320, 240),
    modulation: float = 0.02,
    noise_sigma: float = 1.0,
    motion_px: float = 0.0,
    motion_hz: float = 0.25,
    exposure_drift: float = 0.0,
    exposure_hz: float = 0.07,
    codec: str = "ffv1",
    seed: int = 42,
) -> dict:
    """Render and write a clip. Returns the ground-truth metadata dict."""
    rng = np.random.default_rng(seed)
    w, h = size
    n = int(round(duration_s * fps))
    t = np.arange(n) / fps

    pulse = ppg_waveform(t, bpm) if modulation > 0 else np.zeros(n)
    drift = (exposure_drift * np.sin(2 * np.pi * exposure_hz * t)
             if exposure_drift > 0 else np.zeros(n))
    shift = (motion_px * np.sin(2 * np.pi * motion_hz * t)
             if motion_px > 0 else np.zeros(n))

    fourcc_name, expected_suffix = CODECS[codec]
    out_path = out_path.with_suffix(expected_suffix)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    writer = cv2.VideoWriter(
        str(out_path), cv2.VideoWriter_fourcc(*fourcc_name), float(fps), (w, h)
    )
    if not writer.isOpened():
        raise SystemExit(
            f"OpenCV could not open a writer for codec {fourcc_name!r}. "
            f"Try one of: {', '.join(CODECS)}"
        )

    try:
        for i in range(n):
            mask = _foot_mask(h, w, dx=shift[i], dy=shift[i] * 0.4)
            frame = np.empty((h, w, 3), dtype=np.float64)
            frame[:] = BACKGROUND_RGB

            # Pulse modulates each channel in proportion to Pbv; exposure
            # drift is common-mode (same factor on all channels), which is
            # exactly the distinction CHROM/POS are designed to exploit.
            skin = SKIN_RGB * (1.0 + modulation * pulse[i] * PBV)
            frame[mask] = skin
            frame *= (1.0 + drift[i])
            frame += rng.normal(0.0, noise_sigma, frame.shape)

            bgr = cv2.cvtColor(
                np.clip(frame, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR
            )
            writer.write(bgr)
    finally:
        writer.release()

    return {
        "path": str(out_path),
        "ground_truth_bpm": float(bpm) if modulation > 0 else None,
        "fps": float(fps),
        "duration_s": float(duration_s),
        "n_frames": n,
        "size": [w, h],
        "modulation": float(modulation),
        "noise_sigma": float(noise_sigma),
        "motion_px": float(motion_px),
        "exposure_drift": float(exposure_drift),
        "codec": fourcc_name,
        "seed": seed,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", required=True, help="output path (suffix set by codec)")
    ap.add_argument("--bpm", type=float, default=72.0)
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--duration", type=float, default=20.0)
    ap.add_argument("--width", type=int, default=320)
    ap.add_argument("--height", type=int, default=240)
    ap.add_argument("--modulation", type=float, default=0.02,
                    help="peak-to-peak pulse amplitude as a fraction of skin "
                         "intensity; 0 = negative control with no pulse")
    ap.add_argument("--noise-sigma", type=float, default=1.0,
                    help="per-pixel Gaussian sensor noise, in 0-255 units")
    ap.add_argument("--motion-px", type=float, default=0.0)
    ap.add_argument("--exposure-drift", type=float, default=0.0,
                    help="common-mode intensity swing, e.g. 0.03 = +/-3%%")
    ap.add_argument("--codec", choices=sorted(CODECS), default="ffv1")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    meta = synthesize(
        out_path=Path(args.out),
        bpm=args.bpm,
        fps=args.fps,
        duration_s=args.duration,
        size=(args.width, args.height),
        modulation=args.modulation,
        noise_sigma=args.noise_sigma,
        motion_px=args.motion_px,
        exposure_drift=args.exposure_drift,
        codec=args.codec,
        seed=args.seed,
    )
    print("[synth] wrote", meta["path"])
    for k, v in meta.items():
        if k != "path":
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
