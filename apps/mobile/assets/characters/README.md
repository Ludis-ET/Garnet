# Character images (local only)

The app's Ruby, Sapphire and Garnet come **only** from images in this folder (P-44, P-45). **Everything here except this README is git-ignored**, so images never enter the repository (P-31). Rights are the owner's responsibility and remain unresolved (U-10); keep public distribution blocked.

## Workflow

1. Generate images with the prompt in [docs/design/gemini-character-prompt.md](../../../../docs/design/gemini-character-prompt.md).
2. Save them, named as the prompt says, into `incoming/` in this folder.
3. Ask Claude to process them: it removes the green background, crops to the shared frame, checks names and moves them here.
4. Restart the dev server (`apps/run-mobile.bat`) so new files are picked up.

The app reads only this folder's top level (`incoming/` is ignored by the app). Anything missing shows a placeholder gem with the character's name.

## File names (case doesn't matter)

The most specific match wins:

1. `<character>-<mood>-<occasion>-talk` and `<character>-<mood>-talk` (while that character speaks)
2. `<character>-<mood>-<occasion>`
3. `<character>-<occasion>`
4. `<character>-<mood>`
5. `<character>` (default)

Plus `fusion` and `unfusion` animations, played over the stage when Ruby and Sapphire fuse or unfuse.

- character: `ruby`, `sapphire`, `garnet`
- mood: `calm`, `happy`, `joyful`, `loving`, `hello`, `hug`, `thinking`, `listening`, `sleepy`, `proud`, `celebrating`, `shy`, `surprised`, `dreamy`, `laughing`, `silly`, `dancing`, `sneaky`
- occasion: `everyday`, `together`, `morning`, `goodnight`, `cozy`, `birthday`, `anniversary`, `openWhen`, `memory`, `surprise`, `reunion`, `celebration`, `spark`, `music`, `winter`

Formats: `.png`, `.webp`, `.jpg`, `.gif` (animated GIF and animated WebP play automatically).

## Frame

Full body, front-facing, transparent background (after processing), feet on the bottom edge, centred, portrait 2:3 (for example 1024 × 1536). One character per file.

## Brand mark and app icons (P-55)

Run `python scripts/make-garnet-brand.py` (from `apps/mobile`, needs Pillow) after adding or replacing `garnet-proud.png`. It writes `garnet-face.png` (the in-app Garnet mark) here and the app icon, Android adaptive icon layers and favicon into `brand/`. Everything stays git-ignored; `app.config.js` uses the icons only when they exist.
