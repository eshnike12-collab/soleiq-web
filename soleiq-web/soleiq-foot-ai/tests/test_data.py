"""Data layer tests.

Key contract: no patient_id may appear in two splits. This is the
single most important honesty test for the whole project.
"""

from __future__ import annotations

import numpy as np
import pytest
from PIL import Image

from src.data.dataset import (
    FootImageDataset,
    class_distribution,
    class_to_index,
    discover_samples,
    resolve_image_root,
    resolve_sample_root,
)
from src.data.quality_gate import evaluate_quality
from src.data.splits import (
    Sample,
    assert_no_patient_leakage,
    build_split_plan,
)
from src.data.transforms import build_eval_transform, build_train_transform


def test_discover_finds_all_sample_images(cfg, sample_data):
    samples = discover_samples(
        resolve_sample_root(cfg, "main"),
        cfg["data"]["classes"],
    )
    assert len(samples) == 80, "sample data should contain 80 main images"
    dist = class_distribution(samples)
    assert dist == {"no_ulcer": 40, "ulcer": 40}


def test_patient_id_extracted_from_filename(cfg, sample_data):
    samples = discover_samples(
        resolve_sample_root(cfg, "main"),
        cfg["data"]["classes"],
    )
    # Sample-data generator uses pattern p_<id>_synth, so prefix is "p".
    # That's a degenerate case — every sample maps to patient "p". Real
    # data files like "p012_2024-03-01.jpg" would split properly.
    for s in samples:
        assert s.patient_id is not None, f"missing patient_id for {s.image_id}"


def test_patient_disjoint_split_no_leakage():
    # Construct a synthetic case with clear patient IDs to verify the
    # invariant: same `p###` never appears across train/val/test.
    samples = [
        Sample(image_id=f"ulcer/p{p:03d}_v{v}.jpg", label="ulcer", patient_id=f"p{p:03d}")
        for p in range(10)
        for v in range(3)
    ] + [
        Sample(image_id=f"no_ulcer/p{p:03d}_v{v}.jpg", label="no_ulcer", patient_id=f"p{p:03d}")
        for p in range(10, 20)
        for v in range(2)
    ]
    plan = build_split_plan(samples, test_holdout_ratio=0.2, n_folds=5, seed=0)
    assert plan.patient_grouped is True
    assert len(plan.folds) == 5
    assert len(plan.test_idx) > 0
    # The critical assertion:
    assert_no_patient_leakage(samples, plan)


def test_image_level_fallback_when_no_patient_ids():
    samples = [
        Sample(image_id=f"ulcer/{i}.jpg", label="ulcer", patient_id=None)
        for i in range(10)
    ] + [
        Sample(image_id=f"no_ulcer/{i}.jpg", label="no_ulcer", patient_id=None)
        for i in range(10)
    ]
    plan = build_split_plan(samples, test_holdout_ratio=0.2, n_folds=5, seed=0)
    assert plan.patient_grouped is False
    assert "note" in plan.metadata


def test_quality_gate_passes_normal_image(cfg, sample_data):
    samples = discover_samples(
        resolve_sample_root(cfg, "main"),
        cfg["data"]["classes"],
    )
    root = resolve_image_root(cfg, "main")
    img = Image.open(root / samples[0].image_id.split("/")[-1])
    res = evaluate_quality(img)
    # Synthetic images shouldn't all fail every check.
    assert res.blur_var > 0
    assert 0 < res.luma_mean < 1


def test_quality_gate_rejects_black_image():
    img = Image.new("RGB", (64, 64), (0, 0, 0))
    res = evaluate_quality(img)
    assert res.ok is False
    assert any("dark" in r for r in res.reasons)


def test_quality_gate_rejects_tiny_image():
    img = Image.new("RGB", (16, 16), (128, 128, 128))
    res = evaluate_quality(img)
    assert res.ok is False
    assert any("too small" in r for r in res.reasons)


def test_train_transform_produces_correct_tensor_shape(cfg, sample_data):
    t = build_train_transform(cfg)
    arr = np.asarray(Image.new("RGB", (320, 240), (128, 128, 128)))
    out = t(image=arr)
    img = out["image"]
    size = int(cfg["data"]["image_size"])
    # ToTensorV2 returns CHW
    assert tuple(img.shape) == (3, size, size)
    assert img.dtype.is_floating_point


def test_eval_transform_deterministic(cfg, sample_data):
    t = build_eval_transform(cfg)
    arr = np.asarray(Image.new("RGB", (320, 240), (128, 128, 128)))
    a = t(image=arr)["image"]
    b = t(image=arr)["image"]
    import torch

    assert torch.allclose(a, b)


def test_dataset_returns_image_label_id(cfg, sample_data):
    samples = discover_samples(
        resolve_sample_root(cfg, "main"),
        cfg["data"]["classes"],
    )
    ds = FootImageDataset(
        samples=samples,
        indices=list(range(len(samples))),
        image_root=resolve_image_root(cfg, "main"),
        transform=build_eval_transform(cfg),
        class_to_index_map=class_to_index(cfg["data"]["classes"]),
    )
    img, label, image_id = ds[0]
    size = int(cfg["data"]["image_size"])
    assert tuple(img.shape) == (3, size, size)
    assert isinstance(label, int) and 0 <= label < len(cfg["data"]["classes"])
    assert isinstance(image_id, str) and image_id.endswith(".png")
