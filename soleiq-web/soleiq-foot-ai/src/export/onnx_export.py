"""Export the trained model to ONNX and verify parity vs PyTorch.

The exported graph emits both `logits` and `embeddings` so a single
inference call serves both the classifier and the similarity engine.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

import numpy as np
import onnx
import onnxruntime as ort
import torch

from src.config import project_root
from src.models.model import build_model


@dataclass
class ExportResult:
    onnx_path: Path
    max_abs_diff_logits: float
    max_abs_diff_embeddings: float
    parity_ok: bool


class _ExportWrapper(torch.nn.Module):
    """ONNX needs a forward that returns plain tensors (not a dataclass)."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, x):
        out = self.model(x)
        return out.logits, out.embeddings


def export_onnx(cfg, checkpoint_path: Path, output_path: Path | None = None) -> ExportResult:
    classes = list(cfg["data"]["classes"])
    size = int(cfg["data"]["image_size"])
    opset = int(cfg["export"]["onnx_opset"])
    atol = float(cfg["export"]["parity_atol"])

    output_path = output_path or (
        project_root() / cfg["paths"]["artifacts"] / "model.onnx"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    device = torch.device("cpu")  # export on CPU for reproducibility
    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    wrapper = _ExportWrapper(model).eval()

    dummy = torch.randn(1, 3, size, size)
    torch.onnx.export(
        wrapper,
        (dummy,),
        str(output_path),
        input_names=["image"],
        output_names=["logits", "embeddings"],
        opset_version=opset,
        dynamic_axes={
            "image": {0: "batch"},
            "logits": {0: "batch"},
            "embeddings": {0: "batch"},
        },
        do_constant_folding=True,
    )
    onnx.checker.check_model(str(output_path))

    # Parity: PyTorch vs ONNX Runtime on a fixed input.
    with torch.no_grad():
        pt_logits, pt_embeddings = wrapper(dummy)
    sess = ort.InferenceSession(str(output_path), providers=["CPUExecutionProvider"])
    ort_logits, ort_embeddings = sess.run(
        ["logits", "embeddings"], {"image": dummy.numpy().astype(np.float32)}
    )
    diff_logits = float(np.max(np.abs(pt_logits.numpy() - ort_logits)))
    diff_embeddings = float(np.max(np.abs(pt_embeddings.numpy() - ort_embeddings)))

    return ExportResult(
        onnx_path=output_path,
        max_abs_diff_logits=diff_logits,
        max_abs_diff_embeddings=diff_embeddings,
        parity_ok=(diff_logits <= atol and diff_embeddings <= atol),
    )
