/**
 * The full emoji set for the emoji board (P-63): every fully-qualified Unicode emoji in the
 * iPhone keyboard's categories, with names for search, skin tones on long-press, and the
 * "Frequently Used" row kept on this device only (never synced or shared). Emoji are drawn by the
 * phone's own font, so on an iPhone they are the iPhone's emoji.
 */
import { useSyncExternalStore } from "react";
import { EMOJI_SOURCE } from "./emojiData";

export interface Emoji {
  char: string;
  name: string;
  /** Takes a skin tone (long-press offers the five tones). */
  tones: boolean;
}

export interface EmojiCategory {
  id: string;
  title: string;
  emoji: readonly Emoji[];
}

function parse(line: string): Emoji {
  const [char = "", name = "", flag] = line.split("|");
  return { char, name, tones: flag === "t" };
}

export const EMOJI_CATEGORIES: readonly EmojiCategory[] = EMOJI_SOURCE.map((c) => ({
  id: c.id,
  title: c.title,
  emoji: c.data.trim().split("\n").map(parse),
}));

const BY_CHAR = new Map(EMOJI_CATEGORIES.flatMap((c) => c.emoji.map((e) => [e.char, e])));

export function emojiInfo(char: string): Emoji {
  return BY_CHAR.get(char) ?? { char, name: char, tones: false };
}

/** Light to dark (Fitzpatrick 1–2 to 6). */
export const SKIN_TONES = [
  "\u{1F3FB}",
  "\u{1F3FC}",
  "\u{1F3FD}",
  "\u{1F3FE}",
  "\u{1F3FF}",
] as const;

/** The emoji in a skin tone: the tone goes after the first code point (dropping its FE0F). */
export function withTone(char: string, tone: number | null): string {
  if (tone === null) return char;
  const cps = Array.from(char);
  const mod = SKIN_TONES[tone];
  if (mod === undefined || cps.length === 0) return char;
  const rest = cps[1] === "️" ? cps.slice(2) : cps.slice(1);
  return [cps[0], mod, ...rest].join("");
}

/** Everyday words people search with that the Unicode names don't contain. */
const KEYWORDS: Readonly<Record<string, string>> = {
  "☕": "coffee tea",
  "❤️": "love",
  "😍": "love",
  "🥰": "love",
  "💜": "love",
  "💙": "love",
  "🤍": "love",
  "😂": "lol laugh",
  "🤣": "lol laugh",
  "😭": "cry sad",
  "😢": "cry sad",
  "🫂": "hug",
  "🤗": "hug",
  "🙏": "thanks please pray",
  "👍": "like yes ok",
  "🔥": "lit hot",
  "✨": "magic sparkle",
  "🎉": "party celebrate",
  "🥳": "party birthday celebrate",
  "😴": "sleep tired",
  "💤": "sleep tired",
  "🌙": "night",
  "✈️": "travel flight plane",
  "🏡": "home",
  "💍": "ring marry engaged",
  "😘": "kiss",
  "💋": "kiss",
  "🎂": "birthday cake",
  "🎁": "gift present",
  "🌹": "flower love",
  "😡": "angry mad",
  "📞": "call phone",
};

/** Emoji whose name has every word of the query (by word start), best matches first. */
export function searchEmoji(query: string, limit = 80): Emoji[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits: { e: Emoji; score: number }[] = [];
  for (const c of EMOJI_CATEGORIES) {
    for (const e of c.emoji) {
      const parts = `${e.name} ${KEYWORDS[e.char] ?? ""}`.trim().split(/[\s:,-]+/);
      if (!words.every((w) => parts.some((p) => p.startsWith(w)))) continue;
      hits.push({ e, score: (e.name === words.join(" ") ? 0 : 1) + parts.length / 10 });
    }
  }
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((h) => h.e);
}

const ZWJ = "‍";
function isModifier(c: string): boolean {
  const cp = c.codePointAt(0) ?? 0;
  return (
    cp === 0xfe0f ||
    cp === 0x20e3 ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
    (cp >= 0xe0020 && cp <= 0xe007f)
  );
}
function isRegional(c: string | undefined): boolean {
  const cp = c?.codePointAt(0) ?? 0;
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

/**
 * The text without its last character as a person sees it: a whole emoji (with its tone, ZWJ
 * family, keycap or flag), never half of one. Used by the board's delete key.
 */
export function removeLastGrapheme(text: string): string {
  const cps = Array.from(text);
  let i = cps.length - 1;
  if (i < 0) return text;
  const skipModifiers = () => {
    while (i > 0 && isModifier(cps[i] ?? "")) i--;
  };
  skipModifiers();
  while (i >= 2 && cps[i - 1] === ZWJ) {
    i -= 2;
    skipModifiers();
  }
  if (isRegional(cps[i])) {
    // Flags are pairs: count the run of regional indicators ending here.
    let run = 0;
    while (isRegional(cps[i - run])) run++;
    if (run % 2 === 0) i -= 1;
  }
  return cps.slice(0, i).join("");
}

// Frequently Used and chosen skin tones: kept on this device only, in memory (prototype).
const DEFAULT_RECENT = ["❤️", "😂", "🥰", "😘", "🥺", "😍", "😊", "🫶", "🙏", "✨", "😭", "🫂"];
const RECENT_MAX = 30;
let recent: readonly string[] = DEFAULT_RECENT;
let tones: Readonly<Record<string, number | null>> = {};
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Puts an emoji at the front of Frequently Used. */
export function recordEmoji(char: string): void {
  recent = [char, ...recent.filter((c) => c !== char)].slice(0, RECENT_MAX);
  emit();
}
export function recentEmoji(): readonly string[] {
  return recent;
}
export function useRecentEmoji(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => recent,
    () => recent,
  );
}

/** Remembers the tone picked for an emoji (null: the default yellow). */
export function setPreferredTone(char: string, tone: number | null): void {
  tones = { ...tones, [char]: tone };
  emit();
}
export function usePreferredTones(): Readonly<Record<string, number | null>> {
  return useSyncExternalStore(
    subscribe,
    () => tones,
    () => tones,
  );
}

/** Test helper: back to the defaults. */
export function resetEmojiPreferences(): void {
  recent = DEFAULT_RECENT;
  tones = {};
  emit();
}
