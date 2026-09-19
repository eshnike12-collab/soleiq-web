"""
Evaluate the segmentation model.

    python -m src.seg.evaluate

Reports TWO numbers, and the second is the one that matters:

  in-domain     FUSeg validation — same clinic, same camera, same protocol.
  cross-dataset Medetec — different source entirely, never trained on.

Segmentation models generalise poorly across wound datasets; publishing the
in-domain figure alone is how a model that works in one clinic gets described
as working everywhere. The gap between these two is the honest measure of what
this model would do on a photograph it has not effectively already seen.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

from .data import WoundSegDataset, load_manifest
from .train import OUT, build_model, dice_score

ROOT = Path("data/external/wound-segmentation/data")
MEDETEC = ROOT / "Medetec_foot_ulcer_224"


def medetec_pairs() -> list[tuple[str, str]]:
    pairs = []
    for split in ("train", "test"):
        images = sorted((MEDETEC / split / "images").glob("*"))
        for im in images:
            lb = MEDETEC / split / "labels" / im.name
            if lb.exists():
                pairs.append((str(im), str(lb)))
    return pairs


def evaluate(model, pairs, size, device, label) -> dict:
    ds = WoundSegDataset(pairs, size, augment=False)
    dl = DataLoader(ds, batch_size=4, shuffle=False)
    scores = []
    with torch.no_grad():
        for x, y in dl:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            # Per image, not per batch: a batch mean hides the images the model
            # missed entirely, and those are the clinically interesting ones.
            for i in range(x.shape[0]):
                scores.append(dice_score(logits[i : i + 1], y[i : i + 1]))
    arr = np.array(scores)
    return {
        "set": label,
        "n": int(arr.size),
        "dice_mean": round(float(arr.mean()), 4),
        "dice_median": round(float(np.median(arr)), 4),
        # The share of images the model essentially failed on. A good mean can
        # sit on top of a long tail of complete misses.
        "failed_below_0.3": int((arr < 0.3).sum()),
        "p10": round(float(np.percentile(arr, 10)), 4),
    }


def main() -> None:
    ckpt_path = OUT / "best.pt"
    if not ckpt_path.exists():
        raise SystemExit(f"No checkpoint at {ckpt_path}. Train first.")
    ckpt = torch.load(ckpt_path, map_location="cpu")
    size = ckpt.get("size", 512)

    device = (
        "mps" if torch.backends.mps.is_available()
        else "cuda" if torch.cuda.is_available()
        else "cpu"
    )
    model = build_model(ckpt.get("encoder", "timm-mobilenetv3_large_100")).to(device)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    manifest = load_manifest()
    results = [
        evaluate(model, manifest["val"], size, device, "FUSeg validation (in-domain)"),
        evaluate(model, medetec_pairs(), size, device, "Medetec (cross-dataset)"),
    ]

    print(f"{'set':34}{'n':>5}{'dice':>9}{'median':>9}{'p10':>8}{'failed':>8}")
    print("-" * 73)
    for r in results:
        print(f"{r['set']:34}{r['n']:>5}{r['dice_mean']:>9.4f}"
              f"{r['dice_median']:>9.4f}{r['p10']:>8.4f}{r['failed_below_0.3']:>8}")

    drop = results[0]["dice_mean"] - results[1]["dice_mean"]
    print(f"\n  cross-dataset drop: {drop:+.4f}  "
          f"({'expected — report the lower figure' if drop > 0 else 'unusual, worth checking'})")

    (OUT / "eval_metrics.json").write_text(json.dumps(
        {"results": results, "cross_dataset_drop": round(drop, 4),
         "checkpoint_val_dice": ckpt.get("val_dice")}, indent=2))


if __name__ == "__main__":
    main()
