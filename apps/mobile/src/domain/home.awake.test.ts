import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { aboutDuration, bothAwake, dayPhaseEmoji } from "./home";

const ADDIS = "Africa/Addis_Ababa";
const LONDON = "Europe/London";
const at = (iso: string) => Temporal.Instant.from(iso);

describe("both awake (Home, P-66)", () => {
  it("is now, until the first of you reaches 22:00", () => {
    // 12:00 UTC in October: 15:00 Addis, 13:00 London. Addis reaches 22:00 at 19:00 UTC.
    expect(bothAwake(at("2026-10-22T12:00:00Z"), ADDIS, LONDON)).toEqual({
      now: true,
      minutesLeft: 7 * 60,
    });
  });

  it("counts until both are awake again", () => {
    // 20:00 UTC: 23:00 Addis (asleep). 22 Oct is still BST, so both are awake from 08:00
    // London = 07:00 UTC (10:00 Addis): 11 hours away.
    expect(bothAwake(at("2026-10-22T20:00:00Z"), ADDIS, LONDON)).toEqual({
      now: false,
      minutesUntil: 11 * 60,
    });
  });

  it("follows London's clock change (25-hour day, 25 October 2026)", () => {
    // 20:00 UTC on 24 Oct; London leaves BST overnight, so 08:00 London is 08:00 UTC.
    expect(bothAwake(at("2026-10-24T20:00:00Z"), ADDIS, LONDON)).toEqual({
      now: false,
      minutesUntil: 12 * 60,
    });
  });

  it("follows the spring change too (23-hour day, 29 March 2026)", () => {
    // 20:00 UTC on 28 Mar (GMT); 08:00 London on 29 Mar is BST, 07:00 UTC.
    expect(bothAwake(at("2026-03-28T20:00:00Z"), ADDIS, LONDON)).toEqual({
      now: false,
      minutesUntil: 11 * 60,
    });
  });

  it("always answers within two days for these zones", () => {
    const start = at("2026-01-01T00:00:00Z").epochMilliseconds;
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 365 * 24 * 4 }), (q) => {
        const r = bothAwake(
          Temporal.Instant.fromEpochMilliseconds(start + q * 15 * 60_000),
          ADDIS,
          LONDON,
        );
        if (r.now) expect(r.minutesLeft).toBeGreaterThan(0);
        else expect(r.minutesUntil).not.toBeNull();
      }),
      { numRuns: 200 },
    );
  });
});

describe("gentle wording", () => {
  it("rounds down, never precise", () => {
    expect(aboutDuration(10)).toBe("a little while");
    expect(aboutDuration(50)).toBe("about 45 min");
    expect(aboutDuration(200)).toBe("about 3 h");
  });
  it("shows the part of each day", () => {
    expect(dayPhaseEmoji(at("2026-10-22T12:00:00Z"), ADDIS)).toBe("☀️");
    expect(dayPhaseEmoji(at("2026-10-22T20:00:00Z"), ADDIS)).toBe("🌙");
  });
});
