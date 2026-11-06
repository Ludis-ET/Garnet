/**
 * Great-circle distance and location coarsening (P-64, P-66).
 *
 * Garnet only ever holds approximate points (~0.1°, roughly 11 km) to calculate
 * distance between partners; exact coordinates are never stored or shared (§5).
 */

export interface Point {
  lat: number;
  lon: number;
}

export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  zone: string;
}

export const CITIES: readonly City[] = Object.freeze([
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
]);

const EARTH_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rounded to 0.1°, about 11 km (P-66). */
export function coarsen(lat: number, lon: number): Point {
  const r = (n: number) => Math.round(n * 10) / 10;
  return { lat: r(lat), lon: r(lon) };
}

/** The city that stands in for a time zone, if known. */
export function zonePoint(zone: string): Point | null {
  const c = CITIES.find((x) => x.zone === zone);
  return c === undefined ? null : { lat: c.lat, lon: c.lon };
}
