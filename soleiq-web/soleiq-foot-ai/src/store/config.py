"""
Local-only configuration for scan persistence.

Everything is a path on this machine or a threshold, and every value is
overridable by environment variable so a debugging session can point at a
different directory or loosen a gate without editing code.

No cloud anything. `SOLEIQ_DATA_DIR` defaults to `./local-data` relative to
the service root, which is gitignored.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def _env_path(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    return Path(raw).expanduser().resolve() if raw else default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ[name])
    except (KeyError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ[name])
    except (KeyError, ValueError):
        return default


@dataclass(frozen=True)
class StoreConfig:
    data_dir: Path
    db_path: Path

    # --- frame extraction -------------------------------------------------
    target_frames: int

    # --- quality thresholds ----------------------------------------------
    #
    # Scored at a FIXED analysis width so a threshold means the same thing
    # every time. This matters more than it looks: Laplacian variance is
    # strongly resolution-dependent — the same photo measured ~180 at 1024px
    # wide and ~8800 at 48x36, because downsampling aliases high-frequency
    # detail back in. A threshold without a stated resolution is meaningless.
    analysis_width: int
    # Default 15, and that number is measured rather than guessed.
    #
    # It started at 60, taken from still photographs, and rejected 40/40 frames
    # of a real capture whose blur ranged 0.7-58 (median 32.6). Compressed
    # video is simply not as sharp as a still: VP9 smooths high-frequency
    # detail and sweeping adds motion blur. Those "too blurry" frames then
    # registered 39/39 in structure-from-motion at 1.16px reprojection error,
    # so they were never the problem.
    #
    # 15 keeps blur as a backstop against genuinely degenerate frames — the
    # black frame at the start of that capture scored 0.7 — rather than as a
    # primary filter it cannot do well at this resolution. Raise it only with
    # evidence from local-data/soleiq.db that sharper frames reconstruct better.
    blur_min: float
    brightness_min: float
    brightness_max: float
    skin_fraction_min: float

    # Frame-to-frame similarity.
    #
    # Effectively disabled by default (0.9999 = byte-identical), and that is a
    # correction rather than laziness. It started at 0.995 on the theory that
    # near-duplicates waste reconstruction effort. Measured on a real capture,
    # similarity between adjacent frames ranged 0.9780-0.9987 — so 0.995 sat in
    # the middle of the *normal* distribution and culled 26% of frames at
    # random. Those culled frames were the tight overlap structure-from-motion
    # depends on: with them, 39/39 frames registered; without them, 2/29 did.
    #
    # A redundant frame costs a little time. A missing frame costs the
    # reconstruction. The metric is still measured and stored for every frame,
    # because it is useful evidence — it just no longer rejects anything.
    duplicate_max_similarity: float

    # --- viewpoint diversity ---------------------------------------------
    #
    # Frame count alone was the old success test, and it passed a scan that
    # could not be reconstructed: forty sharp, well-exposed frames of one
    # angle. Structure-from-motion needs parallax, which means the set has to
    # span several genuinely different viewpoints, not merely contain many
    # photographs.
    #
    # Measured separately from `duplicate_max_similarity` on purpose. That one
    # asks "is this frame a copy of the last kept one" and rejects individual
    # frames; these ask "does the SET cover enough ground" and reject the scan.
    # Collapsing the two into one threshold is what broke this before.
    #
    # `novelty_window` frames back a new frame is compared against, so a camera
    # rocking between two positions cannot pass by differing from its
    # immediate predecessor each time.
    novelty_window: int
    # Cluster radius in 1 - cosine units. Two frames closer than this count as
    # the same viewpoint.
    viewpoint_radius: float
    # Distinct clusters an accepted set must span. 6 is a first estimate from
    # one real capture, not a calibrated constant — it is roughly "you went
    # more than half way round". Re-tune from local-data/soleiq.db.
    min_viewpoints: int
    # Accepted frames needed before reconstruction is attempted at all.
    min_accepted_frames: int
    # Novelty a frame must have against everything ALREADY in the bank before
    # it is saved. This is what stops the bank filling with the same angle
    # photographed twenty times: volume without parallax reconstructs nothing.
    #
    # Calibrated against the two regimes seen in real data. On a near-static
    # sweep, median novelty between accepted frames was 0.003-0.014; on the one
    # capture that reconstructed, it was 0.625. Anything in 0.02-0.30 separates
    # those cleanly, so 0.03 sits near the bottom of that range on purpose.
    #
    # Deliberately NOT raised further. Culling merely-similar frames is how
    # this was broken before: at 0.995 similarity the filter removed 26% of a
    # capture at random and took the tight overlap structure-from-motion needs
    # with it (39/39 frames registered with them, 2/29 without). This rejects
    # near-copies of angles already held, not neighbours within a sweep.
    #
    # One caveat worth stating: the 0.625 figure comes from a single successful
    # scan. The separation is wide, but it is n=1.
    bank_novelty_min: float

    @property
    def scans_dir(self) -> Path:
        return self.data_dir / "scans"


def load_config() -> StoreConfig:
    data_dir = _env_path("SOLEIQ_DATA_DIR", SERVICE_ROOT / "local-data")
    return StoreConfig(
        data_dir=data_dir,
        db_path=_env_path("SOLEIQ_DB_PATH", data_dir / "soleiq.db"),
        target_frames=_env_int("SOLEIQ_TARGET_FRAMES", 40),
        analysis_width=_env_int("SOLEIQ_ANALYSIS_WIDTH", 512),
        blur_min=_env_float("SOLEIQ_BLUR_MIN", 15.0),
        brightness_min=_env_float("SOLEIQ_BRIGHTNESS_MIN", 25.0),
        brightness_max=_env_float("SOLEIQ_BRIGHTNESS_MAX", 230.0),
        skin_fraction_min=_env_float("SOLEIQ_SKIN_FRACTION_MIN", 0.04),
        duplicate_max_similarity=_env_float("SOLEIQ_DUP_MAX_SIMILARITY", 0.9999),
        novelty_window=_env_int("SOLEIQ_NOVELTY_WINDOW", 5),
        viewpoint_radius=_env_float("SOLEIQ_VIEWPOINT_RADIUS", 0.12),
        min_viewpoints=_env_int("SOLEIQ_MIN_VIEWPOINTS", 6),
        min_accepted_frames=_env_int("SOLEIQ_MIN_ACCEPTED_FRAMES", 20),
        bank_novelty_min=_env_float("SOLEIQ_BANK_NOVELTY_MIN", 0.03),
    )


CONFIG = load_config()
