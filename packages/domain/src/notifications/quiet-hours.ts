/**
 * Pure quiet hours calculation (B6, SET-07, ADR-0002).
 * Handles windows that do not cross midnight (e.g. 14:00 to 16:00)
 * as well as windows that cross midnight (e.g. 23:00 to 07:00).
 */

export interface QuietHoursWindow {
  readonly on: boolean;
  readonly start: string | null;
  readonly end: string | null;
}

/** Converts "HH:MM" to minutes after midnight (0 - 1439). */
export function minutesOf(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = Number(parts[0] ?? "0");
  const m = Number(parts[1] ?? "0");
  return h * 60 + m;
}

/**
 * Checks whether a local time "HH:MM" falls inside the quiet hours window.
 * Returns false if quiet hours are disabled (`on === false`) or either boundary is null.
 */
export function inQuietHours(window: QuietHoursWindow, localHhmm: string): boolean {
  if (!window.on || window.start === null || window.end === null) return false;
  const t = minutesOf(localHhmm);
  const start = minutesOf(window.start);
  const end = minutesOf(window.end);
  return start <= end ? t >= start && t < end : t >= start || t < end;
}
