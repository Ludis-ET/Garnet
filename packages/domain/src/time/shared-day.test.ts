import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import {
  createSharedDayConfig,
  PROPOSED_REFERENCE_TIME_ZONE,
  sharedDayOf,
  sharedDayWindow,
  sharedDayWindowIn,
  startOfSharedDay,
  type CutoffTime,
} from "./shared-day";

// The cutoff is UNRESOLVED (U-02). Tests exercise several candidates rather than assuming one.
const london = (cutoff: CutoffTime) =>
  createSharedDayConfig({ referenceTimeZone: PROPOSED_REFERENCE_TIME_ZONE, cutoff });

const at = (iso: string) => Temporal.Instant.from(iso);
const date = (iso: string) => Temporal.PlainDate.from(iso);
const dayOf = (iso: string, cutoff: CutoffTime) => sharedDayOf(at(iso), london(cutoff)).toString();
const hoursIn = (day: string, cutoff: CutoffTime) => {
  const { start, end } = sharedDayWindow(date(day), london(cutoff));
  return start.until(end).total({ unit: "hours" });
};

const ADDIS_ABABA = "Africa/Addis_Ababa";
const FOUR_AM = { hour: 4, minute: 0 };

describe("createSharedDayConfig", () => {
  it("accepts a named zone and normalises it", () => {
    const config = london(FOUR_AM);
    expect(config.referenceTimeZone).toBe("Europe/London");
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each(["+00:00", "+01:00", "-0500", "Etc/GMT-3"])("rejects fixed offset %s", (zone) => {
    expect(() => createSharedDayConfig({ referenceTimeZone: zone, cutoff: FOUR_AM })).toThrow(
      RangeError,
    );
  });

  it("rejects unknown zones", () => {
    expect(() =>
      createSharedDayConfig({ referenceTimeZone: "Europe/Atlantis", cutoff: FOUR_AM }),
    ).toThrow(RangeError);
  });

  it.each([
    { hour: 24, minute: 0 },
    { hour: -1, minute: 0 },
    { hour: 4.5, minute: 0 },
    { hour: 4, minute: 60 },
  ])("rejects invalid cutoff %o", (cutoff) => {
    expect(() => london(cutoff)).toThrow(RangeError);
  });
});

describe("sharedDayOf — ordinary days", () => {
  it("winter (GMT): day boundary at cutoff London = same UTC time", () => {
    expect(dayOf("2026-01-15T03:59:59Z", FOUR_AM)).toBe("2026-01-14");
    expect(dayOf("2026-01-15T04:00:00Z", FOUR_AM)).toBe("2026-01-15");
  });

  it("summer (BST): day boundary at cutoff London = one hour earlier in UTC", () => {
    expect(dayOf("2026-07-15T02:59:59Z", FOUR_AM)).toBe("2026-07-14");
    expect(dayOf("2026-07-15T03:00:00Z", FOUR_AM)).toBe("2026-07-15");
  });

  it("midnight cutoff behaves like the London calendar date", () => {
    const midnight = { hour: 0, minute: 0 };
    expect(dayOf("2026-07-14T22:59:59Z", midnight)).toBe("2026-07-14");
    expect(dayOf("2026-07-14T23:00:00Z", midnight)).toBe("2026-07-15");
  });

  it("is a 24-hour day away from transitions", () => {
    expect(hoursIn("2026-01-15", FOUR_AM)).toBe(24);
    expect(hoursIn("2026-07-15", FOUR_AM)).toBe(24);
  });
});

describe("sharedDayOf — GMT/BST transitions (2026: 29 Mar and 25 Oct at 01:00 UTC)", () => {
  it("the shared day spanning spring-forward is 23 hours", () => {
    expect(hoursIn("2026-03-28", FOUR_AM)).toBe(23);
    expect(hoursIn("2026-03-29", FOUR_AM)).toBe(24);
  });

  it("the shared day spanning fall-back is 25 hours", () => {
    expect(hoursIn("2026-10-24", FOUR_AM)).toBe(25);
    expect(hoursIn("2026-10-25", FOUR_AM)).toBe(24);
  });

  it("cutoff inside the spring gap (01:30 does not exist) starts the day at the transition", () => {
    const halfPastOne = { hour: 1, minute: 30 };
    expect(startOfSharedDay(date("2026-03-29"), london(halfPastOne)).toString()).toBe(
      "2026-03-29T01:00:00Z",
    );
    expect(dayOf("2026-03-29T00:59:59Z", halfPastOne)).toBe("2026-03-28");
    expect(dayOf("2026-03-29T01:00:00Z", halfPastOne)).toBe("2026-03-29");
  });

  it("cutoff inside the autumn overlap (01:30 happens twice) uses the first occurrence", () => {
    const halfPastOne = { hour: 1, minute: 30 };
    // 01:30 BST = 00:30 UTC.
    expect(startOfSharedDay(date("2026-10-25"), london(halfPastOne)).toString()).toBe(
      "2026-10-25T00:30:00Z",
    );
    expect(dayOf("2026-10-25T00:29:59Z", halfPastOne)).toBe("2026-10-24");
    expect(dayOf("2026-10-25T00:30:00Z", halfPastOne)).toBe("2026-10-25");
    // 01:10 GMT (second pass through 01:xx) must NOT fall back to the previous day.
    expect(dayOf("2026-10-25T01:10:00Z", halfPastOne)).toBe("2026-10-25");
  });

  it("handles the 2027 transitions without any hard-coded offsets", () => {
    expect(hoursIn("2027-03-27", FOUR_AM)).toBe(23);
    expect(hoursIn("2027-10-30", FOUR_AM)).toBe(25);
  });
});

describe("Ethiopia ↔ London display", () => {
  it("Addis Ababa has no DST: +03:00 all year", () => {
    for (const iso of ["2026-01-15T12:00:00Z", "2026-07-15T12:00:00Z", "2026-10-25T01:30:00Z"]) {
      expect(at(iso).toZonedDateTimeISO(ADDIS_ABABA).offset).toBe("+03:00");
    }
  });

  it("a 04:00 London cutoff is 07:00 in Addis in winter and 06:00 in summer", () => {
    const winter = sharedDayWindowIn(date("2026-01-15"), london(FOUR_AM), ADDIS_ABABA);
    const summer = sharedDayWindowIn(date("2026-07-15"), london(FOUR_AM), ADDIS_ABABA);
    expect(winter.start.toPlainTime().toString()).toBe("07:00:00");
    expect(summer.start.toPlainTime().toString()).toBe("06:00:00");
  });

  it("the gap between partners changes from 3h to 2h across DST; assignment stays correct", () => {
    // 05:59 Addis on 15 Jul = 02:59 UTC = 03:59 BST → still the 14th's shared day.
    const lateNight = Temporal.ZonedDateTime.from("2026-07-15T05:59:00[Africa/Addis_Ababa]");
    expect(sharedDayOf(lateNight.toInstant(), london(FOUR_AM)).toString()).toBe("2026-07-14");
    // 06:00 Addis = 03:00 UTC = 04:00 BST → the 15th.
    const morning = Temporal.ZonedDateTime.from("2026-07-15T06:00:00[Africa/Addis_Ababa]");
    expect(sharedDayOf(morning.toInstant(), london(FOUR_AM)).toString()).toBe("2026-07-15");
  });

  it("the shared day can straddle two local dates for the Addis partner", () => {
    const window = sharedDayWindowIn(
      date("2026-01-15"),
      london({ hour: 22, minute: 0 }),
      ADDIS_ABABA,
    );
    expect(window.start.toPlainDate().toString()).toBe("2026-01-16");
    expect(window.start.toPlainTime().toString()).toBe("01:00:00");
  });
});

describe("properties (fast-check)", () => {
  // 2020-01-01 .. 2040-01-01 in epoch ms
  const instantArb = fc
    .integer({ min: 1_577_836_800_000, max: 2_208_988_800_000 })
    .map((ms) => Temporal.Instant.fromEpochMilliseconds(ms));
  const cutoffArb = fc.record({
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  });

  it("every instant lies inside the window of the day it is assigned to", () => {
    fc.assert(
      fc.property(instantArb, cutoffArb, (instant, cutoff) => {
        const config = london(cutoff);
        const { start, end } = sharedDayWindow(sharedDayOf(instant, config), config);
        return (
          Temporal.Instant.compare(start, instant) <= 0 &&
          Temporal.Instant.compare(instant, end) < 0
        );
      }),
      { numRuns: 2_000 },
    );
  }, 30_000);

  it("assignment is monotonic: later instants never map to earlier days", () => {
    fc.assert(
      fc.property(instantArb, instantArb, cutoffArb, (a, b, cutoff) => {
        const config = london(cutoff);
        const [first, second] = Temporal.Instant.compare(a, b) <= 0 ? [a, b] : [b, a];
        return (
          Temporal.PlainDate.compare(sharedDayOf(first, config), sharedDayOf(second, config)) <= 0
        );
      }),
      { numRuns: 2_000 },
    );
  }, 30_000);

  const hoursOfDayContaining = (instant: Temporal.Instant, cutoff: CutoffTime) => {
    const config = london(cutoff);
    const day = sharedDayOf(instant, config);
    const today = sharedDayWindow(day, config);
    const tomorrow = sharedDayWindow(day.add({ days: 1 }), config);
    expect(today.end.equals(tomorrow.start)).toBe(true); // contiguous, no gaps or overlaps
    return today.start.until(today.end).total({ unit: "hours" });
  };

  it("shared days are contiguous and between 23 and 25 hours for any cutoff", () => {
    fc.assert(
      fc.property(instantArb, cutoffArb, (instant, cutoff) => {
        const hours = hoursOfDayContaining(instant, cutoff);
        return hours >= 23 && hours <= 25;
      }),
      { numRuns: 1_000 },
    );
  }, 30_000);

  it("with a cutoff outside London's 01:00–02:00 transition hour, days are exactly 23, 24 or 25h", () => {
    const safeCutoffArb = cutoffArb.filter((c) => c.hour !== 1);
    fc.assert(
      fc.property(instantArb, safeCutoffArb, (instant, cutoff) =>
        [23, 24, 25].includes(hoursOfDayContaining(instant, cutoff)),
      ),
      { numRuns: 1_000 },
    );
  }, 30_000);

  it("a cutoff inside the spring gap splits the lost hour across two days (finding for U-02)", () => {
    const halfPastOne = { hour: 1, minute: 30 };
    expect(hoursIn("2026-03-28", halfPastOne)).toBe(23.5);
    expect(hoursIn("2026-03-29", halfPastOne)).toBe(23.5);
  });
});
