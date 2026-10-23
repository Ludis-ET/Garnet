import fc from "fast-check";
import { sharedDayOf } from "@garnet/domain";
import { Temporal } from "temporal-polyfill";
import {
  canChangeVisibility,
  dayLabel,
  formatDuration,
  matchesFilter,
  monthGrid,
  partnerCanSee,
  PROVISIONAL_DAY_POLICY,
  revealState,
  weekLabel,
  type Visibility,
} from "./days";

const VIS: Visibility[] = ["private", "shared", "afterReveal"];

describe("visibility (§4, day-log rules)", () => {
  it("never shows a private draft, shows 'after our days meet' only once revealed", () => {
    expect(partnerCanSee("private", false)).toBe(false);
    expect(partnerCanSee("private", true)).toBe(false);
    expect(partnerCanSee("afterReveal", false)).toBe(false);
    expect(partnerCanSee("afterReveal", true)).toBe(true);
    expect(partnerCanSee("shared", false)).toBe(true);
  });

  it("keeps shared moments shared (P-20), everything else may change", () => {
    for (const from of VIS)
      for (const to of VIS)
        expect(canChangeVisibility(from, to)).toBe(from === to || from !== "shared");
  });
});

describe("reveal (U-06 open: both options tested)", () => {
  const both = { ...PROVISIONAL_DAY_POLICY, recap: "both-ready" as const };
  const cutoff = { ...PROVISIONAL_DAY_POLICY, recap: "both-ready-or-cutoff" as const };

  it("opens the recap when both are ready (assumed by the prototype)", () => {
    expect(
      revealState({ meReady: false, partnerReady: false, dayEnded: false, policy: both }),
    ).toBe("open");
    expect(revealState({ meReady: true, partnerReady: false, dayEnded: true, policy: both })).toBe(
      "waiting",
    );
    expect(revealState({ meReady: true, partnerReady: true, dayEnded: false, policy: both })).toBe(
      "ready",
    );
  });

  it("also opens at the cutoff under the alternative rule", () => {
    expect(
      revealState({ meReady: false, partnerReady: false, dayEnded: true, policy: cutoff }),
    ).toBe("ready");
    expect(
      revealState({ meReady: true, partnerReady: false, dayEnded: false, policy: cutoff }),
    ).toBe("waiting");
  });
});

describe("the provisional shared day (U-02 open; D-12, D-13)", () => {
  const day = (iso: string) =>
    sharedDayOf(Temporal.Instant.from(iso), PROVISIONAL_DAY_POLICY.sharedDay);

  it("runs 04:00 to 04:00 London, including across the October clock change", () => {
    expect(day("2026-10-22T02:59:00Z").toString()).toBe("2026-10-21"); // 03:59 BST
    expect(day("2026-10-22T03:00:00Z").toString()).toBe("2026-10-22"); // 04:00 BST
    // 25 Oct 2026: clocks go back at 02:00 BST; the day still starts at 04:00 GMT.
    expect(day("2026-10-25T03:59:00Z").toString()).toBe("2026-10-24");
    expect(day("2026-10-25T04:00:00Z").toString()).toBe("2026-10-25");
  });
});

describe("calendar and labels", () => {
  it("lays a month out Monday-first in whole weeks", () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks[0]?.slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0]?.[3]?.toString()).toBe("2026-10-01"); // a Thursday
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter((d) => d !== null)).toHaveLength(31);
  });

  it("covers every day of any month exactly once (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1990, max: 2090 }), fc.integer({ min: 1, max: 12 }), (y, m) => {
        const days = monthGrid(y, m)
          .flat()
          .filter((d) => d !== null);
        expect(days).toHaveLength(
          Temporal.PlainDate.from({ year: y, month: m, day: 1 }).daysInMonth,
        );
        expect(days.every((d, i) => d.day === i + 1)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("labels days and weeks", () => {
    const today = Temporal.PlainDate.from("2026-10-22"); // Thursday
    expect(dayLabel(Temporal.PlainDate.from("2026-11-03"))).toBe("Tue 3 Nov");
    expect(weekLabel(Temporal.PlainDate.from("2026-10-19"), today)).toBe("This week");
    expect(weekLabel(Temporal.PlainDate.from("2026-10-18"), today)).toBe("Last week");
    expect(weekLabel(Temporal.PlainDate.from("2026-10-05"), today)).toBe("Week of 5 Oct");
    expect(formatDuration(83)).toBe("1:23");
  });
});

describe("search and filter (DAYS-11)", () => {
  const e = { text: "Coffee ceremony at home", kind: "photo" as const, mine: true };
  it("matches words, kinds and whose moments", () => {
    expect(matchesFilter(e, { query: "COFFEE", kinds: [], who: "both" })).toBe(true);
    expect(matchesFilter(e, { query: "tea", kinds: [], who: "both" })).toBe(false);
    expect(matchesFilter(e, { query: "", kinds: ["voice"], who: "both" })).toBe(false);
    expect(matchesFilter(e, { query: "", kinds: [], who: "partner" })).toBe(false);
  });
});
