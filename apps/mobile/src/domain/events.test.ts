import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { chapterNumber, countdownLabel, eventInstant, nextDate, occurrenceNumber } from "./events";

const d = (s: string) => Temporal.PlainDate.from(s);

describe("next dates (EVT-01)", () => {
  it("brings yearly events round, keeping 29 February as the month's last day", () => {
    expect(nextDate(d("1996-11-02"), "yearly", d("2026-10-26"))?.toString()).toBe("2026-11-02");
    expect(nextDate(d("1996-11-02"), "yearly", d("2026-11-03"))?.toString()).toBe("2027-11-02");
    expect(nextDate(d("2024-02-29"), "yearly", d("2026-01-10"))?.toString()).toBe("2026-02-28");
    expect(nextDate(d("2026-01-31"), "monthly", d("2026-02-05"))?.toString()).toBe("2026-02-28");
  });

  it("drops past one-off events and never starts before the first date", () => {
    expect(nextDate(d("2026-10-01"), "none", d("2026-10-26"))).toBeNull();
    expect(nextDate(d("2026-12-18"), "none", d("2026-10-26"))?.toString()).toBe("2026-12-18");
    expect(nextDate(d("2027-05-05"), "yearly", d("2026-10-26"))?.toString()).toBe("2027-05-05");
  });

  it("is always on or after today and keeps the day of month when it can (property)", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("1990-01-01"), max: new Date("2030-12-31"), noInvalidDate: true }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2035-12-31"), noInvalidDate: true }),
        fc.constantFrom("yearly", "monthly" as const),
        (a, b, repeat) => {
          const first = d(a.toISOString().slice(0, 10));
          const today = d(b.toISOString().slice(0, 10));
          const next = nextDate(first, repeat, today);
          expect(next).not.toBeNull();
          if (next === null) return;
          expect(Temporal.PlainDate.compare(next, today)).toBeGreaterThanOrEqual(0);
          expect(Temporal.PlainDate.compare(next, first)).toBeGreaterThanOrEqual(0);
          expect(next.day === first.day || next.day === next.daysInMonth).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("counts anniversaries and months, and labels the countdown without totals", () => {
    expect(occurrenceNumber(d("2024-11-14"), "yearly", d("2026-11-14"))).toBe(2);
    expect(occurrenceNumber(d("2026-09-01"), "monthly", d("2026-11-01"))).toBe(2);
    expect(countdownLabel(d("2026-10-26"), d("2026-10-26"))).toBe("Today");
    expect(countdownLabel(d("2026-10-26"), d("2026-10-27"))).toBe("Tomorrow");
    expect(countdownLabel(d("2026-10-26"), d("2026-11-02"))).toBe("in 7 days");
    expect(chapterNumber(d("2026-09-01"), Temporal.PlainYearMonth.from("2026-10"))).toBe(2);
  });
});

describe("event times (EVT-03, ADR-0002)", () => {
  it("turns a London evening into one instant, shown at 22:00 in Addis in winter", () => {
    const r = eventInstant(d("2026-11-14"), "19:00", "Europe/London");
    expect(r.ok && r.instant.toZonedDateTimeISO("Africa/Addis_Ababa").hour).toBe(22);
  });

  it("rejects the hour the clocks skip in spring, and keeps the repeated autumn hour", () => {
    expect(eventInstant(d("2027-03-28"), "01:30", "Europe/London")).toEqual({
      ok: false,
      reason: "missing",
    });
    const autumn = eventInstant(d("2026-10-25"), "01:30", "Europe/London");
    expect(autumn.ok).toBe(true);
    expect(eventInstant(d("2026-10-25"), "25:00", "Europe/London")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
