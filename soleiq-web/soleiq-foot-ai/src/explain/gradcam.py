"""Grad-CAM for the classification head.

Hooks the last conv block of the timm backbone, captures activations +
gradients, and produces a (H, W) heatmap aligned to the input image.
"""

from __future__ import annotations

import base64
import io
from typing import List, Optional, Tuple

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from src.models.model import FootAIModel


def _find_last_conv(model: FootAIModel) -> torch.nn.Module:
    """Last 2D conv in the backbone. Works for EfficientNet, ResNet, etc."""
    last = None
    for m in model.backbone.modules():
        if isinstance(m, torch.nn.Conv2d):
            last = m
    if last is None:
        raise RuntimeError("No Conv2d layer found in backbone — Grad-CAM unsupported")
    return last


class GradCAM:
    def __init__(self, model: FootAIModel, target_layer: Optional[torch.nn.Module] = None):
        self.model = model
        self.target_layer = target_layer or _find_last_conv(model)
        self._acts: Optional[torch.Tensor] = None
        self._grads: Optional[torch.Tensor] = None
        self._h_fwd = self.target_layer.register_forward_hook(self._fwd_hook)
        self._h_bwd = self.target_layer.register_full_backward_hook(self._bwd_hook)

    def _fwd_hook(self, _m, _inp, out):
        self._acts = out.detach()

    def _bwd_hook(self, _m, _grad_in, grad_out):
        self._grads = grad_out[0].detach()

    def close(self) -> None:
        self._h_fwd.remove()
        self._h_bwd.remove()

    def __enter__(self) -> "GradCAM":
        return self

    def __exit__(self, *_):
        self.close()

    def heatmap(self, image: torch.Tensor, class_idx: int = 1) -> np.ndarray:
        """Returns a (H, W) array in [0, 1], up-sampled to match `image`."""
        self.model.eval()
        image = image.detach().clone().requires_grad_(False)
        if image.dim() == 3:
            image = image.unsqueeze(0)
        # Forward
        for p in self.model.parameters():
            p.requires_grad_(True)
        self.model.zero_grad(set_to_none=True)
        out = self.model(image)
        score = out.logits[:, class_idx].sum()
        score.backward()

        acts = self._acts
        grads = self._grads
        if acts is None or grads is None:
            raise RuntimeError("Grad-CAM hooks captured nothing")

        weights = grads.mean(dim=(2, 3), keepdim=True)  # (1, C, 1, 1)
        cam = (weights * acts).sum(dim=1, keepdim=True)  # (1, 1, h', w')
        cam = F.relu(cam)
        cam = F.interpolate(cam, size=image.shape[2:], mode="bilinear", align_corners=False)
        cam = cam[0, 0].cpu().numpy()
        cam = cam - cam.min()
        denom = cam.max() if cam.max() > 0 else 1.0
        cam = cam / denom
        return cam


def overlay_heatmap(image_rgb: np.ndarray, cam: np.ndarray, alpha: float = 0.45) -> np.ndarray:
    """Combine an RGB image (HWC uint8) with a (H, W) cam in [0, 1].

    Returns a uint8 HWC overlay using a jet-style colormap.
    """
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.cm as cm

    cmap = cm.get_cmap("jet")
    heat = (cmap(cam)[..., :3] * 255).astype(np.uint8)
    base = image_rgb.astype(np.float32)
    over = base * (1 - alpha) + heat.astype(np.float32) * alpha
    return np.clip(over, 0, 255).astype(np.uint8)


def gradcam_grid(
    pairs: List[Tuple[np.ndarray, np.ndarray, str]],
    cols: int = 4,
    cell_px: int = 200,
) -> str:
    """Take (overlay, original, caption) tuples and tile into one PNG.

    Returns base64-encoded PNG suitable for embedding in HTML.
    """
    if not pairs:
        return ""
    import matplotlib.pyplot as plt

    rows = (len(pairs) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 2.4, rows * 2.4))
    if rows == 1 and cols == 1:
        axes = [[axes]]
    elif rows == 1:
        axes = [axes]
    elif cols == 1:
        axes = [[a] for a in axes]
    idx = 0
    for r in range(rows):
        for c in range(cols):
            ax = axes[r][c]
            ax.axis("off")
            if idx >= len(pairs):
                continue
            overlay, _orig, caption = pairs[idx]
            ax.imshow(overlay)
            ax.set_title(caption, fontsize=7)
            idx += 1
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
    import matplotlib.pyplot as _plt

    _plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")
