import { seedParticles } from "../art/Particles";
import { artworkCandidates, findArtwork, fusionArtwork } from "../art/artwork";
import { heartPath, notePath, starPath, zPath } from "../art/shapes";
import { figureHeight, layoutFor } from "../stageLayout";

describe("owner-supplied artwork lookup (P-44, P-45)", () => {
  const files = {
    "ruby-happy-birthday": 1,
    "ruby-happy-talk": 2,
    "ruby-happy": 3,
    "ruby-winter": 4,
    ruby: 5,
    "garnet-hello": 6,
    fusion: 7,
  };

  it("prefers the most specific image", () => {
    expect(findArtwork(files, "ruby", "happy", "birthday", false)).toBe(1);
    expect(findArtwork(files, "ruby", "happy", "everyday", true)).toBe(2);
    expect(findArtwork(files, "ruby", "happy", "everyday", false)).toBe(3);
    expect(findArtwork(files, "ruby", "sleepy", "winter", false)).toBe(4);
    expect(findArtwork(files, "ruby", "sleepy", "everyday", false)).toBe(5);
    expect(findArtwork(files, "garnet", "hello", "music", true)).toBe(6);
  });

  it("returns nothing when no image exists (the app shows a placeholder)", () => {
    expect(findArtwork(files, "sapphire", "happy", "everyday", false)).toBeUndefined();
    expect(findArtwork({}, "garnet", "calm", "everyday", true)).toBeUndefined();
  });

  it("documents the naming scheme in lookup order", () => {
    expect(artworkCandidates("garnet", "loving", "anniversary", true)).toEqual([
      "garnet-loving-anniversary-talk",
      "garnet-loving-talk",
      "garnet-loving-anniversary",
      "garnet-anniversary",
      "garnet-loving",
      "garnet",
    ]);
  });

  it("matches file names case-insensitively (openWhen is saved as openwhen)", () => {
    expect(findArtwork({ "sapphire-openwhen": 9 }, "sapphire", "dreamy", "openWhen", false)).toBe(
      9,
    );
  });

  it("finds the fusion animations by name", () => {
    expect(fusionArtwork(files, "fuse")).toBe(7);
    expect(fusionArtwork(files, "unfuse")).toBeUndefined();
  });
});

describe("stage layout", () => {
  it("keeps Garnet much taller than Ruby and Sapphire in a group", () => {
    const h = 500;
    expect(figureHeight("trio", "garnet", h)).toBeGreaterThan(
      figureHeight("trio", "ruby", h) * 1.4,
    );
    expect(figureHeight("trio", "garnet", h)).toBeCloseTo(h * layoutFor("trio").fill, 6);
  });

  it("lets the tallest figure on stage fill the stage", () => {
    expect(figureHeight("ruby", "ruby", 400)).toBeCloseTo(400 * layoutFor("ruby").fill, 6);
  });
});

describe("particles", () => {
  it("seeds the requested counts within the stage, deterministically", () => {
    const specs = [
      { kind: "snow", count: 12 },
      { kind: "hearts", count: 4 },
    ] as const;
    const seeds = seedParticles(specs);
    expect(seeds).toHaveLength(16);
    expect(seedParticles(specs)).toEqual(seeds);
    for (const s of seeds) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
    }
  });

  it("draws valid particle shapes", () => {
    for (const d of [heartPath(5, 5, 4), starPath(5, 5, 4), zPath(5, 5, 3), notePath(5, 5, 3)]) {
      expect(d.startsWith("M")).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
