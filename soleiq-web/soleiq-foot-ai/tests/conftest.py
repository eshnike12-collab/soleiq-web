"""Shared pytest fixtures."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def cfg():
    from src.config import load_config

    return load_config(REPO_ROOT / "config.yaml")


@pytest.fixture(scope="session")
def sample_data(cfg) -> Path:
    """Ensure the synthetic sample data exists; regenerate if missing."""
    root = REPO_ROOT / cfg["paths"]["sample"]
    needed = (root / "images", root / "reference" / "images")
    if not all(p.exists() and any(p.iterdir()) for p in needed):
        subprocess.run(
            [
                sys.executable,
                str(REPO_ROOT / "scripts" / "generate_sample_data.py"),
                "--config",
                str(REPO_ROOT / "config.yaml"),
                "--force",
            ],
            check=True,
        )
    return root


@pytest.fixture
def tmp_artifacts(tmp_path: Path) -> Path:
    d = tmp_path / "artifacts"
    d.mkdir()
    yield d
    if d.exists():
        shutil.rmtree(d, ignore_errors=True)
