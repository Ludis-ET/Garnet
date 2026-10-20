import { contrastRatio } from "./contrast";
import { colorsFor, type ColorScheme, type Side } from "./tokens";

const schemes: ColorScheme[] = ["dark", "light"];
const sides: Side[] = ["ruby", "sapphire", "garnet"];

describe("design tokens meet WCAG 2.2 AA contrast", () => {
  it.each(schemes)("%s: body text on background and surface ≥ 4.5:1", (scheme) => {
    const c = colorsFor(scheme, "garnet");
    for (const bg of [c.background, c.surface, c.surfaceRaised]) {
      expect(contrastRatio(c.textPrimary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
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

  it("uses the side's own accent", () => {
    expect(colorsFor("dark", "ruby").accent).toBe(colorsFor("dark", "ruby").ruby);
    expect(colorsFor("dark", "sapphire").accent).toBe(colorsFor("dark", "sapphire").sapphire);
  });
});
