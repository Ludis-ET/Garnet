import { SIGNALS } from "@garnet/domain";
import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { MOODS } from "@/features/figures/types";
import { companionLook, dayMoment, garnetLook, type CompanionInput } from "./companion";
import { FEELINGS } from "./days";

const DATE = Temporal.PlainDate.from("2026-10-26"); // a Monday
const base: CompanionInput = {
  moment: "day",
  date: DATE,
  feeling: null,
  signal: null,
  special: null,
};

describe("companion looks (P-57)", () => {
  it("follows the time of day in the person's own zone, across the clock change", () => {
    // 25 Oct 2026: London leaves summer time; 08:30 local is morning on both sides of it.
    expect(dayMoment(Temporal.Instant.from("2026-10-24T07:30:00Z"), "Europe/London")).toBe(
      "morning",
    );
    expect(dayMoment(Temporal.Instant.from("2026-10-26T08:30:00Z"), "Europe/London")).toBe(
      "morning",
    );
    expect(dayMoment(Temporal.Instant.from("2026-10-26T19:00:00Z"), "Africa/Addis_Ababa")).toBe(
      "night",
    );
    expect(dayMoment(Temporal.Instant.from("2026-10-26T15:00:00Z"), "Africa/Addis_Ababa")).toBe(
      "evening",
    );
  });

  it("puts special days first, then signals, then feelings, then the time", () => {
    expect(companionLook({ ...base, special: "birthday", feeling: "low" })).toEqual({
      mood: "celebrating",
      occasion: "birthday",
    });
    expect(companionLook({ ...base, signal: "thought-of-you", feeling: "tired" }).mood).toBe(
      "loving",
    );
    expect(companionLook({ ...base, feeling: "excited" }).mood).toBe("dancing");
    expect(companionLook({ ...base, moment: "night" })).toEqual({
      mood: "sleepy",
      occasion: "goodnight",
    });
    expect(companionLook({ ...base, moment: "morning" }).occasion).toBe("morning");
  });

  it("shows a different everyday look on each day of the week", () => {
    const week = Array.from(
      { length: 7 },
      (_, i) => companionLook({ ...base, date: DATE.add({ days: i }) }).mood,
    );
    expect(new Set(week).size).toBe(7);
  });

  it("never looks sad: a hard day becomes a hug, for every feeling and signal (property)", () => {
    const feelings = FEELINGS.map((f) => f.id);
    const signals = SIGNALS.map((s) => s.id);
    fc.assert(
      fc.property(
        fc.constantFrom("morning", "day", "evening", "night" as const),
        fc.option(fc.constantFrom(...feelings), { nil: null }),
        fc.option(fc.constantFrom(...signals), { nil: null }),
        fc.option(fc.constantFrom("birthday", "anniversary" as const), { nil: null }),
        fc.integer({ min: 0, max: 400 }),
        (moment, feeling, signal, special, day) => {
          const input = { moment, feeling, signal, special, date: DATE.add({ days: day }) };
          for (const look of [companionLook(input), garnetLook(input, { feeling, signal })])
            expect(MOODS).toContain(look.mood);
        },
      ),
      { numRuns: 300 },
    );
    expect(companionLook({ ...base, feeling: "low" }).mood).toBe("hug");
  });

  it("gives Garnet a hug when either of them needs one", () => {
    expect(garnetLook(base, { feeling: null, signal: "need-you" })).toEqual({
      mood: "hug",
      occasion: "together",
    });
    expect(garnetLook({ ...base, feeling: "stressed" }, { feeling: null, signal: null }).mood).toBe(
      "hug",
    );
  });
});
