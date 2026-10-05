"""Wound segmentation and measurement over a single photograph.

One endpoint, `POST /segment`. It runs the trained U-Net + MobileNetV3
segmenter over an uploaded image, measures the largest region it finds, and
returns the measurement plus the contour for overlay rendering.

WHAT THIS MODEL KNOWS, AND WHAT IT DOES NOT
-------------------------------------------
It was trained on the Foot Ulcer Segmentation Challenge corpus with ONE class:
wound. It has never seen a label for dryness, redness, callus, or a healthy
foot, so it cannot report any of those. A frame with nothing wound-like in it
yields no region, which is reported honestly as `found: false` — NOT as
"healthy", which is a clinical claim this model is in no position to make.

Measured performance on held-out data: Dice 0.838 in-domain (FUSeg validation),
0.660 cross-dataset (Medetec). The second number is the one to plan around.

SCALE
-----
Millimetre values require a scale reference in frame. Without one, every mm
field is null and only pixel measures are returned — never a millimetre figure
the calibration does not support.

AUTH
----
Foot photographs of identified patients are protected health information. This
route sits behind the same Supabase JWT check as the scan routes, and fails
closed when auth is not configured.
"""

from __future__ import annotations

import io
import os
from pathlib import Path

import numpy as np
import torch
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image

from ..seg.data import MEAN, STD
from ..seg.measure import measure_mask
from .scan_auth import require_scan_auth

router = APIRouter(tags=["segmentation"])

#: Fallback only. The real value is read from the checkpoint, which records
#: the resolution it was trained at — inference at any other size silently
#: degrades the model rather than failing.
IMG_SIZE = 512

#: Probability above which a pixel counts as wound. 0.5 is the operating point
#: the reported Dice figures were measured at; changing it invalidates them.
DEFAULT_THRESHOLD = 0.5

CHECKPOINT = Path(
    os.getenv("SOLEIQ_SEG_CHECKPOINT", "artifacts/segmentation/best.pt")
)

_model: torch.nn.Module | None = None
_model_size: int = IMG_SIZE
_model_error: str | None = None


def _load_model() -> torch.nn.Module:
    """Load the checkpoint once, on first use.

    Lazily rather than at import so the rest of the service still starts when
    the checkpoint is absent — a missing segmenter degrades this one endpoint
    instead of taking down reconstruction and scanning with it.
    """
    global _model, _model_size, _model_error
    if _model is not None:
        return _model
    if _model_error is not None:
        raise HTTPException(status_code=503, detail=_model_error)

    try:
        import segmentation_models_pytorch as smp

        # The checkpoint written by src/seg/train.py is self-describing: it
        # carries the encoder name and the training resolution alongside the
        # weights. Both are READ rather than hardcoded here, because a model
        # rebuilt with the wrong encoder fails loudly on load, while one run
        # at the wrong resolution loads fine and quietly scores worse.
        checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=False)
        if not isinstance(checkpoint, dict) or "state_dict" not in checkpoint:
            raise ValueError(
                "Unexpected checkpoint layout: expected a dict with 'state_dict'."
            )
        encoder = checkpoint.get("encoder") or "timm-mobilenetv3_large_100"
        _model_size = int(checkpoint.get("size") or IMG_SIZE)

        model = smp.Unet(
            encoder_name=encoder,
            encoder_weights=None,  # weights come from the checkpoint
            in_channels=3,
            classes=1,
        )
        model.load_state_dict(checkpoint["state_dict"])
        model.eval()
        _model = model
        return model
    except FileNotFoundError:
        _model_error = (
            f"Segmentation checkpoint not found at {CHECKPOINT}. "
            "Train it with src/seg/train.py or set SOLEIQ_SEG_CHECKPOINT."
        )
        raise HTTPException(status_code=503, detail=_model_error)
    except Exception as exc:  # noqa: BLE001 - reported, not swallowed
        _model_error = f"Segmentation model could not be loaded: {exc}"
        raise HTTPException(status_code=503, detail=_model_error)


def _preprocess(image: Image.Image) -> tuple[torch.Tensor, tuple[int, int]]:
    """Exactly the transform src/seg/data.py applies, and for that reason.

    Returns the batched tensor and the ORIGINAL (width, height), so the mask
    can be mapped back to the frame the caller sent rather than to 512x512.
    """
    original = image.size
    resized = image.convert("RGB").resize((_model_size, _model_size), Image.BILINEAR)
    x = np.asarray(resized, dtype=np.float32) / 255.0
    x = (x - MEAN) / STD
    tensor = torch.from_numpy(x.transpose(2, 0, 1)).unsqueeze(0)
    return tensor, original


@router.post("/segment")
async def segment(
    file: UploadFile = File(...),
    #: Millimetres per pixel IN THE ORIGINAL FRAME, when the caller has a
    #: scale reference. Omit it and every mm field comes back null.
    mm_per_px: float | None = Form(default=None),
    threshold: float = Form(default=DEFAULT_THRESHOLD),
    claims: dict | None = Depends(require_scan_auth),
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload.")
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except Exception:
        raise HTTPException(status_code=400, detail="Unreadable image.")

    model = _load_model()
    tensor, (width, height) = _preprocess(image)

    with torch.no_grad():
        logits = model(tensor)
        probability = torch.sigmoid(logits)[0, 0].cpu().numpy()

    # Back to the caller's frame BEFORE measuring, so pixel measurements are
    # in their coordinates and the contour lands on their image. Resizing the
    # probability map (not the binary mask) keeps the boundary smooth.
    probability_full = np.asarray(
        Image.fromarray((probability * 255).astype(np.uint8)).resize(
            (width, height), Image.BILINEAR
        ),
        dtype=np.float32,
    ) / 255.0
    mask = (probability_full >= threshold).astype(np.uint8)

    measurement = measure_mask(mask, mm_per_px=mm_per_px)

    if measurement is None:
        # Nothing wound-like above threshold. Deliberately NOT "healthy".
        return {
            "found": False,
            "measurement": None,
            "model_version": "seg-v1-mnv3-fuseg",
            "threshold": threshold,
            "frame": {"width": width, "height": height},
            "scale_available": mm_per_px is not None,
        }

    return {
        "found": True,
        "measurement": measurement.as_dict(),
        "model_version": "seg-v1-mnv3-fuseg",
        "threshold": threshold,
        "frame": {"width": width, "height": height},
        "scale_available": mm_per_px is not None,
        # Peak confidence inside the region — a weak detection should look
        # weak to the caller rather than identical to a strong one.
        "peak_probability": float(probability_full[mask > 0].max()),
    }
