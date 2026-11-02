/**
 * Events and chapters (EVT-01 to EVT-09). Pure: no React, no I/O.
 *
 * - Times use Temporal and IANA zones (ADR-0002) and show in both partners' zones wherever
 *   confusion is possible. A time that doesn't exist (the UK spring-forward gap) is rejected
 *   with a clear message, never silently shifted.
 * - Birthdays and anniversaries are special pages, not alerts (§24–28). Reminders are
 *   simulated in Phase 2 and say so.
 * - Monthly chapters are optional: no forms to finish, no guilt for skipping, no scores.
 */
import { Temporal } from "temporal-polyfill";

export type EventKind = "birthday" | "anniversary" | "travel" | "date" | "custom";
export type Repeat = "none" | "yearly" | "monthly";
export type ReminderId = "day" | "dayBefore" | "weekBefore";

export const EVENT_KINDS: readonly { kind: EventKind; label: string; emoji: string }[] = [
  { kind: "birthday", label: "Birthday", emoji: "🎂" },
  { kind: "anniversary", label: "Anniversary", emoji: "💜" },
  { kind: "travel", label: "Visit", emoji: "✈️" },
  { kind: "date", label: "Date night", emoji: "🍿" },
  { kind: "custom", label: "Other", emoji: "✨" },
];

export const REPEATS: readonly { id: Repeat; label: string }[] = [
  { id: "none", label: "Once" },
  { id: "yearly", label: "Every year" },
  { id: "monthly", label: "Every month" },
];

export const REMINDERS: readonly { id: ReminderId; label: string }[] = [
  { id: "day", label: "On the day" },
  { id: "dayBefore", label: "1 day before" },
  { id: "weekBefore", label: "1 week before" },
];

export function kindOf(kind: EventKind): { label: string; emoji: string } {
  return EVENT_KINDS.find((k) => k.kind === kind) ?? { label: "Other", emoji: "✨" };
}

/**
 * The next date on or after `today` (yearly and monthly repeats keep the day of month; 29 Feb
 * and 31st fall back to the month's last day). One-off events in the past have no next date.
 */
export function nextDate(
  first: Temporal.PlainDate,
  repeat: Repeat,
  today: Temporal.PlainDate,
): Temporal.PlainDate | null {
  switch (repeat) {
    case "none":
      return Temporal.PlainDate.compare(first, today) >= 0 ? first : null;
    case "yearly": {
      for (let y = Math.max(first.year, today.year); ; y++) {
        const d = Temporal.PlainDate.from(
          { year: y, month: first.month, day: first.day },
          { overflow: "constrain" },
        );
        if (Temporal.PlainDate.compare(d, today) >= 0 && Temporal.PlainDate.compare(d, first) >= 0)
          return d;
      }
    }
    case "monthly": {
      let ym =
        Temporal.PlainYearMonth.compare(first.toPlainYearMonth(), today.toPlainYearMonth()) > 0
          ? first.toPlainYearMonth()
          : today.toPlainYearMonth();
      for (;;) {
        const d = Temporal.PlainDate.from(
          { year: ym.year, month: ym.month, day: first.day },
          { overflow: "constrain" },
        );
        if (Temporal.PlainDate.compare(d, today) >= 0) return d;
        ym = ym.add({ months: 1 });
      }
    }
  }
}

/** How many times it has come round by that date (years for yearly, months for monthly). */
export function occurrenceNumber(
  first: Temporal.PlainDate,
  repeat: Repeat,
  on: Temporal.PlainDate,
): number {
  if (repeat === "yearly") return on.year - first.year;
  if (repeat === "monthly") return (on.year - first.year) * 12 + (on.month - first.month);
  return 0;
}

export type TimeCheck =
  { ok: true; instant: Temporal.Instant } | { ok: false; reason: "invalid" | "missing" };

/**
 * A local date and time in a zone, as one instant. "missing" when the clocks skip that time
 * (e.g. 01:30 on the last Sunday of March in London), so the form can say so instead of moving it.
 */
export function eventInstant(date: Temporal.PlainDate, time: string, zone: string): TimeCheck {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (m === null) return { ok: false, reason: "invalid" };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return { ok: false, reason: "invalid" };
  try {
    const zdt = Temporal.ZonedDateTime.from(
      { year: date.year, month: date.month, day: date.day, hour, minute, timeZone: zone },
      { disambiguation: "reject" },
    );
    return { ok: true, instant: zdt.toInstant() };
  } catch {
    // "reject" throws for both gaps and overlaps; an overlap time still exists once.
    const later = Temporal.ZonedDateTime.from(
      { year: date.year, month: date.month, day: date.day, hour, minute, timeZone: zone },
      { disambiguation: "later" },
    );
    const back = later.toPlainTime();
    return back.hour === hour && back.minute === minute
      ? { ok: true, instant: later.toInstant() }
      : { ok: false, reason: "missing" };
  }
}

/** "in 4 days", "Tomorrow", "Today". Never a running total of days apart. */
export function countdownLabel(today: Temporal.PlainDate, date: Temporal.PlainDate): string {
  const days = today.until(date).total({ unit: "days" });
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

/** A monthly chapter's optional prompts (EVT-07). Every one can be skipped. */
export const CHAPTER_PROMPTS = [
  { id: "moment", emoji: "✨", label: "Favourite moment" },
  { id: "photo", emoji: "📸", label: "Favourite photo" },
  { id: "learned", emoji: "🌱", label: "Something we learned" },
  { id: "ahead", emoji: "🌅", label: "Something we're looking forward to" },
] as const;
export type ChapterPromptId = (typeof CHAPTER_PROMPTS)[number]["id"];

/** "Chapter 02" for the second month since `start` (the month they started counts as 01). */
export function chapterNumber(start: Temporal.PlainDate, month: Temporal.PlainYearMonth): number {
  return (month.year - start.year) * 12 + (month.month - start.month) + 1;
}
