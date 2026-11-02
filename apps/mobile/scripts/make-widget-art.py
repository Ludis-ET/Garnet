"""Make small copies of the OWNER'S character images for the Android home-screen widgets (P-73).

Widgets draw through RemoteViews, which has a tight bitmap budget, so each look the widgets use
(widgets plan §3) is trimmed to the figure and scaled down. Agents may crop and resize the
owner's images but never draw them (AGENTS.md §8). Everything goes to the git-ignored
assets/characters/widget/, so no character art enters the repository; without it the widgets
show the gem colours and words only.

Needs Python 3 with Pillow. Run from apps/mobile:  python scripts/make-widget-art.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "characters"
OUT = SRC / "widget"

# File names src/widgets/art.ts may ask for (findArtwork's order for each widgetLook).
LOOKS = [
    "birthday", "celebrating", "surprised", "loving", "morning", "hello",
    "happy", "cozy", "calm", "goodnight", "sleepy",
]
# Tall enough for a 4x2 widget on a dense screen, small enough for RemoteViews.
HEIGHT = 420


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    written = []
    for who in ("garnet", "ruby", "sapphire"):
        for name in [f"{who}-{look}" for look in LOOKS] + [who]:
            src = SRC / f"{name}.png"
            if not src.exists():
                continue
            im = Image.open(src).convert("RGBA")
            box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
            if box is not None:
                im = im.crop(box)
            scale = HEIGHT / im.height
            im = im.resize((max(1, round(im.width * scale)), HEIGHT), Image.LANCZOS)
            im.save(OUT / f"{name}.png", optimize=True)
            written.append(name)
    print(f"wrote {len(written)} widget images to {OUT}")


if __name__ == "__main__":
    main()
