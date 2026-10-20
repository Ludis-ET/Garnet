import { moods } from "../moods";
import { occasions } from "../occasions";
import { moodMotion } from "../poses";
import { scenes } from "../scenes";
import { FUSE_LINE, UNFUSE_LINE } from "../studioState";
import { CASTS, castMembers, MOODS, OCCASIONS, isOneOf } from "../types";

/** voice-and-copy.md banned words, plus day-apart counters (spec A4/A5). */
const BANNED = [
  "broken",
  "lost",
  "failed",
  "missed",
  "ignored",
  "seen",
  "read",
  "lazy",
  "streak",
  "last chance",
  "don't let",
  "apart",
];

function bannedIn(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED.filter((w) => new RegExp(`\\b${w}\\b`).test(lower));
}

describe("figure data", () => {
  it("defines a label, copy and motion for every mood", () => {
    for (const m of MOODS) {
      expect(moods[m].label.length).toBeGreaterThan(0);
      expect(moods[m].line.length).toBeGreaterThan(0);
      expect(moodMotion[m]).toBeDefined();
    }
  });

  it("never offers a sad, angry or abandoned mood (AGENTS.md §5)", () => {
    const negative = ["sad", "angry", "lonely", "abandoned", "upset", "crying", "hurt", "jealous"];
    for (const m of MOODS) expect(negative).not.toContain(m.toLowerCase());
  });

  it("gives every occasion a three-stop sky and valid particles", () => {
    for (const o of OCCASIONS) {
      const def = occasions[o];
      expect(def.sky).toHaveLength(3);
      for (const c of def.sky) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
      for (const p of def.particles) expect(p.count).toBeGreaterThan(0);
    }
  });

  it("keeps scene ids unique and every reference valid", () => {
    const ids = scenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of scenes) {
      expect(isOneOf(CASTS, s.cast)).toBe(true);
      expect(isOneOf(OCCASIONS, s.occasion)).toBe(true);
      for (const page of s.pages) expect(page).toMatch(/^[A-Z]+-\d{2}$/);
      // Every figure on stage has a mood, and the speaker is on stage.
      for (const id of castMembers(s.cast)) expect(s.moods[id]).toBeDefined();
      expect(castMembers(s.cast)).toContain(s.speaker);
    }
  });

  it("keeps every line free of banned and guilt words (voice-and-copy.md)", () => {
    const lines = [
      ...MOODS.map((m) => moods[m].line),
      ...scenes.map((s) => s.line),
      FUSE_LINE,
      UNFUSE_LINE,
    ];
    for (const line of lines)
      expect({ line, banned: bannedIn(line) }).toEqual({ line, banned: [] });
  });

  it("detects banned words as whole words only", () => {
    expect(bannedIn("Your streak is broken")).toEqual(["broken", "streak"]);
    expect(bannedIn("Ready? Already!")).toEqual([]);
  });
});
