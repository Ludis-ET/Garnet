/**
 * Location for "how far apart" (owner direction P-66). The phone's position is rounded before it
 * is kept, so Garnet only ever holds "about where" (0.1°, roughly 11 km): enough for a distance,
 * never an address. When there is no location (permission off, or on a device without it), the
 * person's time-zone city stands in, and the distance says it's approximate.
 */
import { CITIES } from "./distance";

export interface Point {
  lat: number;
  lon: number;
}

/** Rounded to 0.1°, about 11 km. */
export function coarsen(lat: number, lon: number): Point {
  const r = (n: number) => Math.round(n * 10) / 10;
  return { lat: r(lat), lon: r(lon) };
}

/** The city that stands in for a time zone, if the app knows one. */
export function zonePoint(zone: string): Point | null {
  const c = CITIES.find((x) => x.zone === zone);
  return c === undefined ? null : { lat: c.lat, lon: c.lon };
}
