/**
 * Real local notifications (P-75): generic by default and identical whatever arrives (P-17, §5),
 * never a letter's words, each person's own categories, previews and quiet hours, reminders at
 * 09:00 in the person's own zone, and nothing until this phone is signed in and paired.
 */
import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { createDemoState, DEMO_ME_ID, DEMO_PARTNER_ID, type DemoState } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { GENERIC_NOTIFICATION } from "@/domain/notifications";
import { defaultSettings, type UserSettings } from "@/domain/settings";
import { arrivalIds, arrivals, MAX_SCHEDULED, scheduled } from "./plan";

const NOW = Temporal.Instant.from("2026-11-02T10:00:00Z");

function ready(settings: Partial<UserSettings> = {}): DemoState {
  const s = createDemoState();
  return {
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...s.profiles,
      byUser: {
        [DEMO_ME_ID]: { ...newProfile("Selam"), side: "ruby", timeZone: "Africa/Addis_Ababa" },
      },
    },
    settings: { ...s.settings, byUser: { [DEMO_ME_ID]: { ...defaultSettings(), ...settings } } },
  };
}

function withMessage(s: DemoState, text: string, at = NOW.subtract({ minutes: 1 })): DemoState {
  const base = s.chat.messages.find((m) => m.senderId === DEMO_PARTNER_ID);
  if (base === undefined) throw new Error("fixture has a partner message");
  return {
    ...s,
    chat: {
      ...s.chat,
      readUpTo: null,
      messages: [
        ...s.chat.messages,
        { ...base, id: "new-1", text, createdAt: at.toString(), reactions: [] },
      ],
    },
  };
}

function withEvent(s: DemoState, date: string): DemoState {
  const base = s.moments.events[0];
  if (base === undefined) throw new Error("fixture has an event");
  // A fixed date, not the fixture's "in N days".
  const rest: typeof base = { ...base };
  delete rest.inDays;
  return {
    ...s,
    moments: {
      ...s.moments,
      events: [
        {
          ...rest,
          id: "ev-1",
          title: "Dinner by the river",
          date,
          repeats: "none",
          reminders: ["day", "dayBefore"],
        },
      ],
    },
  };
}

function withLetter(s: DemoState, at: string): DemoState {
  const base = s.letters[0];
  if (base === undefined) throw new Error("fixture has a letter");
  return {
    ...s,
    letters: [
      {
        ...base,
        id: "l-1",
        authorId: DEMO_PARTNER_ID,
        recipientId: DEMO_ME_ID,
        state: "sealed",
        body: "SECRET LETTER WORDS",
        safePrompt: "you miss me",
        unlock: { type: "date", at },
        sealedAt: "2026-10-01T00:00:00Z",
        openedAt: null,
      },
    ],
  };
}

describe("notifications plan (P-75)", () => {
  it("does nothing until this phone is signed in and paired", () => {
    const s = createDemoState();
    expect(arrivals(s, NOW, new Set())).toEqual([]);
    expect(scheduled(s, NOW)).toEqual([]);
  });

  it("shows a new partner message once, generic by default", () => {
    const s = withMessage(ready(), "Miss you so much");
    const seen = new Set(arrivalIds(ready(), NOW));
    const shown = arrivals(s, NOW, seen);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({
      group: "messages",
      title: GENERIC_NOTIFICATION.title,
      body: GENERIC_NOTIFICATION.body,
      quiet: false,
    });
    expect(arrivals(s, NOW, new Set([...seen, "msg-new-1"]))).toEqual([]);
  });

  it("follows the person's own categories, previews and quiet hours", () => {
    const seen = new Set(arrivalIds(ready(), NOW));
    const off = withMessage(
      ready({ notify: { ...defaultSettings().notify, messages: "off" } }),
      "x",
    );
    expect(arrivals(off, NOW, seen)).toEqual([]);
    const full = withMessage(ready({ previews: "full" }), "See you soon");
    expect(arrivals(full, NOW, seen)[0]?.body).toContain("See you soon");
    // 13:00 in Addis Ababa falls inside 12:00–14:00 quiet hours.
    const quiet = withMessage(ready({ quiet: { on: true, start: "12:00", end: "14:00" } }), "x");
    expect(arrivals(quiet, NOW, seen)[0]?.quiet).toBe(true);
  });

  it("never puts a message's words on the lock screen unless previews are full", () => {
    const seen = new Set(arrivalIds(ready(), NOW));
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 30 }),
        fc.constantFrom("generic" as const, "sender" as const),
        (text, previews) => {
          const shown = arrivals(withMessage(ready({ previews }), `§${text}`), NOW, seen);
          expect(JSON.stringify(shown)).not.toContain("§");
        },
      ),
      { numRuns: 25 },
    );
  });

  it("schedules event reminders at 09:00 in the person's own zone", () => {
    const s = withEvent(ready({ previews: "full" }), "2026-11-10");
    const ev = scheduled(s, NOW).filter((n) => n.id.startsWith("event-ev-1"));
    // 09:00 in Addis Ababa (UTC+3) is 06:00 UTC: the day before, then the day itself.
    expect(ev.map((n) => n.at)).toEqual(["2026-11-09T06:00:00Z", "2026-11-10T06:00:00Z"]);
    expect(ev[0]?.title).toBe("Coming up: Dinner by the river");
    expect(ev[0]?.href).toBe("/moments/event/ev-1");
  });

  it("keeps reminders at 09:00 London time on both DST change days", () => {
    const london = (s: DemoState): DemoState => ({
      ...s,
      profiles: {
        ...s.profiles,
        byUser: {
          [DEMO_ME_ID]: { ...newProfile("Selam"), side: "ruby", timeZone: "Europe/London" },
        },
      },
    });
    const at = (date: string, now: string) =>
      scheduled(london(withEvent(ready(), date)), Temporal.Instant.from(now))
        .filter((n) => n.id.startsWith("event-ev-1") && n.id.endsWith("-day"))
        .map((n) => n.at);
    // Spring forward (29 March 2026): 09:00 BST is 08:00 UTC. Fall back (25 October): 09:00 GMT.
    expect(at("2026-03-29", "2026-03-20T00:00:00Z")).toEqual(["2026-03-29T08:00:00Z"]);
    expect(at("2026-10-25", "2026-10-20T00:00:00Z")).toEqual(["2026-10-25T09:00:00Z"]);
  });

  it("schedules a letter for its unlock time and never carries its words", () => {
    for (const previews of ["generic", "sender", "full"] as const) {
      const s = withLetter(ready({ previews }), "2026-11-05T18:00:00Z");
      const letter = scheduled(s, NOW).find((n) => n.id === "letter-l-1");
      expect(letter?.at).toBe("2026-11-05T18:00:00Z");
      expect(JSON.stringify(letter)).not.toContain("SECRET");
    }
  });

  it("schedules nothing in the past, soonest first, and at most a phone's worth", () => {
    const list = scheduled(withEvent(ready(), "2026-11-02"), NOW);
    expect(list.every((n) => Temporal.Instant.compare(Temporal.Instant.from(n.at), NOW) > 0)).toBe(
      true,
    );
    const ats = list.map((n) => Temporal.Instant.from(n.at).epochMilliseconds);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    expect(list.length).toBeLessThanOrEqual(MAX_SCHEDULED);
  });
});
