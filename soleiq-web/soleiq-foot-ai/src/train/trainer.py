"""K-fold cross-validated training loop.

For each fold:
  * Build train/val datasets.
  * Compute class weights from the fold's train labels.
  * Warmup with the backbone frozen, then unfreeze and fine-tune.
  * Early-stop on validation recall (sensitivity) — recall matters most
    clinically. Save the best checkpoint per fold.

Top-level `run_cv` orchestrates fold iteration, logs per-fold metrics to
artifacts/train_log.csv, and saves the best-overall checkpoint to
artifacts/best.ckpt. Eval picks up artifacts/best.ckpt by default.
"""

from __future__ import annotations

import csv
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from src.config import project_root
from src.data.dataset import (
    FootImageDataset,
    class_to_index,
    discover_samples,
    resolve_image_root,
    resolve_sample_root,
)
from src.data.splits import (
    assert_no_patient_leakage,
    build_split_plan,
)
from src.data.transforms import build_eval_transform, build_train_transform
from src.models.model import FootAIModel, build_model, parameter_groups
from src.train.loss import CombinedLoss, compute_class_weights


@dataclass
class EpochMetrics:
    loss: float
    ce: float
    supcon: float
    recall: float
    precision: float
    f1: float
    accuracy: float


@dataclass
class FoldResult:
    fold: int
    best_epoch: int
    best_val_recall: float
    history: List[Dict[str, float]] = field(default_factory=list)


def _compute_classification_metrics(
    y_true: Sequence[int], y_pred: Sequence[int], positive_class: int = 1
) -> Dict[str, float]:
    yt = np.asarray(y_true)
    yp = np.asarray(y_pred)
    tp = int(((yp == positive_class) & (yt == positive_class)).sum())
    fp = int(((yp == positive_class) & (yt != positive_class)).sum())
    fn = int(((yp != positive_class) & (yt == positive_class)).sum())
    tn = int(((yp != positive_class) & (yt != positive_class)).sum())
    recall = tp / max(1, tp + fn)
    precision = tp / max(1, tp + fp)
    f1 = 2 * precision * recall / max(1e-12, precision + recall)
    accuracy = (tp + tn) / max(1, tp + tn + fp + fn)
    return {
        "recall": recall,
        "precision": precision,
        "f1": f1,
        "accuracy": accuracy,
    }


def _run_epoch(
    model: FootAIModel,
    loader: DataLoader,
    loss_fn: CombinedLoss,
    optimizer: Optional[torch.optim.Optimizer],
    device: torch.device,
    train: bool,
    scaler: Optional[torch.amp.GradScaler] = None,
) -> EpochMetrics:
    if train:
        model.train()
    else:
        model.eval()

    total_loss = 0.0
    total_ce = 0.0
    total_supcon = 0.0
    n_batches = 0
    all_labels: List[int] = []
    all_preds: List[int] = []

    autocast_ctx = (
        torch.amp.autocast(device_type=device.type, dtype=torch.float16)
        if (train and scaler is not None and device.type == "cuda")
        else torch.amp.autocast(device_type=device.type, enabled=False)
    )

    for images, labels, _ids in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        with torch.set_grad_enabled(train):
            with autocast_ctx:
                out = model(images)
                losses = loss_fn(out.logits, out.embeddings, labels)
            loss = losses["total"]

            if train:
                assert optimizer is not None
                optimizer.zero_grad(set_to_none=True)
                if scaler is not None and device.type == "cuda":
                    scaler.scale(loss).backward()
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss.backward()
                    optimizer.step()

        total_loss += float(loss.item())
        total_ce += float(losses["ce"].item())
        total_supcon += float(losses["supcon"].item())
        n_batches += 1
        all_labels.extend(labels.detach().cpu().tolist())
        all_preds.extend(out.logits.detach().argmax(dim=1).cpu().tolist())

    metrics = _compute_classification_metrics(all_labels, all_preds)
    return EpochMetrics(
        loss=total_loss / max(1, n_batches),
        ce=total_ce / max(1, n_batches),
        supcon=total_supcon / max(1, n_batches),
        **metrics,
    )


def _build_loaders(
    cfg,
    samples,
    train_idx: Sequence[int],
    val_idx: Sequence[int],
    image_root: Path,
    classes: Sequence[str],
):
    train_t = build_train_transform(cfg)
    eval_t = build_eval_transform(cfg)
    c2i = class_to_index(classes)
    train_ds = FootImageDataset(samples, train_idx, image_root, train_t, c2i)
    val_ds = FootImageDataset(samples, val_idx, image_root, eval_t, c2i)
    bs = int(cfg["train"]["batch_size"])
    nw = int(cfg["train"]["num_workers"])
    train_loader = DataLoader(
        train_ds,
        batch_size=bs,
        shuffle=True,
        num_workers=nw,
        pin_memory=False,
        drop_last=False,
    )
    val_loader = DataLoader(
        val_ds, batch_size=bs, shuffle=False, num_workers=nw, pin_memory=False
    )
    return train_loader, val_loader


def _resolve_class_weights(cfg, train_labels: Sequence[int], n_classes: int) -> torch.Tensor:
    cw_cfg = cfg["model"]["loss"]["class_weights"]
    if isinstance(cw_cfg, str) and cw_cfg.lower() == "auto":
        return compute_class_weights(list(train_labels), n_classes)
    return torch.tensor([float(x) for x in cw_cfg], dtype=torch.float32)


def run_cv(cfg, *, output_dir: Optional[Path] = None) -> Dict[str, object]:
    """Run K-fold CV training. Returns a summary dict and writes:

        artifacts/
          fold_0/best.ckpt
          ...
          best.ckpt          (copy of the highest-recall fold)
          train_log.csv
          train_summary.json
    """
    root = project_root()
    output_dir = Path(output_dir) if output_dir else (root / cfg["paths"]["artifacts"])
    output_dir.mkdir(parents=True, exist_ok=True)

    seed = int(cfg["project"]["random_seed"])
    torch.manual_seed(seed)
    np.random.seed(seed)

    classes = list(cfg["data"]["classes"])
    samples = discover_samples(
        resolve_sample_root(cfg, "main"), classes
    )
    sample_root = resolve_sample_root(cfg, "main")
    image_root = (
        sample_root / "images" if (sample_root / "images").exists() else sample_root
    )

    plan = build_split_plan(
        samples,
        test_holdout_ratio=float(cfg["train"]["test_holdout_ratio"]),
        n_folds=int(cfg["train"]["kfold_n_splits"]),
        seed=seed,
    )
    assert_no_patient_leakage(samples, plan)
    (output_dir / "split_plan.json").write_text(
        json.dumps(
            {
                "test_idx": plan.test_idx,
                "folds": [
                    {"train_idx": f.train_idx, "val_idx": f.val_idx}
                    for f in plan.folds
                ],
                "patient_grouped": plan.patient_grouped,
                "metadata": plan.metadata,
            },
            indent=2,
        )
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log_path = output_dir / "train_log.csv"
    log_f = log_path.open("w", newline="")
    log_writer = csv.writer(log_f)
    log_writer.writerow(
        ["fold", "epoch", "phase", "loss", "ce", "supcon",
         "recall", "precision", "f1", "accuracy", "lr"]
    )

    fold_results: List[FoldResult] = []
    best_overall = {"fold": -1, "recall": -1.0, "path": None}

    for fi, fold in enumerate(plan.folds):
        train_loader, val_loader = _build_loaders(
            cfg, samples, fold.train_idx, fold.val_idx, image_root, classes
        )
        train_labels = [
            class_to_index(classes)[samples[i].label] for i in fold.train_idx
        ]
        class_weights = _resolve_class_weights(cfg, train_labels, len(classes)).to(device)

        model = build_model(cfg).to(device)
        loss_cfg = cfg["model"]["loss"]
        loss_fn = CombinedLoss(
            ce_weight=float(loss_cfg["ce_weight"]),
            supcon_weight=float(loss_cfg["supcon_weight"]),
            supcon_temperature=float(loss_cfg["supcon_temperature"]),
            class_weights=class_weights,
        ).to(device)

        # Optimizer with two LR groups; ReduceLROnPlateau on val recall.
        opt_cfg = cfg["train"]["optimizer"]
        groups = parameter_groups(
            model,
            lr_head=float(opt_cfg["lr_head"]),
            lr_backbone=float(opt_cfg["lr_backbone"]),
            wd=float(opt_cfg["weight_decay"]),
        )
        optimizer = torch.optim.AdamW(groups)

        epochs = int(cfg["train"]["epochs"])
        warmup = int(cfg["train"]["warmup_epochs_frozen"])
        sched_cfg = cfg["train"]["scheduler"]
        if sched_cfg["name"] == "cosine":
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=max(1, epochs - warmup),
                eta_min=float(sched_cfg["min_lr"]),
            )
        else:
            scheduler = None

        early = cfg["train"]["early_stopping"]
        patience = int(early["patience"])
        best_recall = -1.0
        best_epoch = -1
        stale = 0

        scaler = (
            torch.amp.GradScaler("cuda")
            if (cfg["train"]["mixed_precision"] and device.type == "cuda")
            else None
        )

        fold_dir = output_dir / f"fold_{fi}"
        fold_dir.mkdir(exist_ok=True)
        history: List[Dict[str, float]] = []

        print(f"\n[fold {fi}] train={len(fold.train_idx)} val={len(fold.val_idx)}")
        for ep in range(epochs):
            if ep < warmup:
                model.freeze_backbone()
            elif ep == warmup:
                model.unfreeze_backbone()

            train_m = _run_epoch(model, train_loader, loss_fn, optimizer, device, train=True, scaler=scaler)
            val_m = _run_epoch(model, val_loader, loss_fn, None, device, train=False)

            current_lrs = [pg["lr"] for pg in optimizer.param_groups]
            log_writer.writerow([fi, ep, "train", train_m.loss, train_m.ce, train_m.supcon,
                                 train_m.recall, train_m.precision, train_m.f1, train_m.accuracy,
                                 current_lrs[0]])
            log_writer.writerow([fi, ep, "val", val_m.loss, val_m.ce, val_m.supcon,
                                 val_m.recall, val_m.precision, val_m.f1, val_m.accuracy,
                                 current_lrs[0]])
            log_f.flush()
            history.append({
                "epoch": ep, "train_loss": train_m.loss, "val_loss": val_m.loss,
                "val_recall": val_m.recall, "val_precision": val_m.precision,
                "val_f1": val_m.f1, "val_accuracy": val_m.accuracy,
            })

            if scheduler is not None and ep >= warmup:
                scheduler.step()

            improved = val_m.recall > best_recall + 1e-6
            if improved:
                best_recall = val_m.recall
                best_epoch = ep
                stale = 0
                torch.save(
                    {
                        "state_dict": model.state_dict(),
                        "config": dict(cfg),
                        "fold": fi,
                        "epoch": ep,
                        "val_recall": best_recall,
                    },
                    fold_dir / "best.ckpt",
                )
            else:
                stale += 1
                if stale >= patience:
                    print(f"[fold {fi}] early stop at epoch {ep} (best recall {best_recall:.3f} @ ep {best_epoch})")
                    break

            print(
                f"[fold {fi} ep {ep:02d}] train_loss={train_m.loss:.3f} "
                f"val_recall={val_m.recall:.3f} val_acc={val_m.accuracy:.3f}"
                + (" * best" if improved else "")
            )

        fold_results.append(
            FoldResult(fold=fi, best_epoch=best_epoch, best_val_recall=best_recall, history=history)
        )
        if best_recall > best_overall["recall"]:
            best_overall = {
                "fold": fi,
                "recall": best_recall,
                "path": str(fold_dir / "best.ckpt"),
            }

    log_f.close()

    if best_overall["path"] is not None:
        import shutil
        shutil.copy(best_overall["path"], output_dir / "best.ckpt")

    summary = {
        "best_overall_fold": best_overall["fold"],
        "best_overall_recall": best_overall["recall"],
        "per_fold": [
            {"fold": f.fold, "best_epoch": f.best_epoch, "best_val_recall": f.best_val_recall}
            for f in fold_results
        ],
        "mean_val_recall": float(np.mean([f.best_val_recall for f in fold_results])),
        "std_val_recall": float(np.std([f.best_val_recall for f in fold_results])),
        "patient_grouped": plan.patient_grouped,
        "split_metadata": plan.metadata,
        # WHAT THIS MODEL WAS TRAINED ON, recorded so it cannot be lost.
        #
        # `data.source: sample` means scripts/generate_sample_data.py — images
        # synthesised by this repository, not photographs of anyone's foot. A
        # model trained on them has no clinical validity whatever the metrics
        # say, and the metrics look excellent precisely because the data is
        # separable by construction (AUROC 1.0 on the EfficientNet baseline).
        #
        # Serving reads this back and refuses to present a confident result
        # from such a checkpoint. Stamped here, at the only place that knows.
        "trained_on": (
            "synthetic_sample"
            if str(cfg.get("data", {}).get("source", "")) == "sample"
            else "real"
        ),
        "backbone": str(cfg.get("model", {}).get("backbone", "unknown")),
    }
    (output_dir / "train_summary.json").write_text(json.dumps(summary, indent=2))
    print(
        f"\n[cv] mean val_recall = {summary['mean_val_recall']:.3f} "
        f"± {summary['std_val_recall']:.3f} across {len(fold_results)} folds"
    )
    return summary
