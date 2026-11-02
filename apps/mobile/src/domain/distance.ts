/**
 * How far apart the two of you are (P-64, P-66): great-circle kilometres between two rounded
 * points (domain/location.ts), shown rounded to 10 km. Cities stand in for a time zone when
 * there is no location.
 */

export interface City {
  name: string;
  country: string;
  /** Degrees, city centre. */
  lat: number;
  lon: number;
  /** The time zone it stands in for. */
  zone: string;
}

/** One city per supported time zone (identity ZONES), plus a few more big ones. */
export const CITIES: readonly City[] = [
  { name: "Addis Ababa", country: "Ethiopia", lat: 9.03, lon: 38.74, zone: "Africa/Addis_Ababa" },
  { name: "London", country: "United Kingdom", lat: 51.507, lon: -0.128, zone: "Europe/London" },
  { name: "Manchester", country: "United Kingdom", lat: 53.48, lon: -2.242, zone: "Europe/London" },
  { name: "Edinburgh", country: "United Kingdom", lat: 55.953, lon: -3.188, zone: "Europe/London" },
  { name: "Nairobi", country: "Kenya", lat: -1.286, lon: 36.817, zone: "Africa/Nairobi" },
  { name: "Cairo", country: "Egypt", lat: 30.044, lon: 31.236, zone: "Africa/Cairo" },
  { name: "Lagos", country: "Nigeria", lat: 6.524, lon: 3.379, zone: "Africa/Lagos" },
  {
    name: "Johannesburg",
    country: "South Africa",
    lat: -26.204,
    lon: 28.047,
    zone: "Africa/Johannesburg",
  },
  { name: "Dublin", country: "Ireland", lat: 53.35, lon: -6.26, zone: "Europe/Dublin" },
  { name: "Paris", country: "France", lat: 48.857, lon: 2.352, zone: "Europe/Paris" },
  { name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405, zone: "Europe/Berlin" },
  { name: "Rome", country: "Italy", lat: 41.903, lon: 12.496, zone: "Europe/Rome" },
  { name: "Stockholm", country: "Sweden", lat: 59.329, lon: 18.069, zone: "Europe/Stockholm" },
  { name: "Istanbul", country: "Türkiye", lat: 41.008, lon: 28.978, zone: "Europe/Istanbul" },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.205, lon: 55.271, zone: "Asia/Dubai" },
  { name: "Riyadh", country: "Saudi Arabia", lat: 24.713, lon: 46.675, zone: "Asia/Riyadh" },
  { name: "Mumbai", country: "India", lat: 19.076, lon: 72.878, zone: "Asia/Kolkata" },
  { name: "Singapore", country: "Singapore", lat: 1.352, lon: 103.82, zone: "Asia/Singapore" },
  { name: "Tokyo", country: "Japan", lat: 35.676, lon: 139.65, zone: "Asia/Tokyo" },
  { name: "Sydney", country: "Australia", lat: -33.869, lon: 151.209, zone: "Australia/Sydney" },
  {
    name: "New York",
    country: "United States",
    lat: 40.713,
    lon: -74.006,
    zone: "America/New_York",
  },
  { name: "Chicago", country: "United States", lat: 41.878, lon: -87.63, zone: "America/Chicago" },
  {
    name: "Los Angeles",
    country: "United States",
    lat: 34.052,
    lon: -118.244,
    zone: "America/Los_Angeles",
  },
  { name: "Toronto", country: "Canada", lat: 43.653, lon: -79.383, zone: "America/Toronto" },
  { name: "São Paulo", country: "Brazil", lat: -23.551, lon: -46.633, zone: "America/Sao_Paulo" },
];

const EARTH_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: Pick<City, "lat" | "lon">, b: Pick<City, "lat" | "lon">): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "5,910" (rounded to 10 km, grouped by thousands without relying on Intl). */
export function formatKm(km: number): string {
  const rounded = Math.round(km / 10) * 10;
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A friendly sense of the distance: "about 7 h by plane" (≈ 800 km/h plus an hour). */
export function flightHint(km: number): string {
  if (km < 300) return "a short trip away";
  const hours = Math.max(1, Math.round(km / 800 + 1));
  return `about ${String(hours)} h by plane`;
}
