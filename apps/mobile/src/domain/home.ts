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

/** Waking hours used for "both awake" on Home (P-66): 08:00 to 22:00 in each person's zone. */
export const AWAKE = { from: 8, to: 22 } as const;

function awake(at: Temporal.Instant, zone: string): boolean {
  const t = at.toZonedDateTimeISO(zone);
  const h = t.hour + t.minute / 60;
  return h >= AWAKE.from && h < AWAKE.to;
}

/**
 * When the two of you are both awake (HOME "Right now", P-66): now and for how much longer, or
 * how long until you both are. Steps in 15 minutes through real zone times, so 23- and 25-hour
 * days and either clock change are handled by Temporal (ADR-0002).
 */
export function bothAwake(
  now: Temporal.Instant,
  myZone: string,
  theirZone: string,
): { now: true; minutesLeft: number } | { now: false; minutesUntil: number | null } {
  const both = (at: Temporal.Instant) => awake(at, myZone) && awake(at, theirZone);
  const step = 15;
  if (both(now)) {
    let m = 0;
    while (m < 24 * 60 && both(now.add({ minutes: m + step }))) m += step;
    return { now: true, minutesLeft: m + step };
  }
  for (let m = step; m <= 48 * 60; m += step) {
    if (both(now.add({ minutes: m }))) return { now: false, minutesUntil: m };
  }
  return { now: false, minutesUntil: null };
}

/** "About 3 h", "About 45 min", "A little while" (rounded down, gentle). */
export function aboutDuration(minutes: number): string {
  if (minutes < 30) return "a little while";
  if (minutes < 90) return `about ${String(Math.round(minutes / 15) * 15)} min`;
  return `about ${String(Math.floor(minutes / 60))} h`;
}

/** A picture for the part of someone's day. */
export function dayPhaseEmoji(now: Temporal.Instant, zone: string): string {
  const h = now.toZonedDateTimeISO(zone).hour;
  if (h >= 5 && h < 11) return "🌅";
  if (h >= 11 && h < 17) return "☀️";
  if (h >= 17 && h < 21) return "🌇";
  return "🌙";
}
