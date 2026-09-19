#!/usr/bin/env python3
"""CLI entrypoint: held-out test-set evaluation + HTML report.

Also generates a small Grad-CAM grid of correctly + incorrectly
classified test images to drop into the report.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Tuple

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from src.config import load_config, project_root  # noqa: E402
from src.data.dataset import (  # noqa: E402
    FootImageDataset,
    class_to_index,
    discover_samples,
    resolve_sample_root,
)
from src.data.splits import build_split_plan  # noqa: E402
from src.data.transforms import build_eval_transform, denormalize  # noqa: E402
from src.eval.metrics import evaluate  # noqa: E402
from src.eval.report import write_report  # noqa: E402
from src.explain.gradcam import GradCAM, gradcam_grid, overlay_heatmap  # noqa: E402
from src.models.model import build_model  # noqa: E402
import torch  # noqa: E402


def _build_gradcam_grid(cfg, ckpt_path: Path, max_images: int = 8) -> str:
    classes = list(cfg["data"]["classes"])
    samples = discover_samples(resolve_sample_root(cfg, "main"), classes)
    sample_root = resolve_sample_root(cfg, "main")
    image_root = sample_root / "images" if (sample_root / "images").exists() else sample_root

    plan = build_split_plan(
        samples,
        test_holdout_ratio=float(cfg["train"]["test_holdout_ratio"]),
        n_folds=int(cfg["train"]["kfold_n_splits"]),
        seed=int(cfg["project"]["random_seed"]),
    )
    if not plan.test_idx:
        return ""

    transform = build_eval_transform(cfg)
    ds = FootImageDataset(
        samples=samples,
        indices=plan.test_idx[:max_images],
        image_root=image_root,
        transform=transform,
        class_to_index_map=class_to_index(classes),
    )
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(cfg).to(device)
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["state_dict"])

    pairs: List[Tuple[np.ndarray, np.ndarray, str]] = []
    pos_idx = classes.index("ulcer") if "ulcer" in classes else 1
    with GradCAM(model) as cam:
        for i in range(len(ds)):
            tensor, label, image_id = ds[i]
            tensor_on = tensor.to(device)
            heat = cam.heatmap(tensor_on, class_idx=pos_idx)
            disp = denormalize(tensor.numpy()).transpose(1, 2, 0) * 255
            disp = disp.astype(np.uint8)
            overlay = overlay_heatmap(disp, heat)
            with torch.no_grad():
                out = model(tensor_on.unsqueeze(0))
                p = torch.softmax(out.logits, dim=1)[0, pos_idx].item()
            caption = f"true={classes[label]}, p_ulcer={p:.2f}"
            pairs.append((overlay, disp, caption))
    return gradcam_grid(pairs, cols=4)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    args = ap.parse_args()
    cfg = load_config(args.config)

    artifacts = project_root() / cfg["paths"]["artifacts"]
    ckpt_path = artifacts / "best.ckpt"
    if not ckpt_path.exists():
        raise SystemExit(f"checkpoint not found at {ckpt_path}; run `make train` first")

    print(f"[eval] using {ckpt_path}")
    result = evaluate(cfg, ckpt_path, artifacts)
    print("[eval] metrics:", result.metrics)

    # Persist the tuned threshold so the serving layer can use it.
    (artifacts / "tuned_threshold.txt").write_text(f"{result.threshold:.6f}\n")

    # Persist a structured metrics blob so the serving layer can surface the
    # held-out test-set performance to clinicians via /model-info.
    import json as _json
    metrics_blob = {
        "test_size": result.test_size,
        "class_distribution": result.class_distribution,
        "threshold": result.threshold,
        "target_recall": result.target_recall,
        "metrics": result.metrics,
        "confusion": result.confusion,
        "notes": result.notes,
    }
    (artifacts / "eval_metrics.json").write_text(_json.dumps(metrics_blob, indent=2))

    print("[eval] generating Grad-CAM grid for report")
    grid_b64 = _build_gradcam_grid(cfg, ckpt_path)

    report_path = artifacts / "eval_report.html"
    write_report(
        result,
        report_path,
        model_version=str(cfg["project"]["model_version"]),
        rb_version=str(cfg["project"]["reference_bank_version"]),
        gradcam_png_b64=grid_b64 or None,
    )
    print(f"[eval] report written to {report_path}")


if __name__ == "__main__":
    main()
