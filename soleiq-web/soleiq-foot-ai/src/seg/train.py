"""
Train a wound segmentation model.

    python -m src.seg.train --epochs 20 --size 512

WHY SEGMENTATION AND NOT THE CLASSIFIER
---------------------------------------
src/models is a 2-way classifier: it answers "is there an ulcer". It cannot
answer "how big is it", because a probability has no boundary. Every millimetre
figure in this product is computed from a contour, so measurement needs a mask.

WHY DICE + FOCAL AND NOT CROSS-ENTROPY
--------------------------------------
Wound pixels are a median 0.7% of a FUSeg image. Plain cross-entropy is
minimised almost perfectly by predicting "background" everywhere — that scores
99.3% pixel accuracy and segments nothing. Dice is computed on the overlap of
the positive class, so an empty prediction scores zero; focal down-weights the
easy background pixels that would otherwise dominate the gradient.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import segmentation_models_pytorch as smp
import torch
from torch.utils.data import DataLoader

from .data import WoundSegDataset, load_manifest

OUT = Path("artifacts/segmentation")


def build_model(encoder: str = "timm-mobilenetv3_large_100") -> torch.nn.Module:
    """U-Net with a MobileNetV3 encoder.

    MobileNet for the same reason the classifier uses it: this has to run on a
    phone eventually, and an encoder that cannot be exported small is an
    encoder that has to be replaced later.
    """
    return smp.Unet(
        encoder_name=encoder,
        encoder_weights="imagenet",
        in_channels=3,
        classes=1,
    )


def focal_loss(logits: torch.Tensor, target: torch.Tensor,
               alpha: float = 0.25, gamma: float = 2.0) -> torch.Tensor:
    """Binary focal loss, written out rather than imported.

    segmentation_models_pytorch's FocalLoss calls `target.type(output.type())`,
    which yields the string 'torch.mps.FloatTensor' on Apple silicon and then
    raises `ValueError: invalid type`. Rather than fall back to CPU — several
    times slower on this hardware — the ten lines are here.

    gamma down-weights pixels the model already gets right, which on a mask
    that is 0.7% positive is almost all of the background.
    """
    prob = torch.sigmoid(logits)
    ce = torch.nn.functional.binary_cross_entropy_with_logits(
        logits, target, reduction="none"
    )
    p_t = prob * target + (1 - prob) * (1 - target)
    a_t = alpha * target + (1 - alpha) * (1 - target)
    return (a_t * (1 - p_t).pow(gamma) * ce).mean()


def dice_score(logits: torch.Tensor, target: torch.Tensor, eps: float = 1e-7) -> float:
    """Dice on the thresholded prediction — the number that gets reported."""
    pred = (torch.sigmoid(logits) > 0.5).float()
    inter = (pred * target).sum()
    return ((2 * inter + eps) / (pred.sum() + target.sum() + eps)).item()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--size", type=int, default=512)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--limit-train", type=int, default=0, help="0 = all")
    args = ap.parse_args()

    device = (
        "mps" if torch.backends.mps.is_available()
        else "cuda" if torch.cuda.is_available()
        else "cpu"
    )
    manifest = load_manifest()
    train_pairs = manifest["train"][: args.limit_train] if args.limit_train else manifest["train"]

    train_ds = WoundSegDataset(train_pairs, args.size, augment=True)
    val_ds = WoundSegDataset(manifest["val"], args.size, augment=False)
    train_dl = DataLoader(train_ds, batch_size=args.batch, shuffle=True, num_workers=0)
    val_dl = DataLoader(val_ds, batch_size=args.batch, shuffle=False, num_workers=0)

    model = build_model().to(device)
    dice_loss = smp.losses.DiceLoss(mode="binary")
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr)

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"[seg] device={device} train={len(train_ds)} val={len(val_ds)} "
          f"size={args.size} batch={args.batch}", flush=True)

    best = 0.0
    history = []
    for epoch in range(args.epochs):
        model.train()
        started = time.time()
        losses = []
        for x, y in train_dl:
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            out = model(x)
            loss = dice_loss(out, y) + focal_loss(out, y)
            loss.backward()
            opt.step()
            losses.append(loss.item())

        model.eval()
        scores = []
        with torch.no_grad():
            for x, y in val_dl:
                x, y = x.to(device), y.to(device)
                scores.append(dice_score(model(x), y))
        val_dice = float(np.mean(scores))
        history.append({"epoch": epoch, "loss": float(np.mean(losses)), "val_dice": val_dice})
        print(f"[seg] ep {epoch:02d}  loss {np.mean(losses):.4f}  "
              f"val_dice {val_dice:.4f}  {time.time()-started:.0f}s", flush=True)

        if val_dice > best:
            best = val_dice
            torch.save(
                {"state_dict": model.state_dict(), "size": args.size,
                 "encoder": "timm-mobilenetv3_large_100", "val_dice": best},
                OUT / "best.pt",
            )

    (OUT / "train_history.json").write_text(json.dumps(
        {"history": history, "best_val_dice": best,
         "train_images": len(train_ds), "val_images": len(val_ds),
         # Recorded so a reported score can never be mistaken for one measured
         # on the raw, leaky download.
         "deduplicated": True, "dropped": manifest.get("dropped", {})},
        indent=2))
    print(f"[seg] best val dice {best:.4f} -> {OUT/'best.pt'}")


if __name__ == "__main__":
    main()
