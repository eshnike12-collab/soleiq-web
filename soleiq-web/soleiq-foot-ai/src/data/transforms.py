"""Train/eval transforms.

Two pipelines exposed:
  * `build_train_transform(cfg)` — heavy realistic augmentation. Used while
    fitting the classifier and learning embeddings.
  * `build_eval_transform(cfg)` — deterministic resize + normalize. Used
    for validation, the eval report, similarity-index embedding, and
    inference.

We DON'T do extreme hue shifts or channel inversions: the model is meant
to use skin color and lesion redness as signal. Distorting that
unrealistically would teach the network something clinically wrong.
"""

from __future__ import annotations

from typing import Any, Dict

import albumentations as A
import cv2
import numpy as np
from albumentations.pytorch import ToTensorV2

# ImageNet stats — backbone is pretrained on ImageNet, so normalize the same way.
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def build_train_transform(cfg) -> A.Compose:
    aug: Dict[str, Any] = cfg["augmentation"]["train"]
    size = int(cfg["data"]["image_size"])
    return A.Compose(
        [
            A.LongestMaxSize(max_size=int(size * 1.15)),
            A.PadIfNeeded(
                min_height=int(size * 1.15),
                min_width=int(size * 1.15),
                border_mode=cv2.BORDER_REPLICATE,
            ),
            A.HorizontalFlip(p=float(aug.get("horizontal_flip", 0.5))),
            A.VerticalFlip(p=float(aug.get("vertical_flip", 0.0))),
            A.Affine(
                rotate=(-float(aug["rotate_deg"]), float(aug["rotate_deg"])),
                scale=(float(aug["scale_min"]), float(aug["scale_max"])),
                translate_percent=(-0.06, 0.06),
                fit_output=False,
                p=0.85,
            ),
            A.RandomCrop(height=size, width=size),
            A.ColorJitter(
                brightness=float(aug["brightness"]),
                contrast=float(aug["contrast"]),
                saturation=float(aug["saturation"]),
                hue=float(aug["hue"]),
                p=0.7,
            ),
            A.OneOf(
                [
                    A.GaussianBlur(blur_limit=(3, 5)),
                    A.MotionBlur(blur_limit=(3, 5)),
                ],
                p=float(aug.get("blur_prob", 0.15)),
            ),
            A.GaussNoise(p=float(aug.get("noise_prob", 0.15))),
            A.CoarseDropout(
                num_holes_range=(1, 3),
                hole_height_range=(int(size * 0.05), int(size * 0.15)),
                hole_width_range=(int(size * 0.05), int(size * 0.15)),
                fill=0,
                p=float(aug.get("coarse_dropout_prob", 0.20)),
            ),
            A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ToTensorV2(),
        ]
    )


def build_eval_transform(cfg) -> A.Compose:
    size = int(cfg["data"]["image_size"])
    return A.Compose(
        [
            A.LongestMaxSize(max_size=int(size * 1.15)),
            A.PadIfNeeded(
                min_height=int(size * 1.15),
                min_width=int(size * 1.15),
                border_mode=cv2.BORDER_REPLICATE,
            ),
            A.CenterCrop(height=size, width=size),
            A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ToTensorV2(),
        ]
    )


def denormalize(t: np.ndarray) -> np.ndarray:
    """Undo ImageNet normalize on a (3, H, W) numpy array. For visualizations."""
    mean = np.array(IMAGENET_MEAN).reshape(3, 1, 1)
    std = np.array(IMAGENET_STD).reshape(3, 1, 1)
    return np.clip(t * std + mean, 0, 1)
