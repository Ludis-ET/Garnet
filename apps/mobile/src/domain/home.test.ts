import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import {
  atLocalTime,
  dayPart,
  daysLabel,
  daysUntil,
  greeting,
  nextOccurrence,
  todayIn,
} from "./home";

const ADDIS = "Africa/Addis_Ababa";
const LONDON = "Europe/London";

describe("greeting (HOME-01)", () => {
  it("follows the viewer's own clock, not UTC", () => {
    const at = Temporal.Instant.from("2026-10-22T06:30:00Z"); // 09:30 Addis, 07:30 London
    expect(greeting(at, ADDIS, "Sel")).toBe("Good morning, Sel");
    expect(dayPart(Temporal.Instant.from("2026-10-22T11:00:00Z"), ADDIS)).toBe("afternoon");
    expect(dayPart(Temporal.Instant.from("2026-10-22T16:00:00Z"), ADDIS)).toBe("evening");
    expect(greeting(Temporal.Instant.from("2026-10-22T23:00:00Z"), ADDIS, "Sel")).toBe("Hi, Sel");
    expect(greeting(at, ADDIS, "  ")).toBe("Good morning");
  });

  it("never says good night or good morning at the wrong hour (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 366 * 24 * 60 }), (minutes) => {
        const at = Temporal.Instant.from("2026-01-01T00:00:00Z").add({ minutes });
        const hour = at.toZonedDateTimeISO(LONDON).hour;
        const part = dayPart(at, LONDON);
        if (part === "morning") expect(hour >= 5 && hour < 12).toBe(true);
        if (part === "night") expect(hour >= 22 || hour < 5).toBe(true);
      }),
      { numRuns: 400 },
    );
  });
});

describe("coming up (HOME-01)", () => {
  it("finds the next yearly date, today included", () => {
    const today = Temporal.PlainDate.from("2026-10-22");
    expect(nextOccurrence("11-02", today).toString()).toBe("2026-11-02");
    expect(nextOccurrence("10-22", today).toString()).toBe("2026-10-22");
    expect(nextOccurrence("01-05", today).toString()).toBe("2027-01-05");
    expect(daysUntil(today, nextOccurrence("11-02", today))).toBe(11);
  });

  it("celebrates 29 February on 28 February in other years (P-54)", () => {
    expect(nextOccurrence("02-29", Temporal.PlainDate.from("2027-01-10")).toString()).toBe(
      "2027-02-28",
    );
    expect(nextOccurrence("02-29", Temporal.PlainDate.from("2028-01-10")).toString()).toBe(
      "2028-02-29",
    );
    expect(() => nextOccurrence("2-9", Temporal.PlainDate.from("2027-01-10"))).toThrow(RangeError);
  });

  it("counts calendar days in the viewer's zone, across the London clock change", () => {
    // 25 Oct 2026 is a 25-hour day in London; it still counts as one day.
    const today = todayIn(Temporal.Instant.from("2026-10-24T22:30:00Z"), LONDON);
    expect(today.toString()).toBe("2026-10-24");
    expect(daysUntil(today, Temporal.PlainDate.from("2026-10-26"))).toBe(2);
    expect(daysLabel(0)).toBe("Today");
    expect(daysLabel(1)).toBe("Tomorrow");
    expect(daysLabel(4)).toBe("4 days");
  });

  it("puts a recurring local time on today's date in the zone", () => {
    const day = Temporal.PlainDate.from("2026-10-22");
    expect(atLocalTime(day, "08:12", ADDIS).toString()).toBe("2026-10-22T05:12:00Z");
    expect(atLocalTime(day, "08:12", LONDON).toString()).toBe("2026-10-22T07:12:00Z");
  });

  it("is never negative and never more than a year away (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 31 }),
        (offset, month, day) => {
          const today = Temporal.PlainDate.from("2026-01-01").add({ days: offset });
          const md = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const days = daysUntil(today, nextOccurrence(md, today));
          expect(days).toBeGreaterThanOrEqual(0);
          expect(days).toBeLessThanOrEqual(366);
        },
      ),
      { numRuns: 400 },
    );
  });
});
