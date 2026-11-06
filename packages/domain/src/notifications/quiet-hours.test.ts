import { describe, expect, it } from "vitest";
import { inQuietHours, minutesOf } from "./quiet-hours";

describe("quiet-hours (B6, SET-07)", () => {
  it("converts HH:MM to minutes correctly", () => {
    expect(minutesOf("00:00")).toBe(0);
    expect(minutesOf("01:30")).toBe(90);
    expect(minutesOf("23:59")).toBe(1439);
  });

  it("returns false when quiet hours are turned off or boundaries are null", () => {
    expect(inQuietHours({ on: false, start: "22:00", end: "07:00" }, "23:00")).toBe(false);
    expect(inQuietHours({ on: true, start: null, end: "07:00" }, "06:00")).toBe(false);
    expect(inQuietHours({ on: true, start: "22:00", end: null }, "23:00")).toBe(false);
  });

  it("evaluates windows that do not cross midnight", () => {
    const window = { on: true, start: "13:00", end: "15:00" };
    expect(inQuietHours(window, "12:59")).toBe(false);
    expect(inQuietHours(window, "13:00")).toBe(true);
    expect(inQuietHours(window, "14:30")).toBe(true);
    expect(inQuietHours(window, "15:00")).toBe(false);
    expect(inQuietHours(window, "15:01")).toBe(false);
  });

  it("evaluates windows that cross midnight", () => {
    const window = { on: true, start: "22:00", end: "08:00" };
    expect(inQuietHours(window, "21:59")).toBe(false);
    expect(inQuietHours(window, "22:00")).toBe(true);
    expect(inQuietHours(window, "23:59")).toBe(true);
    expect(inQuietHours(window, "00:00")).toBe(true);
    expect(inQuietHours(window, "07:59")).toBe(true);
    expect(inQuietHours(window, "08:00")).toBe(false);
    expect(inQuietHours(window, "12:00")).toBe(false);
  });
});
