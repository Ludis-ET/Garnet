import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  ageOn,
  isOldEnough,
  isRegistrationComplete,
  isValidIsoDate,
  MIN_AGE,
  registrationSchema,
  TERMS_VERSION,
} from "./registration";

describe("dates (P-79)", () => {
  it.each(["2000-01-01", "2024-02-29", "2000-02-29", "1900-12-31", "2010-04-30"])(
    "accepts %s",
    (d) => {
      expect(isValidIsoDate(d)).toBe(true);
    },
  );

  it.each([
    "2023-02-29", // not a leap year
    "1900-02-29", // centuries aren't, unless divisible by 400
    "2010-04-31",
    "2010-13-01",
    "2010-00-10",
    "2010-01-00",
    "1899-12-31",
    "10-01-2010",
    "2010-1-1",
    "",
  ])("refuses %s", (d) => {
    expect(isValidIsoDate(d)).toBe(false);
  });
});

describe("the minimum age (P-79: 16 and over)", () => {
  it("is 16", () => {
    expect(MIN_AGE).toBe(16);
  });

  it("turns a year older on the birthday itself, not the day before", () => {
    expect(ageOn("2010-03-12", "2026-03-11")).toBe(15);
    expect(ageOn("2010-03-12", "2026-03-12")).toBe(16);
    expect(isOldEnough("2010-03-12", "2026-03-11")).toBe(false);
    expect(isOldEnough("2010-03-12", "2026-03-12")).toBe(true);
  });

  it("counts a 29 February birthday from 1 March in other years", () => {
    expect(ageOn("2008-02-29", "2024-02-28")).toBe(15);
    expect(ageOn("2008-02-29", "2024-02-29")).toBe(16);
    expect(ageOn("2009-02-28", "2025-02-28")).toBe(16);
    expect(ageOn("2008-02-29", "2025-02-28")).toBe(16);
  });

  it("refuses a birthday in the future or a date that isn't one", () => {
    expect(isOldEnough("2030-01-01", "2026-11-04")).toBe(false);
    expect(isOldEnough("2000-02-30", "2026-11-04")).toBe(false);
  });

  it("property: agrees with counting birthdays one by one", () => {
    const date = fc
      .record({
        y: fc.integer({ min: 1900, max: 2100 }),
        m: fc.integer({ min: 1, max: 12 }),
        d: fc.integer({ min: 1, max: 31 }),
      })
      .map(
        ({ y, m, d }) => `${String(y)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      )
      .filter(isValidIsoDate);
    fc.assert(
      fc.property(date, date, (a, b) => {
        const [birth, today] = a <= b ? [a, b] : [b, a];
        // The reference: the last year whose birthday (29 Feb → 1 Mar) is on or before today.
        const [by, bm, bd] = birth.split("-").map(Number) as [number, number, number];
        let years = 0;
        for (let y = by + 1; ; y++) {
          const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
          const day =
            bm === 2 && bd === 29 && !leap
              ? `${String(y)}-03-01`
              : `${String(y)}-${String(bm).padStart(2, "0")}-${String(bd).padStart(2, "0")}`;
          if (day > today) break;
          years++;
        }
        expect(ageOn(birth, today)).toBe(years);
      }),
      { numRuns: 300 },
    );
  });
});

describe("registration details", () => {
  it("needs a real date and the current terms version, and nothing else", () => {
    expect(
      registrationSchema.safeParse({ birthDate: "2000-01-01", termsVersion: TERMS_VERSION })
        .success,
    ).toBe(true);
    for (const bad of [
      { birthDate: "2000-02-30", termsVersion: TERMS_VERSION },
      { birthDate: "2000-01-01", termsVersion: "2020-01-01" },
      { birthDate: "2000-01-01" },
      { birthDate: "2000-01-01", termsVersion: TERMS_VERSION, extra: 1 },
    ])
      expect(registrationSchema.safeParse(bad).success).toBe(false);
  });

  it("is complete only with a real birthday and the current terms", () => {
    expect(isRegistrationComplete("2000-01-01", TERMS_VERSION)).toBe(true);
    expect(isRegistrationComplete(null, TERMS_VERSION)).toBe(false);
    expect(isRegistrationComplete("2000-01-01", "2020-01-01")).toBe(false);
    expect(isRegistrationComplete("2000-02-30", TERMS_VERSION)).toBe(false);
  });
});
