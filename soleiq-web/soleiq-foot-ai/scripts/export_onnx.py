#!/usr/bin/env python3
"""Export the trained model to ONNX and verify parity."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from src.config import load_config, project_root  # noqa: E402
from src.export.onnx_export import export_onnx  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    args = ap.parse_args()
    cfg = load_config(args.config)

    artifacts = project_root() / cfg["paths"]["artifacts"]
    ckpt_path = artifacts / "best.ckpt"
    if not ckpt_path.exists():
        raise SystemExit(f"checkpoint not found at {ckpt_path}; run `make train` first")

    result = export_onnx(cfg, ckpt_path)
    print(f"[export] wrote {result.onnx_path}")
    print(f"[export] parity logits max|diff|     = {result.max_abs_diff_logits:.2e}")
    print(f"[export] parity embeddings max|diff| = {result.max_abs_diff_embeddings:.2e}")
    if not result.parity_ok:
        raise SystemExit("[export] PARITY FAILED — investigate before shipping")
    print("[export] parity OK")


if __name__ == "__main__":
    main()
