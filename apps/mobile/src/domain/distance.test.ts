import fc from "fast-check";
import { ZONES } from "./identity";
import { CITIES, distanceKm, flightHint, formatKm } from "./distance";
import { coarsen, zonePoint } from "./location";

const london = zonePoint("Europe/London");
const addis = zonePoint("Africa/Addis_Ababa");

describe("distance between the two cities (P-64, P-66)", () => {
  it("London to Addis Ababa is about 5,900 km", () => {
    if (london === null || addis === null) throw new Error("missing city");
    const km = distanceKm(london, addis);
    expect(km).toBeGreaterThan(5850);
    expect(km).toBeLessThan(5950);
    expect(formatKm(km)).toMatch(/^5,9\d0$/);
  });

  it("has a city for every time zone the app offers", () => {
    for (const z of ZONES) expect(CITIES.some((c) => c.zone === z.zone)).toBe(true);
  });

  it("is symmetric, never negative, zero for the same place and at most half the globe", () => {
    const point = fc.record({
      lat: fc.double({ min: -90, max: 90, noNaN: true }),
      lon: fc.double({ min: -180, max: 180, noNaN: true }),
    });
    fc.assert(
      fc.property(point, point, (a, b) => {
        const ab = distanceKm(a, b);
        expect(ab).toBeGreaterThanOrEqual(0);
        expect(ab).toBeLessThanOrEqual(20_016);
        expect(Math.abs(ab - distanceKm(b, a))).toBeLessThan(1e-6);
        expect(distanceKm(a, a)).toBeLessThan(1e-6);
      }),
      { numRuns: 300 },
    );
  });

  it("formats with thousands separators, rounded to 10 km", () => {
    expect(formatKm(5913.4)).toBe("5,910");
    expect(formatKm(12_345)).toBe("12,350");
    expect(formatKm(4)).toBe("0");
  });

  it("gives a gentle sense of it", () => {
    expect(flightHint(120)).toBe("a short trip away");
    expect(flightHint(5913)).toBe("about 8 h by plane");
  });

  it("keeps only a rounded position (about 11 km), never the exact one (P-66)", () => {
    expect(coarsen(9.03456, 38.74321)).toEqual({ lat: 9, lon: 38.7 });
    expect(coarsen(51.5074, -0.1278)).toEqual({ lat: 51.5, lon: -0.1 });
    expect(zonePoint("Nowhere/Unknown")).toBeNull();
  });
});
