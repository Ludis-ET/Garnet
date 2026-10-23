import { composite, contrastRatio } from "./contrast";
import { colorsFor, type ColorScheme, type Side } from "./tokens";

const schemes: ColorScheme[] = ["dark", "light"];
const sides: Side[] = ["ruby", "sapphire", "garnet"];

describe("design tokens meet WCAG 2.2 AA contrast", () => {
  it.each(schemes)("%s: body text on background and surface ≥ 4.5:1", (scheme) => {
    const c = colorsFor(scheme, "garnet");
    for (const bg of [c.background, c.surface, c.surfaceRaised]) {
      expect(contrastRatio(c.textPrimary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textTertiary, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(schemes.flatMap((s) => sides.map((side) => [s, side] as const)))(
    "%s/%s: accent is usable as text or an icon on the background (≥ 3:1) and carries white text (≥ 4.5:1 in light)",
    (scheme, side) => {
      const c = colorsFor(scheme, side);
      expect(contrastRatio(c.accent, c.background)).toBeGreaterThanOrEqual(3);
      if (scheme === "light")
        expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(schemes)(
    "%s: feedback colours are distinguishable from the background (≥ 3:1)",
    (scheme) => {
      const c = colorsFor(scheme, "garnet");
      for (const fg of [c.success, c.warning, c.danger]) {
        expect(contrastRatio(fg, c.background)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(schemes.flatMap((s) => sides.map((side) => [s, side] as const)))(
    "%s/%s: filled controls carry white text at ≥ 4.5:1 (accentStrong)",
    (scheme, side) => {
      const c = colorsFor(scheme, side);
      expect(contrastRatio(c.onAccent, c.accentStrong)).toBeGreaterThanOrEqual(4.5);
    },
  );

  // P-48: text may sit straight on an aurora orb or on a glass veil over one. Test the worst
  // case, the orb's centre colour, for every text colour a screen uses.
  it.each(schemes.flatMap((s) => sides.map((side) => [s, side] as const)))(
    "%s/%s: text stays ≥ 4.5:1 on the aurora and on glass over it",
    (scheme, side) => {
      const c = colorsFor(scheme, side);
      const grounds = [c.auroraRose, c.auroraSky, c.auroraLilac].flatMap((orb) => {
        const onCanvas = composite(orb, c.background);
        return [onCanvas, composite(c.glassVeil, onCanvas)];
      });
      for (const bg of [c.background, ...grounds]) {
        for (const fg of [c.textPrimary, c.textSecondary, c.textTertiary, c.accent, c.danger]) {
          expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
        }
        // Status icons and check marks (non-text): ≥ 3:1.
        expect(contrastRatio(c.success, bg)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(schemes.flatMap((s) => sides.map((side) => [s, side] as const)))(
    "%s/%s: the primary button gradient carries white text at ≥ 4.5:1",
    (scheme, side) => {
      const c = colorsFor(scheme, side);
      for (const fill of [c.accentStrong, c.accentStrongEnd]) {
        expect(contrastRatio(c.onAccent, fill)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each(schemes.flatMap((s) => sides.map((side) => [s, side] as const)))(
    "%s/%s: side accents stay ≥ 4.5:1 as text on the aurora (setup pages use them)",
    (scheme, side) => {
      const c = colorsFor(scheme, side);
      for (const orb of [c.auroraRose, c.auroraSky, c.auroraLilac]) {
        expect(contrastRatio(c.accent, composite(orb, c.background))).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("composites rgba over a background", () => {
    expect(composite("rgba(255, 255, 255, 0.5)", "#000000")).toBe("#808080");
    expect(composite("#123456", "#FFFFFF")).toBe("#123456");
    expect(() => composite("red", "#FFFFFF")).toThrow(RangeError);
  });

  it("uses the side's own accent", () => {
    expect(colorsFor("dark", "ruby").accent).toBe(colorsFor("dark", "ruby").ruby);
    expect(colorsFor("dark", "sapphire").accent).toBe(colorsFor("dark", "sapphire").sapphire);
  });
});
