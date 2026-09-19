"""Patient-disjoint k-fold splitter.

In medical imaging, the #1 way to fake good metrics is to let images of
the same patient leak across train and test. This module makes that
impossible by construction:

  1. A held-out test set is carved off first, with patient IDs disjoint
     from everything else.
  2. The remaining patients are partitioned into K cross-validation folds
     — again, patient-disjoint.

We deliberately split *patients*, not images. If patient_id is missing,
we fall back to image-level stratified splitting and surface that in the
returned metadata so the eval report can mention it.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from sklearn.model_selection import StratifiedKFold


@dataclass
class Sample:
    image_id: str          # path-like identifier unique within the dataset
    label: str             # class name
    patient_id: Optional[str]


@dataclass
class FoldSplit:
    train_idx: List[int]
    val_idx: List[int]


@dataclass
class SplitPlan:
    test_idx: List[int]
    folds: List[FoldSplit]
    patient_grouped: bool        # True if patient-disjoint, False if image-level
    metadata: Dict[str, object] = field(default_factory=dict)


def _patient_majority_label(
    samples: Sequence[Sample],
    indices: Sequence[int],
) -> Dict[str, str]:
    """Pick a representative label per patient (majority vote) so we can
    stratify CV folds when patients carry multiple labeled images."""
    by_pid: Dict[str, List[str]] = defaultdict(list)
    for i in indices:
        by_pid[samples[i].patient_id or samples[i].image_id].append(samples[i].label)
    return {pid: max(set(labels), key=labels.count) for pid, labels in by_pid.items()}


def build_split_plan(
    samples: Sequence[Sample],
    *,
    test_holdout_ratio: float = 0.15,
    n_folds: int = 5,
    seed: int = 42,
) -> SplitPlan:
    """Return a patient-disjoint test set + K patient-disjoint CV folds.

    If samples have no patient_id, falls back to image-level splits and
    sets `patient_grouped=False`.
    """
    rng = np.random.RandomState(seed)
    has_patients = any(s.patient_id for s in samples)

    if not has_patients:
        return _image_level_plan(samples, test_holdout_ratio, n_folds, seed)

    # --- Patient-level path ---------------------------------------------
    pid_to_indices: Dict[str, List[int]] = defaultdict(list)
    for i, s in enumerate(samples):
        pid_to_indices[s.patient_id or s.image_id].append(i)

    # One representative label per patient (majority) — used to stratify
    # both the test split and the CV folds.
    pid_label = _patient_majority_label(samples, list(range(len(samples))))
    pids = sorted(pid_to_indices.keys())
    pid_labels = np.array([pid_label[p] for p in pids])

    # Sample test patients first — stratified to keep class balance.
    n_test = max(1, int(round(len(pids) * test_holdout_ratio)))
    test_pids: List[str] = []
    for cls in np.unique(pid_labels):
        pool = [p for p, l in zip(pids, pid_labels) if l == cls]
        rng.shuffle(pool)
        k = max(1, int(round(len(pool) * test_holdout_ratio))) if len(pool) > 1 else 0
        test_pids.extend(pool[:k])
    # Backfill in case stratified pick rounded short / long.
    test_pids = list(dict.fromkeys(test_pids))[:n_test]

    test_pid_set = set(test_pids)
    pool_pids = [p for p in pids if p not in test_pid_set]
    pool_labels = np.array([pid_label[p] for p in pool_pids])

    test_idx: List[int] = sorted(
        i for p in test_pids for i in pid_to_indices[p]
    )

    folds: List[FoldSplit] = []
    if len(pool_pids) < n_folds:
        # Pathological tiny dataset — emit one fold using all of pool as
        # train and a single random patient as val.
        val_pid = rng.choice(pool_pids)
        train_idx = sorted(
            i for p in pool_pids if p != val_pid for i in pid_to_indices[p]
        )
        val_idx = sorted(pid_to_indices[val_pid])
        folds.append(FoldSplit(train_idx=train_idx, val_idx=val_idx))
    else:
        skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=seed)
        for tr_pid_pos, va_pid_pos in skf.split(np.zeros_like(pool_labels), pool_labels):
            tr_pids = [pool_pids[p] for p in tr_pid_pos]
            va_pids = [pool_pids[p] for p in va_pid_pos]
            tr_idx = sorted(i for p in tr_pids for i in pid_to_indices[p])
            va_idx = sorted(i for p in va_pids for i in pid_to_indices[p])
            folds.append(FoldSplit(train_idx=tr_idx, val_idx=va_idx))

    return SplitPlan(
        test_idx=test_idx,
        folds=folds,
        patient_grouped=True,
        metadata={
            "n_patients_total": len(pids),
            "n_patients_test": len(test_pids),
            "n_patients_pool": len(pool_pids),
            "n_images_total": len(samples),
            "n_images_test": len(test_idx),
        },
    )


def _image_level_plan(
    samples: Sequence[Sample],
    test_holdout_ratio: float,
    n_folds: int,
    seed: int,
) -> SplitPlan:
    """Fallback when patient IDs aren't available. Stratify on the image
    label. Surface in metadata so eval reports can flag it."""
    labels = np.array([s.label for s in samples])
    idx = np.arange(len(samples))
    rng = np.random.RandomState(seed)

    test_idx_list: List[int] = []
    for cls in np.unique(labels):
        pool = idx[labels == cls].tolist()
        rng.shuffle(pool)
        k = max(1, int(round(len(pool) * test_holdout_ratio)))
        test_idx_list.extend(pool[:k])
    test_idx_set = set(test_idx_list)
    pool_idx = np.array([i for i in idx if i not in test_idx_set])
    pool_labels = labels[pool_idx]

    folds: List[FoldSplit] = []
    if len(pool_idx) < n_folds:
        # tiny set — single split
        rng.shuffle(pool_idx)
        cut = max(1, int(len(pool_idx) * 0.8))
        folds.append(FoldSplit(train_idx=pool_idx[:cut].tolist(), val_idx=pool_idx[cut:].tolist()))
    else:
        skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=seed)
        for tr, va in skf.split(np.zeros_like(pool_labels), pool_labels):
            folds.append(
                FoldSplit(
                    train_idx=pool_idx[tr].tolist(),
                    val_idx=pool_idx[va].tolist(),
                )
            )

    return SplitPlan(
        test_idx=sorted(test_idx_list),
        folds=folds,
        patient_grouped=False,
        metadata={
            "n_patients_total": None,
            "n_images_total": len(samples),
            "n_images_test": len(test_idx_list),
            "note": (
                "patient_id missing — fell back to image-level stratified "
                "splits. Metrics may be optimistic if the same patient "
                "appears in multiple images."
            ),
        },
    )


# -------------------- assertions used by tests ------------------------------

def assert_no_patient_leakage(samples: Sequence[Sample], plan: SplitPlan) -> None:
    """Raises AssertionError if any patient_id appears in more than one of
    (test, train_fold_k, val_fold_k) for any fold."""
    pid_of = [s.patient_id or s.image_id for s in samples]
    test_pids = {pid_of[i] for i in plan.test_idx}

    for k, fold in enumerate(plan.folds):
        train_pids = {pid_of[i] for i in fold.train_idx}
        val_pids = {pid_of[i] for i in fold.val_idx}
        overlap_tv = train_pids & val_pids
        overlap_tt = train_pids & test_pids
        overlap_vt = val_pids & test_pids
        assert not overlap_tv, f"fold {k}: patient(s) {overlap_tv} appear in both train and val"
        assert not overlap_tt, f"fold {k}: patient(s) {overlap_tt} appear in both train and test"
        assert not overlap_vt, f"fold {k}: patient(s) {overlap_vt} appear in both val and test"
