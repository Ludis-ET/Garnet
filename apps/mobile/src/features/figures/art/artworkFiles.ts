/**
 * Owner-supplied character images and animations (PNG, WebP, JPEG, GIF) from `apps/mobile/assets/characters/` (git-ignored except its
 * README; P-31, P-44). Metro bundles whatever images are in the folder at build time, so the
 * repository never contains them. Keys are lower-case file names without the extension.
 */
import type { ImageSource } from "expo-image";

const files = require.context("../../../../assets/characters", false, /\.(png|webp|jpe?g|gif)$/i);

export const artworkFiles: Readonly<Record<string, ImageSource | number>> = Object.fromEntries(
  files.keys().map((key: string) => [
    key
      .replace(/^\.\//, "")
      .replace(/\.(png|webp|jpe?g|gif)$/i, "")
      .toLowerCase(),
    files<ImageSource | number>(key),
  ]),
);
