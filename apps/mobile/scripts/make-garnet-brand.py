"""Make Garnet's face mark and app icons from the OWNER'S image (P-55, owner direction), and
Ruby's and Sapphire's small faces for chat (P-61).

Agents may crop and compose the owner's character images but never draw them (AGENTS.md §8).
Everything this writes goes to the git-ignored assets/characters/brand/, so no character art
enters the repository; app.config.js falls back to the neutral icons when the files are absent.

Needs Python 3 with Pillow. Run from apps/mobile:  python scripts/make-garnet-brand.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "characters" / "garnet-proud.png"
OUT = ROOT / "assets" / "characters" / "brand"

# Fraction of the figure's height that holds the head (hair, visor, smile, chin).
HEAD = 0.275


def face(src: Image.Image, head_share: float = HEAD) -> Image.Image:
    """The head only, centred on a transparent square."""
    x0, y0, x1, y1 = src.getbbox()
    head = src.crop((x0, y0, x1, y0 + int((y1 - y0) * head_share)))
    head = head.crop(head.getbbox())
    # Fade the cut at the shoulders into transparency, so the mark ends softly.
    alpha = head.getchannel("A")
    fade = int(head.height * 0.09)
    ramp = Image.linear_gradient("L").resize((head.width, fade)).transpose(Image.FLIP_TOP_BOTTOM)
    mask = Image.new("L", head.size, 255)
    mask.paste(ramp, (0, head.height - fade))
    head.putalpha(Image.composite(alpha, Image.new("L", head.size, 0), mask))
    side = int(max(head.size) * 1.08)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(head, ((side - head.width) // 2, (side - head.height) // 2), head)
    return square


def gradient(size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        draw.line(
            [(0, y), (size, y)],
            fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)),
        )
    return img


def glow(size: int, color: tuple[int, int, int], radius: float, alpha: int) -> Image.Image:
    """A soft disc of colour. Only the mask is blurred, so the edge never darkens to grey."""
    mask = Image.new("L", (size, size), 0)
    r = int(size * radius)
    ImageDraw.Draw(mask).ellipse(
        [size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r], fill=alpha
    )
    layer = Image.new("RGBA", (size, size), (*color, 0))
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(size * 0.08)))
    return layer


# Ruby and Sapphire faces for chat's "Seen" marker (P-61), from their calm owner images. Their
# heads take a larger share of their (shorter) figures than Garnet's.
SIDE_FACES = {"ruby": ("ruby-calm.png", 0.36), "sapphire": ("sapphire-calm.png", 0.38)}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (file, share) in SIDE_FACES.items():
        src = OUT.parent / file
        if src.exists():
            face(Image.open(src).convert("RGBA"), share).resize((256, 256), Image.LANCZOS).save(
                OUT.parent / f"{name}-face.png"
            )
    head = face(Image.open(SRC).convert("RGBA"))
    # The in-app mark sits beside the other character images, where the app's loader finds it.
    head.resize((768, 768), Image.LANCZOS).save(OUT.parent / "garnet-face.png")

    # App icon: Garnet's face on the Daylight Glass palette (rose to sky) with a lilac glow.
    size = 1024
    icon = gradient(size, (255, 211, 222), (211, 224, 255)).convert("RGBA")
    icon.alpha_composite(glow(size, (228, 219, 255), 0.42, 255))
    icon.alpha_composite(glow(size, (255, 255, 255), 0.26, 200))
    f = head.resize((int(size * 0.82), int(size * 0.82)), Image.LANCZOS)
    icon.alpha_composite(f, ((size - f.width) // 2, int(size * 0.12)))
    icon.convert("RGB").save(OUT / "icon.png")

    # Android adaptive foreground: content inside the 66 % safe zone, transparent around it.
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    f = head.resize((int(size * 0.62), int(size * 0.62)), Image.LANCZOS)
    fg.alpha_composite(f, ((size - f.width) // 2, (size - f.height) // 2))
    fg.save(OUT / "adaptive-foreground.png")

    # Android adaptive background: the same soft palette, no face.
    back = gradient(size, (255, 211, 222), (211, 224, 255)).convert("RGBA")
    back.alpha_composite(glow(size, (228, 219, 255), 0.42, 255))
    back.convert("RGB").save(OUT / "adaptive-background.png")

    icon.convert("RGB").resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
    print("wrote", ", ".join(p.name for p in sorted(OUT.iterdir())))


if __name__ == "__main__":
    main()
