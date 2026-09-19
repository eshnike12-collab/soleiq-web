"""Forward-shape + tiny-batch overfit sanity tests for the model."""

from __future__ import annotations

import torch

from src.models.model import build_model
from src.train.loss import CombinedLoss, compute_class_weights


def test_forward_shapes(cfg):
    model = build_model(cfg).eval()
    x = torch.randn(2, 3, int(cfg["data"]["image_size"]), int(cfg["data"]["image_size"]))
    out = model(x)
    assert out.logits.shape == (2, int(cfg["model"]["num_classes"]))
    assert out.embeddings.shape == (2, int(cfg["model"]["embedding_dim"]))
    # Embeddings L2-normalized
    norms = out.embeddings.norm(dim=1)
    assert torch.allclose(norms, torch.ones_like(norms), atol=1e-4)


def test_class_weights_inverse_frequency():
    labels = [0, 0, 0, 1]
    w = compute_class_weights(labels, n_classes=2)
    # class 1 should weigh more than class 0
    assert w[1] > w[0]


def test_combined_loss_drives_classifier_overfit(cfg):
    """Tiny-batch overfit sanity check — if loss can't drop on 8 images,
    something is wired wrong upstream."""
    torch.manual_seed(0)
    model = build_model(cfg)
    model.train()
    size = int(cfg["data"]["image_size"])
    x = torch.randn(8, 3, size, size)
    y = torch.tensor([0, 0, 0, 0, 1, 1, 1, 1])
    loss_fn = CombinedLoss(
        ce_weight=1.0,
        supcon_weight=0.3,
        supcon_temperature=0.1,
        class_weights=torch.tensor([1.0, 1.0]),
    )
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)

    losses = []
    for _ in range(50):
        out = model(x)
        l = loss_fn(out.logits, out.embeddings, y)["total"]
        opt.zero_grad(set_to_none=True)
        l.backward()
        opt.step()
        losses.append(float(l.item()))
    assert losses[-1] < losses[0] * 0.8, (
        f"loss did not decrease meaningfully: {losses[0]:.3f} → {losses[-1]:.3f}"
    )
