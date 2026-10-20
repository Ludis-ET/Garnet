import fc from "fast-check";
import { moodMotion, sampleBody } from "../poses";
import { MOODS } from "../types";

const mood = fc.constantFrom(...MOODS);
const time = fc.double({ min: 0, max: 3600, noNaN: true });
const phase = fc.double({ min: 0, max: 1, noNaN: true });

describe("sampleBody", () => {
  it("always yields finite, gentle motion", () => {
    fc.assert(
      fc.property(mood, time, phase, fc.boolean(), (m, t, p, reduce) => {
        const b = sampleBody(moodMotion[m], t, reduce, p);
        for (const v of [b.lift, b.sway, b.breathe]) expect(Number.isFinite(v)).toBe(true);
        expect(b.lift).toBeGreaterThanOrEqual(-0.02);
        expect(b.lift).toBeLessThanOrEqual(0.06);
        expect(Math.abs(b.sway)).toBeLessThanOrEqual(3.5);
        expect(Math.abs(b.breathe - 1)).toBeLessThan(0.05);
      }),
      { numRuns: 400 },
    );
  });

  it("holds still under reduced motion: the result does not depend on time", () => {
    fc.assert(
      fc.property(mood, time, time, phase, (m, t1, t2, p) => {
        expect(sampleBody(moodMotion[m], t1, true, p)).toEqual(
          sampleBody(moodMotion[m], t2, true, p),
        );
      }),
      { numRuns: 200 },
    );
  });

  it("moves when motion is allowed (reduced motion is not the only path)", () => {
    const a = sampleBody(moodMotion.celebrating, 0.1, false);
    const b = sampleBody(moodMotion.celebrating, 0.35, false);
    expect(a.lift).not.toBeCloseTo(b.lift, 3);
  });

  it("makes the lively moods livelier than calm", () => {
    for (const m of ["celebrating", "dancing", "laughing", "joyful"] as const) {
      expect(moodMotion[m].hop).toBeGreaterThan(moodMotion.calm.hop);
    }
  });
});
