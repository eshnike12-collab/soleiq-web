"""Model: timm backbone + classification head + embedding head.

Two heads share the same backbone:

    image -> backbone -> features ──┬──> classifier_head -> 2-way logits
                                    └──> embedding_head  -> L2-normalized vec

Joint training uses cross-entropy on the classifier head + supervised
contrastive loss on the embedding head. The same embeddings power the
FAISS similarity engine at inference time.

Why one model, not two:
  * The features the backbone learns for classification are exactly the
    ones we want for retrieval. Training them jointly converges faster
    and yields embeddings that cluster by class.
  * Maintaining one set of weights is simpler in production.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import timm
import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class FootAIOutput:
    logits: torch.Tensor       # (B, num_classes)
    embeddings: torch.Tensor   # (B, embed_dim) — already L2-normalized
    features: torch.Tensor     # (B, backbone_dim) — pre-head pooled features


class FootAIModel(nn.Module):
    def __init__(
        self,
        backbone: str = "efficientnet_b0",
        pretrained: bool = True,
        num_classes: int = 2,
        embedding_dim: int = 256,
        dropout: float = 0.2,
    ):
        super().__init__()
        # num_classes=0 + global_pool="avg" gives a pooled feature vector,
        # so we don't fight timm's default classifier head.
        self.backbone = timm.create_model(
            backbone,
            pretrained=pretrained,
            num_classes=0,
            global_pool="avg",
        )
        self.feature_dim = int(self.backbone.num_features)

        self.classifier_head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(self.feature_dim, num_classes),
        )

        # Embedding head: linear projection → BN → L2 normalize. BN before
        # the normalization helps SupCon training stay stable.
        self.embedding_head = nn.Sequential(
            nn.Linear(self.feature_dim, embedding_dim, bias=False),
            nn.BatchNorm1d(embedding_dim),
        )

    def freeze_backbone(self) -> None:
        for p in self.backbone.parameters():
            p.requires_grad = False

    def unfreeze_backbone(self) -> None:
        for p in self.backbone.parameters():
            p.requires_grad = True

    def forward(self, x: torch.Tensor) -> FootAIOutput:
        features = self.backbone(x)
        logits = self.classifier_head(features)
        embeddings_raw = self.embedding_head(features)
        embeddings = F.normalize(embeddings_raw, p=2, dim=1)
        return FootAIOutput(logits=logits, embeddings=embeddings, features=features)


def build_model(cfg) -> FootAIModel:
    m = cfg["model"]
    return FootAIModel(
        backbone=str(m["backbone"]),
        pretrained=bool(m.get("pretrained", True)),
        num_classes=int(m.get("num_classes", 2)),
        embedding_dim=int(m.get("embedding_dim", 256)),
        dropout=float(m.get("dropout", 0.2)),
    )


def parameter_groups(model: FootAIModel, lr_head: float, lr_backbone: float, wd: float):
    """Two parameter groups so the head can learn fast while the backbone
    fine-tunes gently."""
    head_params = list(model.classifier_head.parameters()) + list(
        model.embedding_head.parameters()
    )
    backbone_params = list(model.backbone.parameters())
    return [
        {"params": head_params, "lr": lr_head, "weight_decay": wd},
        {"params": backbone_params, "lr": lr_backbone, "weight_decay": wd},
    ]
