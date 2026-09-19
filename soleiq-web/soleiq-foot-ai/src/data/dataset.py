"""Dataset loading with auto-detection.

Two supported layouts:

  A. Class folders (one folder per label):
        data/raw/no_ulcer/p012_view1.jpg
        data/raw/ulcer/p087_view3.jpg
     Patient ID = filename prefix before the first underscore. If a file
     has no underscore, the stem (filename minus extension) is used as
     the patient_id — meaning every photo is its own patient.

  B. Flat folder + labels.csv:
        data/raw/images/p012_view1.jpg
        data/raw/labels.csv  (image_id, label, optional patient_id, ...)

A `patient_ids.csv` sidecar in the root of layout A overrides the
prefix heuristic if you'd rather supply patient IDs explicitly.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset

from .splits import Sample


# ---- public API -----------------------------------------------------------


def discover_samples(root: Path, classes: Sequence[str]) -> List[Sample]:
    """Find images + labels in either supported layout. Patient IDs are
    populated when discoverable; absent → None."""
    root = Path(root)
    if not root.exists():
        raise FileNotFoundError(f"Data root does not exist: {root}")

    # Layout A: presence of any class-named subdir
    if any((root / c).is_dir() for c in classes):
        return _discover_class_folders(root, classes)

    # Layout A flat reference dir (used by the sample-data generator and
    # the reference-bank loader): images/ subdir + a single labels CSV at root.
    images_dir = root / "images"
    if images_dir.is_dir():
        csv_path = _find_labels_csv(root)
        if csv_path is None:
            raise FileNotFoundError(
                f"Found {images_dir} but no labels CSV in {root}"
            )
        return _discover_flat_csv(images_dir, csv_path)

    raise FileNotFoundError(
        f"No supported layout found in {root}. "
        "Expected either class-named subfolders or images/ + labels CSV."
    )


def class_to_index(classes: Sequence[str]) -> Dict[str, int]:
    return {c: i for i, c in enumerate(classes)}


def class_distribution(samples: Sequence[Sample]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for s in samples:
        counts[s.label] = counts.get(s.label, 0) + 1
    return counts


# ---- internals ------------------------------------------------------------


def _find_labels_csv(root: Path) -> Optional[Path]:
    for name in ("labels.csv", "reference_labels.csv"):
        p = root / name
        if p.exists():
            return p
    return None


def _discover_class_folders(root: Path, classes: Sequence[str]) -> List[Sample]:
    sidecar = _load_patient_sidecar(root / "patient_ids.csv")
    samples: List[Sample] = []
    for cls in classes:
        d = root / cls
        if not d.is_dir():
            continue
        for path in sorted(d.iterdir()):
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
                continue
            image_id = f"{cls}/{path.name}"
            pid = (
                sidecar.get(path.name)
                if sidecar
                else _patient_id_from_filename(path.name)
            )
            samples.append(Sample(image_id=image_id, label=cls, patient_id=pid))
    return samples


def _discover_flat_csv(images_dir: Path, csv_path: Path) -> List[Sample]:
    samples: List[Sample] = []
    with csv_path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            image_id = row["image_id"].strip()
            label = row["label"].strip()
            pid = (row.get("patient_id") or "").strip() or None
            samples.append(Sample(image_id=image_id, label=label, patient_id=pid))
    return samples


def _patient_id_from_filename(filename: str) -> Optional[str]:
    """Prefix before the first underscore. None if there isn't one — the
    splitter then treats each image as its own patient."""
    stem = Path(filename).stem
    if "_" not in stem:
        return None
    return stem.split("_", 1)[0]


def _load_patient_sidecar(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    out: Dict[str, str] = {}
    with path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            fn = row.get("image_id") or row.get("filename")
            pid = row.get("patient_id")
            if fn and pid:
                out[fn.strip()] = pid.strip()
    return out


# ---- Torch dataset --------------------------------------------------------


class FootImageDataset(Dataset):
    """Loads an image + binary label as a tensor.

    `samples` is a list of `Sample`; `indices` selects a subset (used for
    train/val/test slicing). `transform` is an Albumentations Compose.
    """

    def __init__(
        self,
        samples: Sequence[Sample],
        indices: Sequence[int],
        image_root: Path,
        transform,
        class_to_index_map: Dict[str, int],
    ):
        self.samples = list(samples)
        self.indices = list(indices)
        self.image_root = Path(image_root)
        self.transform = transform
        self.class_to_index = dict(class_to_index_map)

    def __len__(self) -> int:
        return len(self.indices)

    def __getitem__(self, i: int) -> Tuple[torch.Tensor, int, str]:
        s = self.samples[self.indices[i]]
        img_path = self.image_root / s.image_id
        with Image.open(img_path) as im:
            arr = np.asarray(im.convert("RGB"))
        out = self.transform(image=arr)
        return out["image"], self.class_to_index[s.label], s.image_id


def resolve_image_root(cfg, mode: str = "main") -> Path:
    """Return the directory images live in for a given config + mode.

    `mode="main"` returns the dataset root that pairs with labels.csv or
    class subfolders. `mode="reference"` is for the similarity reference
    bank.
    """
    from src.config import project_root

    root = project_root()
    if cfg["data"]["source"] == "sample":
        if mode == "reference":
            return root / cfg["paths"]["sample"] / "reference" / "images"
        return root / cfg["paths"]["sample"] / "images"
    # raw data
    if mode == "reference":
        return root / cfg["paths"]["reference_bank"] / "images"
    return root / cfg["paths"]["data_raw"]


def resolve_sample_root(cfg, mode: str = "main") -> Path:
    """The directory we *discover* in (one level up from the images dir
    when the layout uses an images/ subfolder)."""
    from src.config import project_root

    root = project_root()
    if cfg["data"]["source"] == "sample":
        if mode == "reference":
            return root / cfg["paths"]["sample"] / "reference"
        return root / cfg["paths"]["sample"]
    if mode == "reference":
        return root / cfg["paths"]["reference_bank"]
    return root / cfg["paths"]["data_raw"]
