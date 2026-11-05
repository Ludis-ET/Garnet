import { AGE_CHECK_ZONE } from "@garnet/contracts";

/**
 * Today's date (YYYY-MM-DD) where the day starts first (P-79): someone who is 16 anywhere on
 * Earth today passes the age check. From the zone database, never offset arithmetic (ADR-0002).
 */
export function ageCheckToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AGE_CHECK_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
