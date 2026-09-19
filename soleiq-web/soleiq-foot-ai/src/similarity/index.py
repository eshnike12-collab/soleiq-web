"""Build + query the FAISS similarity index.

The index lives at `artifacts/similarity/` and contains:
  * `index.faiss`        — IndexFlatIP over L2-normalized embeddings
                            (so inner product == cosine similarity).
  * `metadata.json`      — list of {id, label} rows aligned to the index.
  * `bank_version`       — string copied from config at build time.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import faiss
import numpy as np
import torch
from torch.utils.data import DataLoader

from src.config import project_root
from src.data.dataset import (
    FootImageDataset,
    class_to_index,
    discover_samples,
    resolve_image_root,
    resolve_sample_root,
)
from src.data.transforms import build_eval_transform
from src.models.model import FootAIModel, build_model


def index_dir(cfg) -> Path:
    return project_root() / cfg["paths"]["artifacts"] / "similarity"


@dataclass
class SimilarMatch:
    id: str
    label: str
    distance: float

    def to_dict(self) -> dict:
        return {"id": self.id, "label": self.label, "distance": float(self.distance)}


@torch.no_grad()
def _embed_all(
    model: FootAIModel,
    loader: DataLoader,
    device: torch.device,
) -> tuple[np.ndarray, List[str], List[int]]:
    model.eval()
    embeddings = []
    ids: List[str] = []
    labels: List[int] = []
    for images, lbls, image_ids in loader:
        images = images.to(device, non_blocking=True)
        out = model(images)
        embeddings.append(out.embeddings.cpu().numpy())
        ids.extend(list(image_ids))
        labels.extend(lbls.tolist())
    if not embeddings:
        return np.zeros((0, 0), dtype=np.float32), [], []
    return np.concatenate(embeddings, axis=0).astype(np.float32), ids, labels


def build_index(cfg, checkpoint_path: Path) -> Dict[str, object]:
    """Embed every image in the reference bank and write a FAISS index."""
    classes = list(cfg["data"]["classes"])
    sample_root = resolve_sample_root(cfg, "reference")
    image_root = (
        sample_root / "images" if (sample_root / "images").exists() else sample_root
    )
    samples = discover_samples(sample_root, classes)
    if len(samples) == 0:
        raise RuntimeError(f"Reference bank at {sample_root} is empty.")

    transform = build_eval_transform(cfg)
    dataset = FootImageDataset(
        samples=samples,
        indices=list(range(len(samples))),
        image_root=image_root,
        transform=transform,
        class_to_index_map=class_to_index(classes),
    )
    loader = DataLoader(
        dataset, batch_size=int(cfg["train"]["batch_size"]),
        shuffle=False, num_workers=int(cfg["train"]["num_workers"]),
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["state_dict"])

    embeddings, ids, labels_int = _embed_all(model, loader, device)
    if embeddings.size == 0:
        raise RuntimeError("No embeddings produced — reference bank may be empty.")

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    out_dir = index_dir(cfg)
    out_dir.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(out_dir / "index.faiss"))

    idx_to_class = {i: c for c, i in class_to_index(classes).items()}
    metadata = [
        {"id": id_, "label": idx_to_class[lbl]}
        for id_, lbl in zip(ids, labels_int)
    ]
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))
    (out_dir / "bank_version").write_text(str(cfg["project"]["reference_bank_version"]))
    return {
        "n_indexed": int(embeddings.shape[0]),
        "embedding_dim": int(dim),
        "out_dir": str(out_dir),
    }


# ---- query side --------------------------------------------------------


class SimilarityIndex:
    """Loaded once at server startup; threadsafe-enough for inference reads."""

    def __init__(self, cfg, checkpoint_path: Optional[Path] = None):
        out_dir = index_dir(cfg)
        idx_path = out_dir / "index.faiss"
        meta_path = out_dir / "metadata.json"
        if not idx_path.exists() or not meta_path.exists():
            raise FileNotFoundError(
                f"FAISS index not built. Expected {idx_path}. "
                "Run scripts/build_similarity_index.py first."
            )
        self.index = faiss.read_index(str(idx_path))
        self.metadata: List[Dict[str, str]] = json.loads(meta_path.read_text())
        self.bank_version = (out_dir / "bank_version").read_text().strip()
        self.cutoff = float(cfg["similarity"]["distance_cutoff"])
        self.k_default = int(cfg["similarity"]["k"])

    def query(self, embedding: np.ndarray, k: Optional[int] = None) -> List[SimilarMatch]:
        """`embedding` is (D,) L2-normalized. Returns up to k SimilarMatch."""
        if embedding.ndim == 1:
            embedding = embedding[None, :]
        k = int(k or self.k_default)
        if k <= 0 or self.index.ntotal == 0:
            return []
        D, I = self.index.search(embedding.astype(np.float32), k)
        out: List[SimilarMatch] = []
        for sim, idx in zip(D[0], I[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            # Cosine distance = 1 - cosine_sim (range [0, 2])
            distance = float(1.0 - sim)
            if distance > self.cutoff:
                continue
            row = self.metadata[idx]
            out.append(SimilarMatch(id=row["id"], label=row["label"], distance=distance))
        return out

    def vote(self, matches: Sequence[SimilarMatch]) -> Dict[str, object]:
        """Distance-weighted vote across neighbors. Returns aggregated label
        + mean distance + per-label support counts."""
        if not matches:
            return {"label": None, "mean_distance": None, "support": {}}
        # Weight by (1 - distance) so closer matches count more.
        scores: Dict[str, float] = {}
        counts: Dict[str, int] = {}
        for m in matches:
            w = max(0.0, 1.0 - m.distance)
            scores[m.label] = scores.get(m.label, 0.0) + w
            counts[m.label] = counts.get(m.label, 0) + 1
        winner = max(scores.items(), key=lambda kv: kv[1])[0]
        mean_dist = float(np.mean([m.distance for m in matches]))
        return {"label": winner, "mean_distance": mean_dist, "support": counts}
