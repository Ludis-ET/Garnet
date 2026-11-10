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
import { ALL_ZONES } from "./zoneList";
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

/**
 * The setup steps, in order (SETUP-02 to SETUP-07; SETUP-08 is the summary). "together" asks
 * when the two got together: one answer for the pair, whoever gives it first (P-79).
 */
export const SETUP_STEPS = ["name", "side", "photo", "time", "together", "look", "alerts"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Steps a person may skip; the rest need an answer before the summary. */
export const OPTIONAL_STEPS: ReadonlySet<SetupStep> = new Set<SetupStep>([
  "photo",
  "together",
  "look",
]);

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

/** The best-known cities, listed first in the picker (and each with a place on the map). */
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

/**
 * More cities people look for that aren't a time zone's own name: Ethiopia's and the UK's in
 * particular, and the world's biggest. Each points at its zone.
 */
export const MORE_CITIES: readonly ZoneOption[] = [
  { zone: "Africa/Addis_Ababa", city: "Bahir Dar", country: "Ethiopia" },
  { zone: "Africa/Addis_Ababa", city: "Mekelle", country: "Ethiopia" },
  { zone: "Africa/Addis_Ababa", city: "Hawassa", country: "Ethiopia" },
  { zone: "Africa/Addis_Ababa", city: "Gondar", country: "Ethiopia" },
  { zone: "Africa/Addis_Ababa", city: "Dire Dawa", country: "Ethiopia" },
  { zone: "Africa/Addis_Ababa", city: "Adama", country: "Ethiopia" },
  { zone: "Africa/Addis_Ababa", city: "Jimma", country: "Ethiopia" },
  { zone: "Europe/London", city: "Manchester", country: "United Kingdom" },
  { zone: "Europe/London", city: "Birmingham", country: "United Kingdom" },
  { zone: "Europe/London", city: "Leeds", country: "United Kingdom" },
  { zone: "Europe/London", city: "Liverpool", country: "United Kingdom" },
  { zone: "Europe/London", city: "Bristol", country: "United Kingdom" },
  { zone: "Europe/London", city: "Edinburgh", country: "United Kingdom" },
  { zone: "Europe/London", city: "Glasgow", country: "United Kingdom" },
  { zone: "Europe/London", city: "Cardiff", country: "United Kingdom" },
  { zone: "Europe/London", city: "Belfast", country: "United Kingdom" },
  { zone: "Europe/London", city: "Leicester", country: "United Kingdom" },
  { zone: "Europe/London", city: "Nottingham", country: "United Kingdom" },
  { zone: "Europe/London", city: "Sheffield", country: "United Kingdom" },
  { zone: "Europe/London", city: "Oxford", country: "United Kingdom" },
  { zone: "Europe/London", city: "Cambridge", country: "United Kingdom" },
  { zone: "Africa/Asmara", city: "Asmara", country: "Eritrea" },
  { zone: "Africa/Djibouti", city: "Djibouti", country: "Djibouti" },
  { zone: "Africa/Mogadishu", city: "Mogadishu", country: "Somalia" },
  { zone: "Africa/Khartoum", city: "Khartoum", country: "Sudan" },
  { zone: "Africa/Juba", city: "Juba", country: "South Sudan" },
  { zone: "Africa/Kampala", city: "Kampala", country: "Uganda" },
  { zone: "Africa/Kigali", city: "Kigali", country: "Rwanda" },
  { zone: "Africa/Dar_es_Salaam", city: "Dar es Salaam", country: "Tanzania" },
  { zone: "Africa/Accra", city: "Accra", country: "Ghana" },
  { zone: "Africa/Casablanca", city: "Casablanca", country: "Morocco" },
  { zone: "Africa/Algiers", city: "Algiers", country: "Algeria" },
  { zone: "Africa/Tunis", city: "Tunis", country: "Tunisia" },
  { zone: "Africa/Kinshasa", city: "Kinshasa", country: "DR Congo" },
  { zone: "Africa/Luanda", city: "Luanda", country: "Angola" },
  { zone: "Africa/Johannesburg", city: "Cape Town", country: "South Africa" },
  { zone: "Asia/Kolkata", city: "Delhi", country: "India" },
  { zone: "Asia/Kolkata", city: "Bengaluru", country: "India" },
  { zone: "Asia/Shanghai", city: "Beijing", country: "China" },
  { zone: "Asia/Shanghai", city: "Shanghai", country: "China" },
  { zone: "Asia/Hong_Kong", city: "Hong Kong", country: "China" },
  { zone: "Asia/Seoul", city: "Seoul", country: "South Korea" },
  { zone: "Asia/Manila", city: "Manila", country: "Philippines" },
  { zone: "Asia/Jakarta", city: "Jakarta", country: "Indonesia" },
  { zone: "Asia/Bangkok", city: "Bangkok", country: "Thailand" },
  { zone: "Asia/Karachi", city: "Karachi", country: "Pakistan" },
  { zone: "Asia/Dhaka", city: "Dhaka", country: "Bangladesh" },
  { zone: "Asia/Tehran", city: "Tehran", country: "Iran" },
  { zone: "Asia/Jerusalem", city: "Jerusalem", country: "Israel" },
  { zone: "Asia/Qatar", city: "Doha", country: "Qatar" },
  { zone: "Asia/Kuwait", city: "Kuwait City", country: "Kuwait" },
  { zone: "Asia/Riyadh", city: "Jeddah", country: "Saudi Arabia" },
  { zone: "Asia/Dubai", city: "Abu Dhabi", country: "United Arab Emirates" },
  { zone: "Europe/Madrid", city: "Madrid", country: "Spain" },
  { zone: "Europe/Amsterdam", city: "Amsterdam", country: "Netherlands" },
  { zone: "Europe/Brussels", city: "Brussels", country: "Belgium" },
  { zone: "Europe/Zurich", city: "Zurich", country: "Switzerland" },
  { zone: "Europe/Vienna", city: "Vienna", country: "Austria" },
  { zone: "Europe/Oslo", city: "Oslo", country: "Norway" },
  { zone: "Europe/Copenhagen", city: "Copenhagen", country: "Denmark" },
  { zone: "Europe/Helsinki", city: "Helsinki", country: "Finland" },
  { zone: "Europe/Warsaw", city: "Warsaw", country: "Poland" },
  { zone: "Europe/Athens", city: "Athens", country: "Greece" },
  { zone: "Europe/Lisbon", city: "Lisbon", country: "Portugal" },
  { zone: "Europe/Moscow", city: "Moscow", country: "Russia" },
  { zone: "Europe/Kyiv", city: "Kyiv", country: "Ukraine" },
  { zone: "America/New_York", city: "Washington", country: "United States" },
  { zone: "America/New_York", city: "Boston", country: "United States" },
  { zone: "America/New_York", city: "Atlanta", country: "United States" },
  { zone: "America/New_York", city: "Miami", country: "United States" },
  { zone: "America/Chicago", city: "Houston", country: "United States" },
  { zone: "America/Chicago", city: "Dallas", country: "United States" },
  { zone: "America/Denver", city: "Denver", country: "United States" },
  { zone: "America/Phoenix", city: "Phoenix", country: "United States" },
  { zone: "America/Los_Angeles", city: "San Francisco", country: "United States" },
  { zone: "America/Los_Angeles", city: "Seattle", country: "United States" },
  { zone: "America/Los_Angeles", city: "Las Vegas", country: "United States" },
  { zone: "America/Vancouver", city: "Vancouver", country: "Canada" },
  { zone: "America/Toronto", city: "Ottawa", country: "Canada" },
  { zone: "America/Toronto", city: "Montreal", country: "Canada" },
  { zone: "America/Edmonton", city: "Calgary", country: "Canada" },
  { zone: "America/Mexico_City", city: "Mexico City", country: "Mexico" },
  { zone: "America/Bogota", city: "Bogotá", country: "Colombia" },
  { zone: "America/Lima", city: "Lima", country: "Peru" },
  { zone: "America/Santiago", city: "Santiago", country: "Chile" },
  { zone: "America/Argentina/Buenos_Aires", city: "Buenos Aires", country: "Argentina" },
  { zone: "America/Sao_Paulo", city: "Rio de Janeiro", country: "Brazil" },
  { zone: "Australia/Melbourne", city: "Melbourne", country: "Australia" },
  { zone: "Australia/Brisbane", city: "Brisbane", country: "Australia" },
  { zone: "Australia/Perth", city: "Perth", country: "Australia" },
  { zone: "Pacific/Auckland", city: "Auckland", country: "New Zealand" },
];

/** Where a zone is, for zones with no listed city: its region from the zone's name. */
const REGIONS: Readonly<Record<string, string>> = {
  Africa: "Africa",
  America: "Americas",
  Antarctica: "Antarctica",
  Arctic: "Arctic",
  Asia: "Asia",
  Atlantic: "Atlantic Ocean",
  Australia: "Australia",
  Europe: "Europe",
  Indian: "Indian Ocean",
  Pacific: "Pacific Ocean",
};

/**
 * Every place the picker offers: the best-known cities, more cities, then every other IANA zone
 * by its own city (ADR-0002), so anywhere in the world can be chosen.
 */
export const ALL_PLACES: readonly ZoneOption[] = (() => {
  const named = [...ZONES, ...MORE_CITIES];
  const covered = new Set(named.map((z) => z.zone));
  const rest = ALL_ZONES.filter((z) => !covered.has(z)).map((zone) => {
    const parts = zone.split("/");
    const region = parts[0] ?? "";
    return {
      zone,
      city: (parts[parts.length - 1] ?? zone).replace(/_/g, " "),
      country: REGIONS[region] ?? region,
    };
  });
  rest.sort((a, b) => a.city.localeCompare(b.city));
  return [...named, ...rest];
})();

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
  const q = fold(query.trim());
  if (q.length === 0) return [...ALL_PLACES];
  // Cities whose name starts with the search come first, then any other match.
  const starts: ZoneOption[] = [];
  const others: ZoneOption[] = [];
  for (const z of ALL_PLACES) {
    const city = fold(z.city);
    if (city.startsWith(q)) starts.push(z);
    else if (
      city.includes(q) ||
      fold(z.country).includes(q) ||
      fold(z.zone.replace(/_/g, " ")).includes(q)
    )
      others.push(z);
  }
  return [...starts, ...others];
}

/** Lower case without accents, so "sao paulo" finds São Paulo and "bogota" Bogotá. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
