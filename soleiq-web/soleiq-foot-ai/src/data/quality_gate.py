"""Lightweight pre-classification quality gate.

Three cheap checks: blur (Laplacian variance), exposure (mean luminance
in a clinically usable range), and a foot-presence heuristic (Y/Cr/Cb
skin-color mask covering a reasonable fraction of the frame).

The gate is not a clinical-grade detector. Its job is to surface
obvious failures — finger over the lens, complete darkness, motion blur
— *before* we feed an image to the classifier and get a confident-looking
but meaningless score.

Returns a dict with each signal, an `ok` boolean, and human-readable
reasons for any failure. The reasons get plumbed into the API response
so the SoleIQ app can prompt the user to retake the photo.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

import cv2
import numpy as np
from PIL import Image


# Thresholds tuned conservatively. If real data shows them too strict
# (e.g. clinic lighting always trips "too bright"), surface in config.
BLUR_VAR_MIN = 8.0           # Laplacian variance; phone JPEGs compress
                              # detail aggressively — lower than the 25.0
                              # often quoted for raw images.
LUMA_MIN = 0.10              # mean luminance 0..1
LUMA_MAX = 0.95
SKIN_FRACTION_MIN = 0.04     # ≥4% of frame must look like skin


@dataclass
class QualityResult:
    ok: bool
    blur_var: float
    luma_mean: float
    skin_fraction: float
    reasons: List[str]

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "blur_var": float(self.blur_var),
            "luma_mean": float(self.luma_mean),
            "skin_fraction": float(self.skin_fraction),
            "reasons": list(self.reasons),
        }


def evaluate_quality(image: Image.Image) -> QualityResult:
    """Run the gate on a PIL.Image in any mode. Returns a QualityResult."""
    arr = np.asarray(image.convert("RGB"))
    if arr.size == 0:
        return QualityResult(False, 0.0, 0.0, 0.0, ["empty image"])

    h, w = arr.shape[:2]
    if h < 32 or w < 32:
        return QualityResult(False, 0.0, 0.0, 0.0, [f"image too small ({w}x{h})"])

    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    luma_mean = float(gray.mean() / 255.0)

    # Skin mask in YCbCr. The "classic" Cr 135-180 / Cb 85-135 range from
    # the 2000s literature is too narrow — it misses lighter callused skin
    # under clinic lighting and is biased against darker skin tones. The
    # relaxed range below was empirically validated against the Goyal et al.
    # DFUNet Normal patches and is also closer to ranges proposed in more
    # recent fairness-aware skin-detection work.
    ycbcr = cv2.cvtColor(arr, cv2.COLOR_RGB2YCrCb)
    cr = ycbcr[..., 1]
    cb = ycbcr[..., 2]
    skin_mask = (cr >= 130) & (cr <= 185) & (cb >= 75) & (cb <= 140)
    skin_fraction = float(skin_mask.mean())

    reasons: List[str] = []
    if blur_var < BLUR_VAR_MIN:
        reasons.append(f"image looks blurry (laplacian var {blur_var:.1f})")
    if luma_mean < LUMA_MIN:
        reasons.append("image is very dark")
    elif luma_mean > LUMA_MAX:
        reasons.append("image is overexposed")
    if skin_fraction < SKIN_FRACTION_MIN:
        reasons.append("no plausible foot / skin region detected")
    # The classic "lens covered" check (skin_fraction > 0.95) misfires on
    # legitimate close-up foot crops where the foot fills the frame. The
    # actual finger-over-lens signature is high skin fraction AND nearly
    # zero edge content — both at once.
    elif skin_fraction > 0.97 and blur_var < 5.0:
        reasons.append("something appears to be covering the lens")

    return QualityResult(
        ok=len(reasons) == 0,
        blur_var=blur_var,
        luma_mean=luma_mean,
        skin_fraction=skin_fraction,
        reasons=reasons,
    )
