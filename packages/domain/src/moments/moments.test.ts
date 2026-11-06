import { describe, expect, it } from "vitest";
import {
  formatDualTime,
  formatMonthHeader,
  formatPromptTitle,
  isLetterUnlockable,
  matchesMemory,
  nextDate,
  whenPriorityWeight,
} from "../index";

describe("moments domain rules", () => {
  describe("events recurrence and dual time (ADR-0002)", () => {
    it("handles non-repeating events", () => {
      expect(nextDate("2026-11-10", "none", "2026-11-06")).toBe("2026-11-10");
      expect(nextDate("2026-11-01", "none", "2026-11-06")).toBeNull();
    });

    it("handles yearly anniversaries across leap years", () => {
      // Leap day Feb 29
      const nextLeap = nextDate("2024-02-29", "yearly", "2025-01-01");
      expect(nextLeap).toBe("2025-02-28"); // Clamped in non-leap year

      const standardYearly = nextDate("2022-10-15", "yearly", "2026-05-01");
      expect(standardYearly).toBe("2026-10-15");

      const laterThisYear = nextDate("2022-10-15", "yearly", "2026-11-01");
      expect(laterThisYear).toBe("2027-10-15");
    });

    it("handles monthly event recurrence with month-end day clamping", () => {
      // Event on the 31st
      const febNext = nextDate("2026-01-31", "monthly", "2026-02-10");
      expect(febNext).toBe("2026-02-28");
    });

    it("formats dual time for London and Addis Ababa", () => {
      // 19:00 London is 22:00 Addis Ababa in winter (UTC vs UTC+3)
      const dual = formatDualTime(
        "2026-11-06",
        "19:00",
        "Europe/London",
        "Europe/London",
        "Africa/Addis_Ababa",
      );
      expect(dual).toEqual({ me: "19:00", partner: "22:00" });
    });
  });

  describe("open when letters formatting & unlock rules", () => {
    it("formats prompt titles cleanly", () => {
      expect(formatPromptTitle("you miss me")).toBe("Open when you miss me");
      expect(formatPromptTitle("Open when you miss me")).toBe("Open when you miss me");
    });

    it("checks unlock dates", () => {
      expect(isLetterUnlockable({ type: "manual" }, "2026-11-06")).toBe(true);
      expect(isLetterUnlockable({ type: "date", date: "2026-11-10" }, "2026-11-06")).toBe(false);
      expect(isLetterUnlockable({ type: "date", date: "2026-11-05" }, "2026-11-06")).toBe(true);
    });
  });

  describe("memories filtering and together sorting", () => {
    const memory = {
      id: "1",
      title: "First coffee together",
      story: "We sat by the window in Tomoca",
      date: "2026-09-15",
      place: "Addis Ababa",
      tags: ["coffee", "trip"],
    };

    it("filters memories by search and tags", () => {
      expect(matchesMemory(memory, { search: "Tomoca" })).toBe(true);
      expect(matchesMemory(memory, { search: "Paris" })).toBe(false);
      expect(matchesMemory(memory, { tag: "coffee" })).toBe(true);
      expect(matchesMemory(memory, { tag: "music" })).toBe(false);
      expect(matchesMemory(memory, { month: "2026-09" })).toBe(true);
      expect(matchesMemory(memory, { month: "2026-10" })).toBe(false);
    });

    it("formats month headers", () => {
      expect(formatMonthHeader("2026-10-15")).toBe("October 2026");
    });

    it("sorts plan priorities", () => {
      expect(whenPriorityWeight({ kind: "soon" })).toBeLessThan(
        whenPriorityWeight({ kind: "someday" }),
      );
    });
  });
});
