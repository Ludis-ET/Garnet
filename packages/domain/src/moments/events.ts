// packages/domain/src/moments/events.ts
// Pure calculations for calendar events, recurrence, and dual-timezone previews (ADR-0002).

import { Temporal } from "temporal-polyfill";

export type EventRepeat = "none" | "yearly" | "monthly";

/**
 * Calculates the next occurrence of an event on or after `todayIso` (YYYY-MM-DD).
 * Returns null if the event is non-repeating and already in the past.
 * Handles leap years (e.g. Feb 29) and variable-length months safely via Temporal.
 */
export function nextDate(
  firstDateIso: string,
  repeats: EventRepeat,
  todayIso: string,
): string | null {
  const first = Temporal.PlainDate.from(firstDateIso);
  const today = Temporal.PlainDate.from(todayIso);

  if (repeats === "none") {
    return Temporal.PlainDate.compare(first, today) >= 0 ? first.toString() : null;
  }

  if (repeats === "yearly") {
    let candidateYear = today.year;
    // Check candidate for current year
    let candidate: Temporal.PlainDate;
    try {
      candidate = Temporal.PlainDate.from({
        year: candidateYear,
        month: first.month,
        day: first.day,
      });
    } catch {
      // Leap day on non-leap year clamps to Feb 28
      candidate = Temporal.PlainDate.from({
        year: candidateYear,
        month: 2,
        day: 28,
      });
    }

    if (Temporal.PlainDate.compare(candidate, today) < 0) {
      candidateYear++;
      try {
        candidate = Temporal.PlainDate.from({
          year: candidateYear,
          month: first.month,
          day: first.day,
        });
      } catch {
        candidate = Temporal.PlainDate.from({
          year: candidateYear,
          month: 2,
          day: 28,
        });
      }
    }
    return candidate.toString();
  }

  // repeats is "monthly"
  let candidate = Temporal.PlainDate.from({
    year: today.year,
    month: today.month,
    day: Math.min(first.day, today.daysInMonth),
  });

  if (Temporal.PlainDate.compare(candidate, today) < 0) {
    const nextMonth = today.add({ months: 1 });
    candidate = Temporal.PlainDate.from({
      year: nextMonth.year,
      month: nextMonth.month,
      day: Math.min(first.day, nextMonth.daysInMonth),
    });
  }
  return candidate.toString();
}

/**
 * Formats time display for viewer and partner zones (e.g. London & Addis Ababa).
 */
export function formatDualTime(
  eventDateIso: string,
  eventTime: string | null,
  eventTimeZone: string | null,
  viewerZone: string,
  partnerZone: string,
): { me: string; partner: string } | null {
  if (!eventTime) {
    return null;
  }

  const baseZone = eventTimeZone ?? viewerZone;
  const [hStr, mStr] = eventTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }

  try {
    const plainDate = Temporal.PlainDate.from(eventDateIso);
    const plainTime = Temporal.PlainTime.from({ hour: h, minute: m });
    const zonedDateTime = plainDate.toZonedDateTime({
      timeZone: baseZone,
      plainTime,
    });

    const viewerTime = zonedDateTime.withTimeZone(viewerZone);
    const partnerTime = zonedDateTime.withTimeZone(partnerZone);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const meStr = `${pad(viewerTime.hour)}:${pad(viewerTime.minute)}`;
    const partnerStr = `${pad(partnerTime.hour)}:${pad(partnerTime.minute)}`;

    return { me: meStr, partner: partnerStr };
  } catch {
    return null;
  }
}
