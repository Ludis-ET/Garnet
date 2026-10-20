import { moods } from "../moods";
import { sceneById } from "../scenes";
import { FUSE_LINE, initialStudioState, studioReducer } from "../studioState";

describe("studio state", () => {
  it("starts on the Home scene by default", () => {
    const s = initialStudioState();
    expect(s.sceneId).toBe("home");
    expect(s.cast).toBe("trio");
    expect(s.bubble).toBe(true);
  });

  it("applies deep-link params and ignores invalid ones", () => {
    const s = initialStudioState({
      scene: "birthday",
      mood: "sleepy",
      occasion: "nope",
      cast: "everyone",
    });
    expect(s.occasion).toBe("birthday");
    expect(s.cast).toBe("trio");
    expect(s.moods).toEqual({ ruby: "sleepy", sapphire: "sleepy", garnet: "sleepy" });
    expect(initialStudioState({ scene: ["openWhen"], bubble: "off" })).toMatchObject({
      sceneId: "openWhen",
      bubble: false,
    });
  });

  it("applies a scene's cast, moods, occasion and line", () => {
    const s = studioReducer(initialStudioState(), { type: "scene", id: "openWhen" });
    const scene = sceneById("openWhen");
    expect(s).toMatchObject({
      cast: "sapphire",
      occasion: "openWhen",
      speaker: "sapphire",
      line: scene?.line,
    });
  });

  it("sets the mood only for figures on stage", () => {
    let s = studioReducer(initialStudioState(), { type: "cast", cast: "ruby" });
    const before = s.moods.garnet;
    s = studioReducer(s, { type: "mood", mood: "loving" });
    expect(s.moods.ruby).toBe("loving");
    expect(s.moods.garnet).toBe(before);
    expect(s.line).toBe(moods.loving.line);
    expect(s.sceneId).toBeNull();
  });

  it("moves the speaker onto the stage when the cast changes", () => {
    const s = studioReducer(initialStudioState(), { type: "cast", cast: "duo" });
    expect(["ruby", "sapphire"]).toContain(s.speaker);
  });

  it("fuses only from the duo, and unfuses only from Garnet", () => {
    const start = initialStudioState();
    expect(studioReducer(start, { type: "fuse" })).toBe(start);
    const duo = studioReducer(start, { type: "cast", cast: "duo" });
    const fused = studioReducer(duo, { type: "fuse" });
    expect(fused).toMatchObject({
      cast: "garnet",
      speaker: "garnet",
      line: FUSE_LINE,
      fusion: { kind: "fuse", key: 1 },
    });
    const apart = studioReducer(fused, { type: "unfuse" });
    expect(apart).toMatchObject({ cast: "duo", fusion: { kind: "unfuse", key: 2 } });
    expect(studioReducer(apart, { type: "unfuse" })).toBe(apart);
  });

  it("re-speaks on replay and when the bubble is switched back on", () => {
    const s = initialStudioState();
    expect(studioReducer(s, { type: "replay" }).lineKey).toBe(s.lineKey + 1);
    const off = studioReducer(s, { type: "bubble", on: false });
    expect(off.lineKey).toBe(s.lineKey);
    expect(studioReducer(off, { type: "bubble", on: true }).lineKey).toBe(s.lineKey + 1);
  });
});
