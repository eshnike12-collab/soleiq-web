"""
Per-frame dense depth from a learned model.

Depth Anything V2 Small — Apache-2.0, 24.8M parameters. Chosen over
DUSt3R/MASt3R/VGGT, which are all CC-BY-NC and therefore unusable in a
commercial medical product regardless of their quality.

The model predicts *relative inverse depth*: bigger means nearer, with an
unknown scale and offset per image. It is `fuse.align_to_sparse` that turns
that into metric depth, using the SfM sparse points as the reference. Nothing
here knows about real-world units and nothing here should pretend to.
"""

from __future__ import annotations

import os

# DINOv2's positional-embedding interpolation calls upsample_bicubic2d, which
# Metal does not implement (pytorch#77764). Without this the model raises on
# any input whose patch grid differs from the pretrained 518x518 — i.e. every
# real photo. The fallback runs just that one op on the CPU; the rest of the
# network still executes on the GPU. Set before torch is imported anywhere in
# this process.
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

from functools import lru_cache
from pathlib import Path

import numpy as np
import torch
from PIL import Image

MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"
MODEL_LICENSE = "Apache-2.0"


def _device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


@lru_cache(maxsize=1)
def _load():
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation

    proc = AutoImageProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForDepthEstimation.from_pretrained(MODEL_ID)
    return proc, model.to(_device()).eval()


def predict_relative_depth(path: Path, out_hw: tuple[int, int]) -> np.ndarray:
    """
    Relative inverse depth for one frame, resampled to (H, W).

    Resampled to the source resolution so a pixel in the returned map
    corresponds to the same pixel in the photo the poses were solved from.
    """
    proc, model = _load()
    img = Image.open(path).convert("RGB")
    inputs = proc(images=img, return_tensors="pt")
    dev = _device()
    with torch.no_grad():
        out = model(**{k: v.to(dev) for k, v in inputs.items()})
    depth = out.predicted_depth  # (1, h, w)
    depth = torch.nn.functional.interpolate(
        depth.unsqueeze(1), size=out_hw, mode="bicubic", align_corners=False
    )[0, 0]
    return depth.float().cpu().numpy()
