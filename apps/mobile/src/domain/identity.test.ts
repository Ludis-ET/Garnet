import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import {
  calledName,
  cityForZone,
  displayNameError,
  GEM_SIDES,
  greetingPreview,
  hasDaylightSaving,
  isKnownZone,
  isSideAvailable,
  localTimeLabel,
  NAME_POLICY_P52,
  nicknameError,
  offsetLabel,
  otherSide,
  searchZones,
  ZONES,
} from "./identity";

const policy = NAME_POLICY_P52; // P-52 (proposed): 40 / 30 characters

describe("sides (P-51, owner direction for U-22)", () => {
  it("pairs each side with the other", () => {
    expect(otherSide("ruby")).toBe("sapphire");
    expect(otherSide("sapphire")).toBe("ruby");
  });

  it("frees every side until the partner holds one, then only the other", () => {
    for (const side of GEM_SIDES) expect(isSideAvailable(side, null)).toBe(true);
    expect(isSideAvailable("ruby", "ruby")).toBe(false);
    expect(isSideAvailable("sapphire", "ruby")).toBe(true);
  });

  it("never lets two partners hold the same side, whatever order they choose in (property)", () => {
    const side = fc.constantFrom(...GEM_SIDES);
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.constantFrom("a", "b"), side), { maxLength: 12 }),
        (choices) => {
          // A tiny model of the server rule: a choice is accepted only if the other doesn't hold it.
          const held: Record<"a" | "b", (typeof GEM_SIDES)[number] | null> = { a: null, b: null };
          for (const [who, pick] of choices) {
            const other = who === "a" ? held.b : held.a;
            if (isSideAvailable(pick, other)) held[who] = pick;
          }
          if (held.a !== null && held.b !== null) expect(held.a).not.toBe(held.b);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("names (P-52, proposed)", () => {
  it("needs a display name within the limit, counting characters not bytes", () => {
    expect(displayNameError("  ", policy)).toBe("required");
    expect(displayNameError("Selam", policy)).toBeNull();
    expect(displayNameError("ሰ".repeat(40), policy)).toBeNull();
    expect(displayNameError("a".repeat(41), policy)).toBe("too-long");
    expect(nicknameError("", policy)).toBeNull();
    expect(nicknameError("b".repeat(31), policy)).toBe("too-long");
  });

  it("uses the nickname when there is one, in the in-app preview", () => {
    expect(calledName("Selam", "  ")).toBe("Selam");
    expect(calledName("Selam", " Sel ")).toBe("Sel");
    expect(greetingPreview("Selam", "Sel")).toBe("A little thought from Sel.");
  });
});

describe("time zones (ADR-0002)", () => {
  const winter = Temporal.Instant.from("2026-01-15T06:03:00Z");
  const summer = Temporal.Instant.from("2026-07-15T06:03:00Z");

  it("labels offsets from the zone database, including London's two offsets", () => {
    expect(offsetLabel("Africa/Addis_Ababa", winter)).toBe("GMT+3");
    expect(offsetLabel("Africa/Addis_Ababa", summer)).toBe("GMT+3");
    expect(offsetLabel("Europe/London", winter)).toBe("GMT");
    expect(offsetLabel("Europe/London", summer)).toBe("GMT+1");
    expect(offsetLabel("Asia/Kolkata", winter)).toBe("GMT+5:30");
    expect(offsetLabel("America/Sao_Paulo", winter)).toBe("GMT−3");
  });

  it("shows each person's local time (the SETUP-05 example row)", () => {
    expect(localTimeLabel(winter, "Africa/Addis_Ababa")).toBe("09:03");
    expect(localTimeLabel(winter, "Europe/London")).toBe("06:03");
    expect(localTimeLabel(summer, "Europe/London")).toBe("07:03");
  });

  it("detects daylight saving per zone and year", () => {
    expect(hasDaylightSaving("Europe/London", 2026)).toBe(true);
    expect(hasDaylightSaving("Africa/Addis_Ababa", 2026)).toBe(false);
  });

  it("follows the London clock change (Addis–London gap is 3 h in winter, 2 h in summer)", () => {
    const gap = (at: Temporal.Instant) =>
      (at.toZonedDateTimeISO("Africa/Addis_Ababa").offsetNanoseconds -
        at.toZonedDateTimeISO("Europe/London").offsetNanoseconds) /
      3.6e12;
    expect(gap(winter)).toBe(3);
    expect(gap(summer)).toBe(2);
    // Around the 2026-10-25 change, one minute apart.
    expect(offsetLabel("Europe/London", Temporal.Instant.from("2026-10-25T00:59:00Z"))).toBe(
      "GMT+1",
    );
    expect(offsetLabel("Europe/London", Temporal.Instant.from("2026-10-25T01:00:00Z"))).toBe("GMT");
  });

  it("searches by city, country or zone, and names unknown zones from their id", () => {
    expect(searchZones("addis").map((z) => z.zone)).toEqual(["Africa/Addis_Ababa"]);
    expect(searchZones("united kingdom").map((z) => z.city)).toEqual(["London"]);
    expect(searchZones("new york").map((z) => z.zone)).toEqual(["America/New_York"]);
    expect(searchZones("zzzz")).toEqual([]);
    expect(searchZones("")).toHaveLength(ZONES.length);
    expect(cityForZone("America/Port_of_Spain")).toBe("Port of Spain");
  });

  it("knows every zone in the picker, and rejects made-up ones", () => {
    for (const z of ZONES) expect(isKnownZone(z.zone)).toBe(true);
    expect(isKnownZone("Mars/Olympus_Mons")).toBe(false);
  });
});
