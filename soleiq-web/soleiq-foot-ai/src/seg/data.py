"""
Dataset for FUSeg wound segmentation.

Reads the deduplicated manifest rather than globbing the directory. That is
deliberate: the raw download contains 17 duplicate images inside train and 7
images that appear in BOTH train and validation. Training on the raw layout
inflates the validation score with images the model has memorised, and nothing
warns you — the run simply looks good.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset

MANIFEST = Path("data/fuseg_manifest.json")

#: ImageNet statistics — the encoder is pretrained on it, so inputs must match.
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def load_manifest() -> dict:
    if not MANIFEST.exists():
        raise FileNotFoundError(
            f"{MANIFEST} is missing. Run the dedup step before training."
        )
    return json.loads(MANIFEST.read_text())


class WoundSegDataset(Dataset):
    """Image/mask pairs at a fixed square size.

    Augmentation is deliberately conservative: flips and 90-degree rotations
    only. No hue or saturation jitter — wound tissue is identified largely BY
    its colour (granulation red, slough yellow, eschar black), so shifting hue
    teaches the model that colour does not matter, which is the opposite of
    true.
    """

    def __init__(self, pairs: list[tuple[str, str]], size: int = 512, augment: bool = False):
        self.pairs = pairs
        self.size = size
        self.augment = augment

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int):
        image_path, mask_path = self.pairs[idx]
        image = Image.open(image_path).convert("RGB").resize(
            (self.size, self.size), Image.BILINEAR
        )
        # NEAREST for the mask: bilinear would invent intermediate values along
        # the boundary and blur the very edge the measurement depends on.
        mask = Image.open(mask_path).convert("L").resize(
            (self.size, self.size), Image.NEAREST
        )

        x = np.asarray(image, dtype=np.float32) / 255.0

        # Mask encoding differs BETWEEN datasets in this corpus: FUSeg stores
        # 0/255, Medetec stores 0/1. A fixed >127 threshold silently loads
        # every Medetec mask as entirely empty, which scores Dice 0.000 on
        # every image and reads exactly like a model that fails to generalise.
        # It is not — it is a loader bug. Threshold on the array's own range.
        raw = np.asarray(mask, dtype=np.float32)
        y = (raw > (raw.max() / 2.0 if raw.max() > 0 else 0.5)).astype(np.float32)

        if self.augment:
            if np.random.rand() < 0.5:
                x, y = x[:, ::-1], y[:, ::-1]
            if np.random.rand() < 0.5:
                x, y = x[::-1], y[::-1]
            k = np.random.randint(4)
            if k:
                x, y = np.rot90(x, k, (0, 1)), np.rot90(y, k, (0, 1))
            x, y = np.ascontiguousarray(x), np.ascontiguousarray(y)

        x = (x - MEAN) / STD
        return (
            torch.from_numpy(x.transpose(2, 0, 1)),
            torch.from_numpy(y).unsqueeze(0),
        )
