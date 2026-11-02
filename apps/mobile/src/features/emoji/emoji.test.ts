import {
  EMOJI_CATEGORIES,
  emojiInfo,
  recentEmoji,
  recordEmoji,
  removeLastGrapheme,
  resetEmojiPreferences,
  searchEmoji,
  withTone,
} from "./emoji";

describe("emoji set (P-63)", () => {
  it("has every iPhone keyboard category, in its order, and the whole set", () => {
    expect(EMOJI_CATEGORIES.map((c) => c.title)).toEqual([
      "Smileys & People",
      "Animals & Nature",
      "Food & Drink",
      "Activity",
      "Travel & Places",
      "Objects",
      "Symbols",
      "Flags",
    ]);
    const total = EMOJI_CATEGORIES.reduce((n, c) => n + c.emoji.length, 0);
    expect(total).toBeGreaterThan(1800);
    for (const c of EMOJI_CATEGORIES) expect(c.emoji.length).toBeGreaterThan(30);
  });

  it("lists skin-tone variants only through the tone picker", () => {
    const chars = EMOJI_CATEGORIES.flatMap((c) => c.emoji.map((e) => e.char));
    expect(chars).not.toContain("👋🏽");
    expect(emojiInfo("👋").tones).toBe(true);
    expect(emojiInfo("😀").tones).toBe(false);
  });

  it("puts the tone after the first code point, dropping its variation selector", () => {
    expect(withTone("👋", 0)).toBe("👋🏻");
    expect(withTone("👋", 4)).toBe("👋🏿");
    expect(withTone("☝️", 2)).toBe("☝🏽");
    expect(withTone("🧑‍💻", 1)).toBe("🧑🏼‍💻");
    expect(withTone("👋", null)).toBe("👋");
  });

  it("finds emoji by the start of words in their names", () => {
    expect(searchEmoji("red heart").map((e) => e.char)).toContain("❤️");
    expect(searchEmoji("coff").map((e) => e.char)).toContain("☕");
    expect(searchEmoji("hug").map((e) => e.char)).toContain("🫂");
    expect(searchEmoji("   ")).toEqual([]);
  });
});

describe("removeLastGrapheme", () => {
  it.each([
    ["hi", "h"],
    ["hi 👋", "hi "],
    ["hi 👋🏽", "hi "],
    ["a👨‍👩‍👧", "a"],
    ["a🧑🏼‍💻", "a"],
    ["go 🇪🇹", "go "],
    ["🇪🇹🇬🇧", "🇪🇹"],
    ["1️⃣", ""],
    ["❤️", ""],
    ["", ""],
  ])("%s → %s", (input, out) => {
    expect(removeLastGrapheme(input)).toBe(out);
  });
});

describe("Frequently Used", () => {
  afterEach(resetEmojiPreferences);
  it("puts the latest first without duplicates", () => {
    recordEmoji("🐱");
    recordEmoji("❤️");
    recordEmoji("🐱");
    const list = recentEmoji();
    expect(list.slice(0, 2)).toEqual(["🐱", "❤️"]);
    expect(list.filter((c) => c === "🐱")).toHaveLength(1);
    expect(list.filter((c) => c === "❤️")).toHaveLength(1);
  });

  it("keeps at most 30", () => {
    for (const c of searchEmoji("face", 40)) recordEmoji(c.char);
    expect(recentEmoji()).toHaveLength(30);
  });
});
