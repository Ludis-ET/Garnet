/**
 * Identity and setup rules for SETUP-01 to SETUP-08. Pure: no React, no I/O.
 *
 * - Sides (P-51, owner direction for U-22): each partner chooses Ruby or Sapphire, and the two
 *   can never hold the same side. The first choice locks that side for the other person; the
 *   server (here the mock) is the authority, never last-writer-wins.
 * - Name limits are a proposal (P-52), so the policy is a required parameter with no default.
 * - Time (ADR-0002): IANA zones and Temporal; offsets come from the zone database, never from
 *   "+N hours" maths, and a zone's daylight saving is detected, not assumed.
 */
import { Temporal } from "temporal-polyfill";

export type GemSide = "ruby" | "sapphire";
export const GEM_SIDES: readonly GemSide[] = ["ruby", "sapphire"];

export function otherSide(side: GemSide): GemSide {
  return side === "ruby" ? "sapphire" : "ruby";
}

/** A side is free unless the partner already holds it (P-51). */
export function isSideAvailable(side: GemSide, partnerSide: GemSide | null): boolean {
  return partnerSide !== side;
}

/** The setup steps, in order (SETUP-02 to SETUP-07; SETUP-08 is the summary). */
export const SETUP_STEPS = ["name", "side", "photo", "time", "look", "alerts"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Steps a person may skip; the rest need an answer before the summary. */
export const OPTIONAL_STEPS: ReadonlySet<SetupStep> = new Set<SetupStep>(["photo", "look"]);

export interface NamePolicy {
  maxDisplayName: number;
  maxNickname: number;
}

/** P-52 (proposed): display names 1–40 characters, nicknames up to 30. */
export const NAME_POLICY_P52: NamePolicy = { maxDisplayName: 40, maxNickname: 30 };

export type NameError = "required" | "too-long";

function length(text: string): number {
  return Array.from(text.trim()).length;
}

export function displayNameError(name: string, policy: NamePolicy): NameError | null {
  const n = length(name);
  if (n === 0) return "required";
  return n > policy.maxDisplayName ? "too-long" : null;
}

export function nicknameError(nickname: string, policy: NamePolicy): NameError | null {
  return length(nickname) > policy.maxNickname ? "too-long" : null;
}

export function nameErrorMessage(error: NameError, max: number): string {
  return error === "required" ? "Please fill this in." : `Keep it to ${max} characters or fewer.`;
}

/** What the partner calls this person: the nickname when set, else the display name. */
export function calledName(displayName: string, nickname: string): string {
  return nickname.trim().length > 0 ? nickname.trim() : displayName.trim();
}

/** The in-app greeting preview (SETUP-02). Lock-screen previews stay generic (P-17). */
export function greetingPreview(displayName: string, nickname: string): string {
  return `A little thought from ${calledName(displayName, nickname)}.`;
}

// ---- Time zones (ADR-0002) ----

export interface ZoneOption {
  zone: string;
  city: string;
  country: string;
}

/** A short list for the prototype's picker; a real build uses the full IANA list. */
export const ZONES: readonly ZoneOption[] = [
  { zone: "Africa/Addis_Ababa", city: "Addis Ababa", country: "Ethiopia" },
  { zone: "Europe/London", city: "London", country: "United Kingdom" },
  { zone: "Africa/Nairobi", city: "Nairobi", country: "Kenya" },
  { zone: "Africa/Cairo", city: "Cairo", country: "Egypt" },
  { zone: "Africa/Lagos", city: "Lagos", country: "Nigeria" },
  { zone: "Africa/Johannesburg", city: "Johannesburg", country: "South Africa" },
  { zone: "Europe/Dublin", city: "Dublin", country: "Ireland" },
  { zone: "Europe/Paris", city: "Paris", country: "France" },
  { zone: "Europe/Berlin", city: "Berlin", country: "Germany" },
  { zone: "Europe/Rome", city: "Rome", country: "Italy" },
  { zone: "Europe/Stockholm", city: "Stockholm", country: "Sweden" },
  { zone: "Europe/Istanbul", city: "Istanbul", country: "Türkiye" },
  { zone: "Asia/Dubai", city: "Dubai", country: "United Arab Emirates" },
  { zone: "Asia/Riyadh", city: "Riyadh", country: "Saudi Arabia" },
  { zone: "Asia/Kolkata", city: "Mumbai", country: "India" },
  { zone: "Asia/Singapore", city: "Singapore", country: "Singapore" },
  { zone: "Asia/Tokyo", city: "Tokyo", country: "Japan" },
  { zone: "Australia/Sydney", city: "Sydney", country: "Australia" },
  { zone: "America/New_York", city: "New York", country: "United States" },
  { zone: "America/Chicago", city: "Chicago", country: "United States" },
  { zone: "America/Los_Angeles", city: "Los Angeles", country: "United States" },
  { zone: "America/Toronto", city: "Toronto", country: "Canada" },
  { zone: "America/Sao_Paulo", city: "São Paulo", country: "Brazil" },
];

/** The city for a zone: from the list, else the zone's last segment ("America/Port_of_Spain"). */
export function cityForZone(zone: string): string {
  const known = ZONES.find((z) => z.zone === zone);
  if (known !== undefined) return known.city;
  const last = zone.split("/").pop() ?? zone;
  return last.replace(/_/g, " ");
}

/** "GMT+3", "GMT+5:30", "GMT−3" or "GMT", from the zone database at that instant. */
export function offsetLabel(zone: string, at: Temporal.Instant): string {
  const offset = at.toZonedDateTimeISO(zone).offset; // "+03:00"
  const m = /^([+-])(\d{2}):(\d{2})/.exec(offset);
  if (m === null) return "GMT";
  const [, sign, hh, mm] = m;
  const hours = Number(hh);
  const minutes = Number(mm);
  if (hours === 0 && minutes === 0) return "GMT";
  return `GMT${sign === "-" ? "−" : "+"}${hours}${minutes === 0 ? "" : `:${mm ?? "00"}`}`;
}

/** "09:03" in that zone (24-hour). */
export function localTimeLabel(at: Temporal.Instant, zone: string): string {
  const t = at.toZonedDateTimeISO(zone);
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

/** Whether a zone changes its clocks in that year (offset differs between January and July). */
export function hasDaylightSaving(zone: string, year: number): boolean {
  const jan = Temporal.Instant.from(`${year}-01-15T12:00:00Z`).toZonedDateTimeISO(zone);
  const jul = Temporal.Instant.from(`${year}-07-15T12:00:00Z`).toZonedDateTimeISO(zone);
  return jan.offsetNanoseconds !== jul.offsetNanoseconds;
}

/** Case-insensitive search by city, country or zone id; empty query lists everything. */
export function searchZones(query: string): ZoneOption[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...ZONES];
  return ZONES.filter(
    (z) =>
      z.city.toLowerCase().includes(q) ||
      z.country.toLowerCase().includes(q) ||
      z.zone.toLowerCase().replace(/_/g, " ").includes(q),
  );
}

/** A zone the runtime knows; anything else falls back to UTC rather than guessing. */
export function isKnownZone(zone: string): boolean {
  try {
    Temporal.Instant.from("2026-01-01T00:00:00Z").toZonedDateTimeISO(zone);
    return true;
  } catch {
    return false;
  }
}
