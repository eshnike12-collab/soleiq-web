"""Losses for joint training.

CE on the class head + supervised contrastive on the L2-normalized
embedding head. SupCon pulls same-class embeddings together and pushes
different-class ones apart, which is what makes the FAISS similarity
engine return clinically-meaningful neighbors at inference.
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class SupConLoss(nn.Module):
    """Supervised Contrastive Loss (Khosla et al., 2020).

    Operates on L2-normalized embeddings. For each anchor, the positives
    are all other samples in the batch with the same class label; the
    negatives are everything else.
    """

    def __init__(self, temperature: float = 0.07):
        super().__init__()
        self.temperature = float(temperature)

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        device = embeddings.device
        b = embeddings.size(0)
        if b < 2:
            return embeddings.new_zeros(())

        # Cosine similarity matrix (embeddings are already unit-norm).
        sim = torch.matmul(embeddings, embeddings.T) / self.temperature
        # For numerical stability, subtract per-row max before exp.
        sim_max, _ = sim.max(dim=1, keepdim=True)
        sim = sim - sim_max.detach()

        # Positive mask: same label, excluding self.
        labels_col = labels.view(-1, 1)
        same = labels_col.eq(labels_col.T).float()
        eye = torch.eye(b, device=device)
        positives_mask = same - eye
        # If a row has no positives (e.g. only one example of its class
        # in the batch), skip it — return 0 for that row.
        positives_per_anchor = positives_mask.sum(dim=1)
        valid = positives_per_anchor > 0

        if valid.sum() == 0:
            return embeddings.new_zeros(())

        # log-sum-exp over all but self
        non_self = 1.0 - eye
        log_prob_denom = torch.log((non_self * sim.exp()).sum(dim=1) + 1e-12)
        log_prob = sim - log_prob_denom.unsqueeze(1)

        # Mean log-prob over positives, only for valid anchors.
        mean_log_prob_pos = (positives_mask * log_prob).sum(dim=1) / (
            positives_per_anchor.clamp(min=1.0)
        )
        loss = -(mean_log_prob_pos[valid]).mean()
        return loss


class CombinedLoss(nn.Module):
    """CE + SupCon. Class weights for CE are passed in (auto-computed by
    the trainer from each fold's train-set class distribution)."""

    def __init__(
        self,
        ce_weight: float = 1.0,
        supcon_weight: float = 0.3,
        supcon_temperature: float = 0.10,
        class_weights: Optional[torch.Tensor] = None,
    ):
        super().__init__()
        self.ce_weight = float(ce_weight)
        self.supcon_weight = float(supcon_weight)
        self.ce = nn.CrossEntropyLoss(weight=class_weights)
        self.supcon = SupConLoss(temperature=supcon_temperature)

    def forward(
        self,
        logits: torch.Tensor,
        embeddings: torch.Tensor,
        labels: torch.Tensor,
    ) -> dict[str, torch.Tensor]:
        ce_l = self.ce(logits, labels)
        sc_l = (
            self.supcon(embeddings, labels)
            if self.supcon_weight > 0
            else logits.new_zeros(())
        )
        total = self.ce_weight * ce_l + self.supcon_weight * sc_l
        return {"total": total, "ce": ce_l.detach(), "supcon": sc_l.detach()}


def compute_class_weights(labels: list[int], n_classes: int) -> torch.Tensor:
    """Inverse-frequency weights. Returns a (n_classes,) FloatTensor."""
    counts = np.bincount(labels, minlength=n_classes).astype(np.float64)
    counts = np.where(counts == 0, 1.0, counts)
    inv = counts.sum() / (n_classes * counts)
    return torch.from_numpy(inv.astype(np.float32))
