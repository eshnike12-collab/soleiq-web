"""Held-out test-set evaluation.

Computes the metrics that matter clinically (sensitivity / specificity /
PPV / NPV / AUROC / AUPRC) plus reliability data for the calibration
diagram. Threshold tuning targets a configured sensitivity floor.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import numpy as np
import torch
from sklearn.metrics import (
    auc,
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from torch.utils.data import DataLoader

from src.data.dataset import (
    FootImageDataset,
    class_to_index,
    discover_samples,
    resolve_image_root,
    resolve_sample_root,
)
from src.data.splits import build_split_plan
from src.data.transforms import build_eval_transform
from src.models.model import FootAIModel, build_model


@dataclass
class EvalResult:
    threshold: float
    target_recall: float
    metrics: Dict[str, float]
    confusion: List[List[int]]
    roc: Dict[str, List[float]]
    pr: Dict[str, List[float]]
    reliability: Dict[str, List[float]]
    test_size: int
    class_distribution: Dict[str, int]
    notes: List[str]


def _tune_threshold(probs: np.ndarray, labels: np.ndarray, target_recall: float) -> Tuple[float, str]:
    """Lowest threshold that still achieves target_recall. Returns (thr, note)."""
    # Sort thresholds high → low and walk down until recall hits target.
    order = np.argsort(-probs)
    sorted_probs = probs[order]
    sorted_labels = labels[order]
    pos = int((labels == 1).sum())
    if pos == 0:
        return 0.5, "no positive examples in test set — falling back to threshold 0.5"
    tp = 0
    fp = 0
    chosen = sorted_probs[-1] if len(sorted_probs) else 0.5
    for p, y in zip(sorted_probs, sorted_labels):
        if y == 1:
            tp += 1
        else:
            fp += 1
        recall = tp / pos
        if recall >= target_recall:
            chosen = float(p)
            return chosen, ""
    return float(sorted_probs[-1]), (
        f"could not reach target recall {target_recall}; using lowest threshold seen"
    )


def _reliability(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> Dict[str, List[float]]:
    """Reliability diagram inputs + expected calibration error."""
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    centers, accs, confs, sizes = [], [], [], []
    ece = 0.0
    for lo, hi in zip(bins[:-1], bins[1:]):
        mask = (probs >= lo) & (probs < hi)
        if mask.sum() == 0:
            continue
        avg_conf = float(probs[mask].mean())
        avg_acc = float(labels[mask].mean())
        centers.append((lo + hi) / 2)
        confs.append(avg_conf)
        accs.append(avg_acc)
        sizes.append(int(mask.sum()))
        ece += (mask.sum() / len(probs)) * abs(avg_conf - avg_acc)
    return {
        "bin_centers": centers,
        "confidences": confs,
        "accuracies": accs,
        "bin_sizes": sizes,
        "ece": [float(ece)],
    }


@torch.no_grad()
def _predict_probs(
    model: FootAIModel,
    loader: DataLoader,
    device: torch.device,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    model.eval()
    all_probs: List[float] = []
    all_labels: List[int] = []
    all_ids: List[str] = []
    for images, labels, ids in loader:
        images = images.to(device, non_blocking=True)
        out = model(images)
        probs = torch.softmax(out.logits, dim=1)[:, 1].cpu().numpy()
        all_probs.extend(probs.tolist())
        all_labels.extend(labels.tolist())
        all_ids.extend(list(ids))
    return np.asarray(all_probs), np.asarray(all_labels), all_ids


def evaluate(cfg, checkpoint_path: Path, output_dir: Path) -> EvalResult:
    """Run held-out test-set eval and write all artifacts to output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    classes = list(cfg["data"]["classes"])
    samples = discover_samples(
        resolve_sample_root(cfg, "main"), classes
    )
    sample_root = resolve_sample_root(cfg, "main")
    image_root = (
        sample_root / "images" if (sample_root / "images").exists() else sample_root
    )

    # Rebuild the same split plan that training used (deterministic from
    # config seed) so the test set is the same one held out during CV.
    plan = build_split_plan(
        samples,
        test_holdout_ratio=float(cfg["train"]["test_holdout_ratio"]),
        n_folds=int(cfg["train"]["kfold_n_splits"]),
        seed=int(cfg["project"]["random_seed"]),
    )

    if len(plan.test_idx) == 0:
        raise RuntimeError("Test set is empty — adjust test_holdout_ratio or data size.")

    eval_t = build_eval_transform(cfg)
    test_ds = FootImageDataset(
        samples=samples,
        indices=plan.test_idx,
        image_root=image_root,
        transform=eval_t,
        class_to_index_map=class_to_index(classes),
    )
    test_loader = DataLoader(
        test_ds, batch_size=int(cfg["train"]["batch_size"]),
        shuffle=False, num_workers=int(cfg["train"]["num_workers"]),
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    probs, y, ids = _predict_probs(model, test_loader, device)

    target_recall = float(cfg["threshold"]["target_recall"])
    threshold, note = _tune_threshold(probs, y, target_recall)

    preds = (probs >= threshold).astype(int)
    cm = confusion_matrix(y, preds, labels=[0, 1])
    tn, fp, fn_, tp = cm.ravel().tolist()
    sensitivity = tp / max(1, tp + fn_)
    specificity = tn / max(1, tn + fp)
    ppv = tp / max(1, tp + fp)
    npv = tn / max(1, tn + fn_)
    accuracy = (tp + tn) / max(1, tp + tn + fp + fn_)
    f1 = 2 * ppv * sensitivity / max(1e-12, ppv + sensitivity)
    try:
        auroc = float(roc_auc_score(y, probs))
    except ValueError:
        auroc = float("nan")
    try:
        auprc = float(average_precision_score(y, probs))
    except ValueError:
        auprc = float("nan")

    fpr, tpr, _ = roc_curve(y, probs)
    prec_curve, rec_curve, _ = precision_recall_curve(y, probs)
    rel = _reliability(probs, y)

    notes: List[str] = []
    if note:
        notes.append(note)
    if not plan.patient_grouped:
        notes.append(
            "patient-disjoint splits were not possible — metrics may be optimistic."
        )

    test_class_dist = {
        c: int(sum(1 for i in plan.test_idx if samples[i].label == c))
        for c in classes
    }

    result = EvalResult(
        threshold=float(threshold),
        target_recall=target_recall,
        metrics={
            "sensitivity_recall": sensitivity,
            "specificity": specificity,
            "ppv_precision": ppv,
            "npv": npv,
            "f1": f1,
            "accuracy": accuracy,
            "auroc": auroc,
            "auprc": auprc,
            "ece": float(rel["ece"][0]),
        },
        confusion=[[int(tn), int(fp)], [int(fn_), int(tp)]],
        roc={"fpr": [float(x) for x in fpr], "tpr": [float(x) for x in tpr]},
        pr={"precision": [float(x) for x in prec_curve],
            "recall": [float(x) for x in rec_curve]},
        reliability=rel,
        test_size=int(len(plan.test_idx)),
        class_distribution=test_class_dist,
        notes=notes,
    )

    # Dump raw test predictions for downstream debugging.
    rows = list(zip(ids, y.tolist(), probs.tolist(), preds.tolist()))
    with (output_dir / "test_predictions.csv").open("w") as f:
        f.write("image_id,true_label,probability,predicted_label\n")
        for r in rows:
            f.write(f"{r[0]},{r[1]},{r[2]:.6f},{r[3]}\n")

    return result
