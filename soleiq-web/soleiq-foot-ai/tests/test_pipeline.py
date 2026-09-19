"""End-to-end pipeline test.

Runs k-fold training (1 epoch, 1 fold), eval, similarity-index build,
and ONNX parity. Uses a temp config that points at the synthetic
sample data so the test stays fast and self-contained.
"""

from __future__ import annotations

import copy
import io
import json
from pathlib import Path

import numpy as np
import pytest
import torch
from fastapi.testclient import TestClient
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def quick_cfg(cfg, tmp_path_factory, sample_data):
    """A copy of the config tuned for fast end-to-end testing: 1 fold, 2
    epochs, tiny batch size."""
    c = copy.deepcopy(dict(cfg))
    c["train"]["kfold_n_splits"] = 2
    c["train"]["epochs"] = 2
    c["train"]["warmup_epochs_frozen"] = 0
    c["train"]["batch_size"] = 8
    c["train"]["num_workers"] = 0
    c["train"]["early_stopping"]["patience"] = 99
    c["paths"]["artifacts"] = str(tmp_path_factory.mktemp("artifacts"))
    return c


def test_train_then_eval_then_index_then_api(quick_cfg, sample_data, monkeypatch):
    from src.config import Config
    from src.train.trainer import run_cv
    from src.eval.metrics import evaluate
    from src.similarity.index import build_index, SimilarityIndex

    cfg = Config(quick_cfg)
    artifacts = Path(cfg["paths"]["artifacts"])

    # --- Train --------------------------------------------------------------
    summary = run_cv(cfg, output_dir=artifacts)
    assert "mean_val_recall" in summary
    ckpt = artifacts / "best.ckpt"
    assert ckpt.exists(), "best.ckpt was not written"

    # --- Eval ---------------------------------------------------------------
    result = evaluate(cfg, ckpt, artifacts)
    assert result.test_size > 0
    # Threshold must lie in [0,1]
    assert 0.0 <= result.threshold <= 1.0
    # Confusion matrix totals = test size
    cm_sum = sum(sum(row) for row in result.confusion)
    assert cm_sum == result.test_size

    # --- Similarity index ---------------------------------------------------
    info = build_index(cfg, ckpt)
    assert info["n_indexed"] > 0
    idx = SimilarityIndex(cfg)
    # Query with a synthetic L2-normalized vector
    rng = np.random.RandomState(0)
    q = rng.randn(int(cfg["model"]["embedding_dim"])).astype(np.float32)
    q /= np.linalg.norm(q) + 1e-9
    matches = idx.query(q, k=3)
    assert isinstance(matches, list)

    # --- FastAPI ------------------------------------------------------------
    # Re-import the app and re-run startup so it picks up the temp artifacts.
    import src.serve.app as serve_mod
    import importlib
    serve_mod = importlib.reload(serve_mod)
    # Point the app at the temp artifacts by writing a temp config file
    cfg_path = artifacts.parent / "test_config.yaml"
    import yaml
    cfg_path.write_text(yaml.safe_dump(dict(cfg)))
    serve_mod.startup(cfg_path)
    assert serve_mod.state.ready, f"server not ready: {serve_mod.state.startup_errors}"

    client = TestClient(serve_mod.app)
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["ok"] is True
    r = client.get("/version")
    assert r.status_code == 200

    # Build a fake foot-ish image to send
    img = Image.new("RGB", (224, 224), (200, 160, 130))
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    buf.seek(0)
    r = client.post(
        "/predict",
        files={"image": ("foot.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "disclaimer" in body and "Screening aid" in body["disclaimer"]
    assert "prediction" in body and "model_version" in body


def test_onnx_export_parity(quick_cfg, sample_data):
    from src.config import Config
    from src.train.trainer import run_cv
    from src.export.onnx_export import export_onnx

    cfg = Config(quick_cfg)
    artifacts = Path(cfg["paths"]["artifacts"])
    if not (artifacts / "best.ckpt").exists():
        run_cv(cfg, output_dir=artifacts)

    result = export_onnx(cfg, artifacts / "best.ckpt", output_path=artifacts / "model.onnx")
    assert result.onnx_path.exists()
    assert result.parity_ok, (
        f"ONNX parity failed: logits diff {result.max_abs_diff_logits}, "
        f"embeddings diff {result.max_abs_diff_embeddings}"
    )
