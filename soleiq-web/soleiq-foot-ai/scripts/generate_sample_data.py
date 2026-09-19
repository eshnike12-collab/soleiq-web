#!/usr/bin/env python3
"""Generate synthetic sample data so the full pipeline runs day 1.

We draw cartoon foot silhouettes on neutral backgrounds, then add small
"ulcer-like" red/dark lesions to half of them. This is enough to:
  * exercise the dataloader, augmentation, training loop, eval, similarity
    index, and serving layer end-to-end
  * give a sanity check that the model can learn *something* (the ulcer
    blobs are visually distinguishable)

These images are NOT clinical data. The README is explicit about that;
nothing here pretends to be a foot photo.

Output layout (matches `data.layout: flat_with_csv` in config.yaml):
  data/sample/
    images/
      img_000.png
      img_001.png
      ...
    labels.csv      # image_id,label,patient_id,split_hint
    reference/      # a small reference bank for the similarity engine
      ref_000.png
      ref_001.png
      ...
    reference_labels.csv
"""
from __future__ import annotations

import argparse
import csv
import random
import sys
from pathlib import Path

# Stdlib-only PIL is part of Pillow; pin loaded via requirements.txt.
from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from src.config import load_config  # noqa: E402


# ----- Synthetic foot drawing ------------------------------------------------

SKIN_TONES = [
    (215, 175, 145),
    (200, 160, 130),
    (170, 130, 105),
    (140, 105, 85),
    (110, 80, 65),
]

BACKGROUNDS = [
    (235, 232, 222),  # warm paper
    (210, 210, 215),  # cool tile
    (240, 240, 240),  # exam-table white
    (180, 175, 165),  # clinic floor
]


def _draw_foot(
    img: Image.Image,
    rng: random.Random,
    skin: tuple[int, int, int],
) -> tuple[int, int, int, int]:
    """Draw a stylized foot silhouette. Returns the foot's bounding box."""
    W, H = img.size
    draw = ImageDraw.Draw(img)

    cx = W // 2 + rng.randint(-10, 10)
    foot_w = int(W * rng.uniform(0.42, 0.55))
    foot_h = int(H * rng.uniform(0.70, 0.85))
    top = int(H * 0.08) + rng.randint(-8, 8)
    left = cx - foot_w // 2

    # Sole (a tall ellipse) with two slightly different lobes for ball + heel.
    draw.ellipse(
        [left, top, left + foot_w, top + int(foot_h * 0.85)],
        fill=skin,
    )
    draw.ellipse(
        [
            cx - int(foot_w * 0.42),
            top + int(foot_h * 0.55),
            cx + int(foot_w * 0.42),
            top + foot_h,
        ],
        fill=skin,
    )

    # Toes — five small circles along the top edge.
    toe_y = top - int(foot_h * 0.02)
    toe_xs = [cx - int(foot_w * 0.30) + i * int(foot_w * 0.15) for i in range(5)]
    toe_r = int(foot_w * 0.07)
    for i, tx in enumerate(toe_xs):
        scale = 1.15 if i == 0 else (0.95 if i == 4 else 1.0)
        r = int(toe_r * scale)
        draw.ellipse([tx - r, toe_y - r, tx + r, toe_y + r], fill=skin)

    # Subtle shadow under the foot
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(
        [
            left + int(foot_w * 0.1),
            top + foot_h - int(foot_h * 0.05),
            left + foot_w - int(foot_w * 0.1),
            top + foot_h + int(foot_h * 0.08),
        ],
        fill=(0, 0, 0, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))
    img.paste(shadow, (0, 0), shadow)

    return left, top, left + foot_w, top + foot_h


def _draw_ulcer(
    img: Image.Image,
    rng: random.Random,
    bbox: tuple[int, int, int, int],
) -> None:
    """Stamp a red/dark lesion somewhere on the foot bounding box."""
    x0, y0, x1, y1 = bbox
    cx = rng.randint(x0 + (x1 - x0) // 5, x1 - (x1 - x0) // 5)
    cy = rng.randint(y0 + (y1 - y0) // 4, y1 - (y1 - y0) // 5)
    r = rng.randint(8, 22)

    # Wound: dark red core, ringed by inflamed pink.
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        [cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6],
        fill=(220, 110, 95, 140),
    )
    od.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=(115, 35, 30, 220),
    )
    if r >= 14:
        od.ellipse(
            [cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2],
            fill=(60, 20, 18, 230),
        )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=1.5))
    img.paste(overlay, (0, 0), overlay)


def synthesize_image(
    rng: random.Random,
    size: int,
    is_ulcer: bool,
) -> Image.Image:
    bg = rng.choice(BACKGROUNDS)
    img = Image.new("RGB", (size, size), bg)
    # Tiny background noise so models can't trivially memorize a flat fill.
    noise = Image.effect_noise((size, size), 8).convert("RGB")
    img = Image.blend(img, noise, alpha=0.04)
    skin = rng.choice(SKIN_TONES)
    bbox = _draw_foot(img, rng, skin)
    if is_ulcer:
        _draw_ulcer(img, rng, bbox)
    return img


# ----- Writer ----------------------------------------------------------------


def write_split(
    out_dir: Path,
    rng: random.Random,
    size: int,
    n_per_class: int,
    classes: list[str],
    prefix: str,
    labels_csv_name: str,
) -> None:
    # Always nest images inside `images/` so the dataset loader's
    # auto-detection (which looks for an images/ subdir + CSV) finds them
    # for both the main set and the reference bank.
    images_dir = out_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    csv_path = out_dir / labels_csv_name
    with csv_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["image_id", "label", "patient_id"])

        idx = 0
        for label in classes:
            is_ulcer = label == "ulcer"
            for _ in range(n_per_class):
                img = synthesize_image(rng, size, is_ulcer=is_ulcer)
                name = f"{prefix}_{idx:04d}.png"
                img.save(images_dir / name, "PNG")
                # Synthetic patient IDs so the patient-disjoint splitter has
                # something to group on; each patient owns ~2 images.
                pid = f"p_{(idx // 2):03d}_synth"
                writer.writerow([name, label, pid])
                idx += 1

    print(f"  wrote {idx} images + {csv_path.name}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--per-class", type=int, default=40,
                    help="images per class in the main sample (default 40)")
    ap.add_argument("--reference", type=int, default=12,
                    help="images per class in the reference bank (default 12)")
    ap.add_argument("--force", action="store_true",
                    help="overwrite existing sample data")
    args = ap.parse_args()

    cfg = load_config(args.config)
    seed = int(cfg.project.random_seed)
    rng = random.Random(seed)
    size = int(cfg.data.image_size)
    classes = list(cfg.data.classes)

    sample_root = REPO_ROOT / cfg.paths.sample
    ref_root = sample_root / "reference"

    if sample_root.exists() and any(sample_root.iterdir()) and not args.force:
        print(f"[sample-data] {sample_root} already populated. "
              "Use --force to overwrite.")
        return

    sample_root.mkdir(parents=True, exist_ok=True)

    print(f"[sample-data] writing main set ({args.per_class}/class) "
          f"to {sample_root}/images")
    write_split(
        out_dir=sample_root,
        rng=rng,
        size=size,
        n_per_class=args.per_class,
        classes=classes,
        prefix="img",
        labels_csv_name="labels.csv",
    )

    print(f"[sample-data] writing reference bank ({args.reference}/class) "
          f"to {ref_root}")
    write_split(
        out_dir=ref_root,
        rng=rng,
        size=size,
        n_per_class=args.reference,
        classes=classes,
        prefix="ref",
        labels_csv_name="reference_labels.csv",
    )

    # Tiny manifest so callers can sanity-check what was generated.
    manifest = sample_root / "MANIFEST.txt"
    manifest.write_text(
        "This directory contains SYNTHETIC images for pipeline testing.\n"
        "They are NOT clinical foot photos. Do not train a deployable model\n"
        "on this data — it's only here so every `make` command runs without\n"
        "real labeled images.\n"
        f"Seed: {seed}\n"
        f"Image size: {size}\n"
        f"Classes: {', '.join(classes)}\n"
        f"Main:      {args.per_class} per class\n"
        f"Reference: {args.reference} per class\n"
    )
    print(f"[sample-data] done. Manifest: {manifest}")


if __name__ == "__main__":
    main()
