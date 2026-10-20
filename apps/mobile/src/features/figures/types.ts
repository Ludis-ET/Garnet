/**
 * Shared vocabulary of the figure system. Character images are owner-supplied (P-45); rights
 * and distribution stay unresolved (U-10).
 */
export type FigureId = "ruby" | "sapphire" | "garnet";

/** Left-to-right stage order as the viewer sees it (Garnet's left hand carries Ruby's gem). */
export const FIGURES: readonly FigureId[] = ["sapphire", "garnet", "ruby"];

export const figureNames: Record<FigureId, string> = {
  ruby: "Ruby",
  sapphire: "Sapphire",
  garnet: "Garnet",
};

/**
 * Moods are warm or neutral only. Characters are never sad, angry or abandoned (AGENTS.md §5,
 * voice-and-copy: "the worst a character does is nap").
 */
export const MOODS = [
  "calm",
  "happy",
  "joyful",
  "loving",
  "hello",
  "hug",
  "thinking",
  "listening",
  "sleepy",
  "proud",
  "celebrating",
  "shy",
  "surprised",
  "dreamy",
  "laughing",
  "silly",
  "dancing",
  "sneaky",
] as const;
export type Mood = (typeof MOODS)[number];

export const OCCASIONS = [
  "everyday",
  "together",
  "morning",
  "goodnight",
  "cozy",
  "birthday",
  "anniversary",
  "openWhen",
  "memory",
  "surprise",
  "reunion",
  "celebration",
  "spark",
  "music",
  "winter",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const CASTS = ["trio", "duo", "ruby", "sapphire", "garnet"] as const;
export type Cast = (typeof CASTS)[number];

export type ParticleKind =
  "hearts" | "sparkles" | "stars" | "confetti" | "snow" | "zzz" | "notes" | "orbs" | "petals";

export interface ParticleSpec {
  kind: ParticleKind;
  count: number;
}

export function castMembers(cast: Cast): FigureId[] {
  switch (cast) {
    case "trio":
      return ["sapphire", "garnet", "ruby"];
    case "duo":
      return ["sapphire", "ruby"];
    case "ruby":
    case "sapphire":
    case "garnet":
      return [cast];
  }
}

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
