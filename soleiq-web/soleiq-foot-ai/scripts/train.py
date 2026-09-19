#!/usr/bin/env python3
"""CLI entrypoint for k-fold CV training."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from src.config import load_config  # noqa: E402
from src.train.trainer import run_cv  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    args = ap.parse_args()
    cfg = load_config(args.config)
    summary = run_cv(cfg)
    print("train summary:", summary)


if __name__ == "__main__":
    main()
