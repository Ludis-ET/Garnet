/**
 * Home rules (HOME-01 to HOME-05). Pure: no React, no I/O. Time uses Temporal and IANA zones
 * (ADR-0002): "today" is the viewer's own calendar day in their zone, never a 24-hour window.
 */
import { Temporal } from "temporal-polyfill";

export type DayPart = "morning" | "afternoon" | "evening" | "night";

/** 05:00–11:59 morning, 12:00–16:59 afternoon, 17:00–21:59 evening, otherwise night. */
export function dayPart(now: Temporal.Instant, zone: string): DayPart {
  const h = now.toZonedDateTimeISO(zone).hour;
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

/** "Good morning, Sel". Late at night it's a softer "Hi" (no "good night" at 02:00). */
export function greeting(now: Temporal.Instant, zone: string, name: string): string {
  const part = dayPart(now, zone);
  const lead = part === "night" ? "Hi" : `Good ${part}`;
  return name.trim().length === 0 ? lead : `${lead}, ${name.trim()}`;
}

export function todayIn(now: Temporal.Instant, zone: string): Temporal.PlainDate {
  return now.toZonedDateTimeISO(zone).toPlainDate();
}

/**
 * The next date (today or later) on which a yearly "MM-DD" falls. 29 February is celebrated on
 * 28 February in years without it (prototype choice, P-54).
 */
export function nextOccurrence(monthDay: string, today: Temporal.PlainDate): Temporal.PlainDate {
  const m = /^(\d{2})-(\d{2})$/.exec(monthDay);
  if (m === null) throw new RangeError(`Expected MM-DD, got ${monthDay}`);
  const month = Number(m[1]);
  const day = Number(m[2]);
  const inYear = (year: number) =>
    Temporal.PlainDate.from({ year, month, day }, { overflow: "constrain" });
  const thisYear = inYear(today.year);
  return Temporal.PlainDate.compare(thisYear, today) >= 0 ? thisYear : inYear(today.year + 1);
}

/** Whole calendar days from today to a date (0 = today). */
export function daysUntil(today: Temporal.PlainDate, date: Temporal.PlainDate): number {
  return today.until(date, { largestUnit: "days" }).days;
}

/** "Today", "Tomorrow", "4 days". */
export function daysLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

/** An instant for "HH:MM" on a given day in a zone (fixtures that recur "today"). */
export function atLocalTime(
  date: Temporal.PlainDate,
  time: string,
  zone: string,
): Temporal.Instant {
  return date
    .toZonedDateTime({ timeZone: zone, plainTime: Temporal.PlainTime.from(time) })
    .toInstant();
}
