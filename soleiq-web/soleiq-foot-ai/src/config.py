"""Tiny config loader.

Wraps PyYAML so the rest of the codebase reads config as a regular dict
with attribute access for convenience. Kept dependency-light so the sample
data generator can run without the full ML stack installed if needed.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict


class Config(dict):
    """dict subclass that also supports attribute access (cfg.train.epochs)."""

    def __getattr__(self, item: str) -> Any:  # type: ignore[override]
        try:
            v = self[item]
        except KeyError as e:
            raise AttributeError(item) from e
        return Config(v) if isinstance(v, dict) else v


def load_config(path: str | Path) -> Config:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Config not found: {path}")
    try:
        import yaml  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "PyYAML is required. Run `make setup` first."
        ) from e
    with path.open() as f:
        data: Dict[str, Any] = yaml.safe_load(f) or {}
    return Config(data)


def project_root() -> Path:
    """Repo root, regardless of where the entrypoint was launched from."""
    # src/config.py → soleiq-foot-ai/
    return Path(__file__).resolve().parents[1]
