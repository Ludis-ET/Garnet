import type { ImageSource } from "expo-image";

/**
 * Character art registry (P-30: the intended experience uses the actual Ruby, Sapphire and
 * Garnet; P-31 safeguards apply; sourcing is U-26; rights/distribution are U-10, unresolved).
 *
 * The repository NEVER contains character art: `assets/characters/` is git-ignored, and agents
 * must not generate, download or trace it. The owner drops rights-cleared renders into
 * `apps/mobile/assets/characters/` locally and registers them here, e.g.
 *
 *   ruby: { idle: require("../../../assets/characters/ruby-idle.png") },
 *
 * Until then every slot renders a neutral crystal placeholder, so screens work without art.
 * The illustrated 2D figures (owner direction P-43) live in features/figures, drawn in code.
 */
export type CharacterId = "ruby" | "sapphire" | "garnet";

/** Pose inventory from docs/characters/art-brief.md (C-01 … C-12). */
export type Pose =
  | "idle"
  | "wave"
  | "happy"
  | "listening"
  | "hug"
  | "holdingCrystal"
  | "nap"
  | "thinking"
  | "writingLetter"
  | "celebrating"
  | "together"
  | "goodnight";

export const characterAssets: Partial<Record<CharacterId, Partial<Record<Pose, ImageSource>>>> = {};

export const characterNames: Record<CharacterId, string> = {
  ruby: "Ruby",
  sapphire: "Sapphire",
  garnet: "Garnet",
};
