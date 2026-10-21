#!/usr/bin/env python3
"""
Process character images from `apps/mobile/assets/characters/incoming/`
1. Chroma-key cutout: remove solid green (#00FF00) background with smooth alpha anti-aliasing and green despill.
2. Frame alignment: ensure aspect ratio is exactly 2:3, character centered horizontally, feet resting on the bottom edge.
3. Save to `apps/mobile/assets/characters/<name>.png` (RGBA).
"""

import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
INCOMING_DIR = REPO_ROOT / "apps" / "mobile" / "assets" / "characters" / "incoming"
DEST_DIR = REPO_ROOT / "apps" / "mobile" / "assets" / "characters"

def remove_green_screen(img: Image.Image) -> Image.Image:
    """Removes green background with smooth alpha blending and despill."""
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.float32)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # Difference of Green over max(Red, Blue)
    max_rb = np.maximum(r, b)
    green_diff = g - max_rb

    # Chroma key threshold
    # Clean pure green #00FF00 has high green_diff (~255)
    # Thresholding with soft feathering
    low_thresh = 15.0
    high_thresh = 50.0

    # Calculate alpha based on green dominance
    # 0 where green is dominant (background), 1 where foreground
    alpha_mask = 1.0 - np.clip((green_diff - low_thresh) / (high_thresh - low_thresh), 0.0, 1.0)

    # For edges and semi-transparent areas, despill the green reflection
    # If G > max(R, B), clamp G to max(R, B)
    despill_mask = green_diff > 0
    arr[:, :, 1] = np.where(despill_mask, max_rb, g)

    # Apply alpha
    arr[:, :, 3] = alpha_mask * 255.0

    return Image.fromarray(np.uint8(np.clip(arr, 0, 255)), mode="RGBA")

def frame_character(img: Image.Image, target_width: int = 1024, target_height: int = 1536) -> Image.Image:
    """
    Ensures character is framed at 2:3 aspect ratio:
    - Feet rest right on the bottom edge (or small margin if specified)
    - Centered horizontally
    """
    alpha = np.array(img.split()[-1])
    # Find bounding box of non-transparent pixels (alpha > 30)
    non_empty = np.argwhere(alpha > 30)
    if non_empty.size == 0:
        return img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    top, left = non_empty.min(axis=0)
    bottom, right = non_empty.max(axis=0) + 1

    # Crop to subject bounding box
    bbox = (int(left), int(top), int(right), int(bottom))
    subject = img.crop(bbox)
    sub_w, sub_h = subject.size

    # Target canvas
    canvas = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))

    # Scale subject to fit nicely in 2:3 canvas:
    # Character should leave breathing room at top (e.g. 5-10% padding at top)
    # and bottom edge aligned with feet
    max_height = int(target_height * 0.94)  # 6% headroom
    max_width = int(target_width * 0.90)   # 5% side padding minimum

    scale = min(max_height / sub_h, max_width / sub_w)
    new_w = int(sub_w * scale)
    new_h = int(sub_h * scale)

    resized_sub = subject.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Position: horizontally centered, feet at the bottom edge
    paste_x = (target_width - new_w) // 2
    paste_y = target_height - new_h

    canvas.paste(resized_sub, (paste_x, paste_y), resized_sub)
    return canvas

def process_file(file_path: Path):
    print(f"Processing: {file_path.name}")
    raw_img = Image.open(file_path)
    cutout = remove_green_screen(raw_img)
    framed = frame_character(cutout)

    dest_name = file_path.stem.lower() + ".png"
    dest_path = DEST_DIR / dest_name
    framed.save(dest_path, "PNG")
    print(f"Saved: {dest_path}")

def main():
    if not INCOMING_DIR.exists():
        print(f"Incoming directory does not exist: {INCOMING_DIR}")
        return

    incoming_files = [f for f in INCOMING_DIR.iterdir() if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp"]]
    if not incoming_files:
        print("No files found in incoming directory.")
        return

    for f in incoming_files:
        process_file(f)

if __name__ == "__main__":
    main()
