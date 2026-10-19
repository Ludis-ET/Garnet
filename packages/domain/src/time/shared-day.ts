import { Temporal } from "temporal-polyfill";

/**
 * Shared connection day (D-12, D-13).
 *
 * Both partners share ONE connection day. It is defined in a reference IANA time zone
 * (proposed: Europe/London) and starts at a configurable wall-clock cutoff. The server is the
 * authority for assigning instants to shared days; clients may use this module only to
 * preview or display.
 *
 * Conventions (P-03, needs review):
 * - A shared day is labelled with the reference-zone calendar date on which it BEGINS.
 *   With cutoff 04:00, shared day 2026-03-10 is [2026-03-10 04:00, 2026-03-11 04:00) London.
 * - If the cutoff wall time does not exist on a date (DST gap), the day begins at the
 *   transition — the first instant whose wall clock reads at or after the cutoff.
 * - If the cutoff wall time occurs twice on a date (DST overlap), the day begins at the
 *   first occurrence. This keeps day assignment monotonic in time.
 *
 * The cutoff itself is UNRESOLVED (U-02). This module intentionally exports no default cutoff.
 */

/** Wall-clock time of day, in the reference zone, at which each shared day begins. */
export interface CutoffTime {
  readonly hour: number;
  readonly minute: number;
}

export interface SharedDayConfig {
  /** Canonical IANA time zone identifier, e.g. "Europe/London". Never a fixed offset. */
  readonly referenceTimeZone: string;
  readonly cutoff: CutoffTime;
}

/** D-13 (proposed). The cutoff hour is not decided; see U-02. */
export const PROPOSED_REFERENCE_TIME_ZONE = "Europe/London";

export interface SharedDayWindow {
  /** Inclusive start instant. */
  readonly start: Temporal.Instant;
  /** Exclusive end instant (the next shared day's start). */
  readonly end: Temporal.Instant;
}

export interface ZonedSharedDayWindow {
  readonly start: Temporal.ZonedDateTime;
  readonly end: Temporal.ZonedDateTime;
}

const OFFSET_ID = /^[+-]\d{2}(:?\d{2})?$/;
const FIXED_OFFSET_ZONE = /^Etc\/GMT[+-]\d+$/i;

/**
 * Validates and normalises a shared-day configuration.
 * @throws RangeError for unknown zones, fixed-offset zones, or out-of-range cutoffs.
 */
export function createSharedDayConfig(input: {
  referenceTimeZone: string;
  cutoff: CutoffTime;
}): SharedDayConfig {
  const { referenceTimeZone, cutoff } = input;

  const trimmed = referenceTimeZone.trim();
  if (OFFSET_ID.test(trimmed) || FIXED_OFFSET_ZONE.test(trimmed)) {
    throw new RangeError(
      `Reference time zone must be a named IANA zone, not a fixed offset: "${referenceTimeZone}"`,
    );
  }
  // Throws RangeError for unknown identifiers and gives us the canonical id.
  const canonicalZone =
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(trimmed).timeZoneId;

  if (!Number.isInteger(cutoff.hour) || cutoff.hour < 0 || cutoff.hour > 23) {
    throw new RangeError(`Cutoff hour must be an integer 0–23, got ${cutoff.hour}`);
  }
  if (!Number.isInteger(cutoff.minute) || cutoff.minute < 0 || cutoff.minute > 59) {
    throw new RangeError(`Cutoff minute must be an integer 0–59, got ${cutoff.minute}`);
  }

  return Object.freeze({
    referenceTimeZone: canonicalZone,
    cutoff: Object.freeze({ hour: cutoff.hour, minute: cutoff.minute }),
  });
}

/** The instant at which the given shared day begins. */
export function startOfSharedDay(
  day: Temporal.PlainDate,
  config: SharedDayConfig,
): Temporal.Instant {
  const wall = day.toPlainDateTime({ hour: config.cutoff.hour, minute: config.cutoff.minute });
  const candidate = wall.toZonedDateTime(config.referenceTimeZone, { disambiguation: "earlier" });

  // Wall time exists (normal, or first occurrence of an overlap): this is the start.
  if (Temporal.PlainDateTime.compare(candidate.toPlainDateTime(), wall) === 0) {
    return candidate.toInstant();
  }

  // Wall time falls in a DST gap: the day begins at the transition out of the gap.
  const transition = candidate.getTimeZoneTransition("next");
  if (transition === null) {
    throw new Error(`No time zone transition found after a gap in ${config.referenceTimeZone}`);
  }
  return transition.toInstant();
}

/** The [start, end) instants of a shared day. */
export function sharedDayWindow(day: Temporal.PlainDate, config: SharedDayConfig): SharedDayWindow {
  return {
    start: startOfSharedDay(day, config),
    end: startOfSharedDay(day.add({ days: 1 }), config),
  };
}

/**
 * Assigns an instant to its shared day. Pure and deterministic; the server's call is
 * authoritative (§8: "The server calculates shared-day assignment").
 */
export function sharedDayOf(
  instant: Temporal.Instant,
  config: SharedDayConfig,
): Temporal.PlainDate {
  const localDate = instant.toZonedDateTimeISO(config.referenceTimeZone).toPlainDate();
  return Temporal.Instant.compare(instant, startOfSharedDay(localDate, config)) < 0
    ? localDate.subtract({ days: 1 })
    : localDate;
}

/**
 * The shared day's window expressed in a viewer's own zone, for display such as
 * "Today's shared day ends at 07:00 your time". Display only — never use for assignment.
 */
export function sharedDayWindowIn(
  day: Temporal.PlainDate,
  config: SharedDayConfig,
  viewerTimeZone: string,
): ZonedSharedDayWindow {
  const { start, end } = sharedDayWindow(day, config);
  return {
    start: start.toZonedDateTimeISO(viewerTimeZone),
    end: end.toZonedDateTimeISO(viewerTimeZone),
  };
}
