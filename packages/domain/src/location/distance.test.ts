import { describe, expect, it } from "vitest";
import { coarsen, distanceKm, zonePoint } from "./distance";

describe("distance & location coarsening (P-64, P-66)", () => {
  it("coarsens coordinates to 0.1 degree resolution (~11 km)", () => {
    const raw = { lat: 9.032145, lon: 38.742391 };
    const coarsened = coarsen(raw.lat, raw.lon);
    expect(coarsened.lat).toBe(9.0);
    expect(coarsened.lon).toBe(38.7);
  });

  it("calculates great-circle distance between London and Addis Ababa (~5,900 km)", () => {
    const addis = zonePoint("Africa/Addis_Ababa");
    const london = zonePoint("Europe/London");
    expect(addis).not.toBeNull();
    expect(london).not.toBeNull();
    if (addis && london) {
      const km = distanceKm(addis, london);
      expect(Math.round(km)).toBeGreaterThan(5800);
      expect(Math.round(km)).toBeLessThan(6000);
    }
  });

  it("returns 0 for identical points", () => {
    const p = { lat: 51.5, lon: -0.1 };
    expect(Math.round(distanceKm(p, p))).toBe(0);
  });
});
