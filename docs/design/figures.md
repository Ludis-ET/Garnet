# Figures: Ruby, Sapphire and Garnet

Owner direction **P-45** (2026-10-21). The app shows Ruby, Sapphire and Garnet **only from images the owner generates** with Gemini, using [gemini-character-prompt.md](./gemini-character-prompt.md), and keeps in the git-ignored `apps/mobile/assets/characters/`. The earlier 3D figures (P-41) and code-drawn 2D figures (P-43) were removed. The owner intends to license the characters for production. **No licence exists yet: rights and distribution stay unresolved (U-10), and public distribution stays blocked.**

## What the app does with the images

- **Stage** (`FigureStage.tsx`): places the figures by cast (all three, Ruby & Sapphire, or one), keeps their true relative heights (Garnet is much taller), and adds a soft aura in the occasion's colour, a contact shadow, gentle per-mood motion, occasion and mood particles, tap-to-hop, and the fusion choreography with a flash.
- **Image choice** (`art/artwork.ts`): the most specific file wins (see the naming reference in the prompt). Talking frames alternate with the normal image while a character speaks. `fusion` / `unfusion` animations play over the stage when supplied.
- **Placeholder**: a faceted gem in the character's colour with the name, until that character's image exists. Every screen must look complete with it.
- **`CharacterSlot`** (static, for page designs) uses the same images, mapping its poses to moods.

## Moods, occasions and scenes

**18 moods:** calm, happy, joyful, loving, hello, hug, thinking, listening, sleepy, proud, celebrating, shy, surprised, dreamy, laughing, silly, dancing, sneaky. No sad, angry or abandoned moods (AGENTS.md §5).

**15 occasions:** everyday, together, morning, goodnight, cozy, birthday, anniversary, Open When, memory, surprise, reunion, celebration, spark, music, winter.

**21 page scenes** (`scenes.ts`) map app areas to a cast, moods, occasion and line, keyed to page IDs.

## Where figures appear

- The Figure Studio home page was removed (owner direction P-49). Figures now appear only in designed pages, through `CharacterSlot` (Welcome windows AUTH-01, the connected moment PAIR-05) or `FigureStage`.
- The "fusion only from Ruby and Sapphire" rule and the fusion lines left with the studio; they return with the first designed fusion moment.
- Windows: double-click `apps/run-mobile.bat` and pick the browser preview.

## Adding images

Generate with the prompt, save into `assets/characters/incoming/`, and ask Claude to process them (cut out the green background, crop to the 2:3 frame with feet on the bottom edge, check names, move them up a level). Restart the dev server to pick them up. Agents process the owner's files but never draw, generate, download or trace character art themselves (P-31).

## Verified, and not yet verified

- **Verified:** unit and property tests (image lookup and naming, case-insensitive matching, fusion files, stage layout and relative heights, motion and reduced motion, particles, copy rules, reducer, studio accessibility) and mutation checks.
- **Not yet verified:** how the owner's images look in the app (none supplied yet), running on a phone (U-01), and the iOS build.
