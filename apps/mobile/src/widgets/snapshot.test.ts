/**
 * Widget snapshot (P-72, P-73): the only thing home-screen widgets may read. It carries yes/no
 * flags, numbers, sides and zones, never words, names or titles (§5), and the part of the day
 * follows the wall clock through DST (ADR-0002).
 */
import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { createDemoState, DEMO_ME_ID, type DemoState } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import {
  buildWidgetSnapshot,
  dayPart,
  EMPTY_SNAPSHOT,
  parseWidgetSnapshot,
  WIDGET_SNAPSHOT_KEYS,
} from "./snapshot";

const NOW = Temporal.Instant.from("2026-10-28T17:30:00Z");

function signedIn(s: DemoState = createDemoState(), paired = true): DemoState {
  return {
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: {
      ...s.pairing,
      byUser: { [DEMO_ME_ID]: paired ? { ...EMPTY_PAIRING, partnerName: "Noah" } : EMPTY_PAIRING },
    },
    profiles: {
      ...s.profiles,
      byUser: {
        [DEMO_ME_ID]: { ...newProfile("Selam"), side: "ruby", timeZone: "Africa/Addis_Ababa" },
      },
    },
  };
}

/** Every free-text field in the demo, anywhere, replaced by `text`. */
const TEXT_KEYS = new Set([
  "body",
  "text",
  "title",
  "safePrompt",
  "caption",
  "note",
  "displayName",
  "nickname",
  "partnerName",
  "name",
]);
function withText(value: unknown, text: string): unknown {
  if (Array.isArray(value)) return value.map((v) => withText(v, text));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      typeof v === "string" && TEXT_KEYS.has(k) ? text : withText(v, text),
    ]),
  );
}

describe("widget snapshot (P-73)", () => {
  it("is empty until this phone is signed in and paired", () => {
    expect(buildWidgetSnapshot(createDemoState(), NOW)).toEqual(EMPTY_SNAPSHOT);
    expect(buildWidgetSnapshot(signedIn(createDemoState(), false), NOW)).toEqual(EMPTY_SNAPSHOT);
  });

  it("carries only the allowed fields, with sides, zones, flags and numbers", () => {
    const snap = buildWidgetSnapshot(signedIn(), NOW);
    expect(Object.keys(snap).sort()).toEqual([...WIDGET_SNAPSHOT_KEYS].sort());
    expect(snap).toMatchObject({ ready: true, mySide: "ruby", myZone: "Africa/Addis_Ababa" });
    // The demo has a sealed letter ready and unread notifications.
    expect(snap.waiting).toBe(true);
    expect(snap.somethingNew).toBe(true);
    expect(snap.km === null || snap.km % 100 === 0).toBe(true);
  });

  it("never carries any words from the app, whatever they are", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 3, maxLength: 24 }), (raw) => {
        const marker = `§${raw}§`;
        const s = signedIn(withText(createDemoState(), marker) as DemoState);
        const json = JSON.stringify(buildWidgetSnapshot(s, NOW));
        expect(json).not.toContain("§");
        expect(json).not.toContain("Noah");
      }),
      { numRuns: 25 },
    );
  });

  it("reads back only what it wrote, and falls back to empty on anything odd", () => {
    const snap = buildWidgetSnapshot(signedIn(), NOW);
    expect(parseWidgetSnapshot(JSON.stringify(snap))).toEqual(snap);
    expect(parseWidgetSnapshot(null)).toEqual(EMPTY_SNAPSHOT);
    expect(parseWidgetSnapshot("not json")).toEqual(EMPTY_SNAPSHOT);
    expect(parseWidgetSnapshot(JSON.stringify({ ...snap, myZone: "Mars/Olympus" }))).toEqual(
      EMPTY_SNAPSHOT,
    );
    const extra = parseWidgetSnapshot(JSON.stringify({ ...snap, letterBody: "secret" }));
    expect(JSON.stringify(extra)).not.toContain("secret");
  });
});

describe("dayPart (widgets plan §3)", () => {
  const at = (iso: string, zone: string) => dayPart(Temporal.Instant.from(iso), zone);

  it("follows London's wall clock across both DST changes", () => {
    // Spring forward, 29 March 2026: 04:30 UTC is 04:30 GMT the day before, 05:30 BST after.
    expect(at("2026-03-28T04:30:00Z", "Europe/London")).toBe("night");
    expect(at("2026-03-29T04:30:00Z", "Europe/London")).toBe("morning");
    // Fall back, 25 October 2026: 04:30 UTC is 05:30 BST the day before, 04:30 GMT after.
    expect(at("2026-10-24T04:30:00Z", "Europe/London")).toBe("morning");
    expect(at("2026-10-25T04:30:00Z", "Europe/London")).toBe("night");
  });

  it("shows Addis Ababa's own time (UTC+3, no DST)", () => {
    expect(at("2026-03-29T02:30:00Z", "Africa/Addis_Ababa")).toBe("morning");
    expect(at("2026-10-28T17:30:00Z", "Africa/Addis_Ababa")).toBe("evening");
    expect(at("2026-10-28T18:30:00Z", "Africa/Addis_Ababa")).toBe("night");
  });

  it("matches the local hour from Intl for any instant in either zone", () => {
    const start = Temporal.Instant.from("2026-01-01T00:00:00Z").epochMilliseconds;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 24 * 60 - 1 }),
        fc.constantFrom("Europe/London", "Africa/Addis_Ababa"),
        (minutes, zone) => {
          const ms = start + minutes * 60_000;
          const hour = Number(
            new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", hourCycle: "h23" })
              .formatToParts(ms)
              .find((p) => p.type === "hour")?.value,
          );
          const expected =
            hour >= 5 && hour < 11
              ? "morning"
              : hour >= 11 && hour < 17
                ? "day"
                : hour >= 17 && hour < 21
                  ? "evening"
                  : "night";
          expect(dayPart(Temporal.Instant.fromEpochMilliseconds(ms), zone)).toBe(expected);
        },
      ),
      { numRuns: 500 },
    );
  });
});
