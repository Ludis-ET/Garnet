import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID, DEMO_PARTNER_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

/** Selam (Addis Ababa) at 14:00 local, paired with Noah and set up. */
function home(at = "2026-10-22T11:00:00Z") {
  const clock = Temporal.Instant.from(at);
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...s.profiles,
      byUser: {
        [DEMO_ME_ID]: {
          ...newProfile("Selam"),
          nickname: "Sel",
          side: "ruby",
          timeZone: "Africa/Addis_Ababa",
          complete: true,
        },
      },
    },
  }));
  const repos = createMockRepositories(store, () => clock);
  return { store, home: repos.home };
}

describe("mock home (HOME-01 to HOME-05)", () => {
  it("shows only today's own moments that already happened, newest first", async () => {
    const { home: h } = home(); // 14:00 in Addis
    const today = await h.today();
    expect(today.me).toMatchObject({ name: "Sel", side: "ruby", zone: "Africa/Addis_Ababa" });
    expect(today.moments.map((m) => m.text)).toEqual([
      "Lunch by the window",
      "This meeting is taking forever",
      "The sky over Bole this morning",
      "Arrived at work",
      "First coffee",
    ]);
    const early = await home("2026-10-22T05:30:00Z").home.today(); // 08:30
    expect(early.moments.map((m) => m.text)).toEqual(["First coffee"]);
  });

  it("never shows the partner's moments (the partner's day waits for the reveal, U-02)", async () => {
    const { store, home: h } = home();
    store.update((s) => ({
      ...s,
      days: {
        ...s.days,
        entries: [
          ...s.days.entries,
          {
            id: "noah-1",
            authorId: DEMO_PARTNER_ID,
            text: "Noah's private thing",
            emoji: "🔒",
            kind: "text",
            dayOffset: 0,
            localTime: "10:00",
            at: null,
            visibility: "private",
          },
          {
            id: "noah-2",
            authorId: DEMO_PARTNER_ID,
            text: "Noah's shared thing",
            emoji: "🌧",
            kind: "text",
            dayOffset: 0,
            localTime: "10:30",
            at: null,
            visibility: "shared",
          },
        ],
      },
    }));
    const text = JSON.stringify(await h.today());
    expect(text).not.toContain("Noah's private thing");
    expect(text).not.toContain("Noah's shared thing");
  });

  it("keeps a new moment private unless the person shares it (day-log rule 2)", async () => {
    const { home: h } = home();
    const kept = await h.logMoment({ text: " A quiet walk ", emoji: "🚇", share: false });
    const shared = await h.logMoment({ text: "Sunset", emoji: "📸", share: true });
    expect(kept).toMatchObject({ text: "A quiet walk", visibility: "private" });
    expect(shared.visibility).toBe("shared");
    expect(
      (await h.today()).moments
        .slice(0, 2)
        .map((m) => m.text)
        .sort(),
    ).toEqual(["A quiet walk", "Sunset"]);
  });

  it("flags a waiting letter with no content (A9) and finds the next event", async () => {
    const { home: h } = home();
    const today = await h.today();
    expect(today.waiting).toBe(true);
    expect(JSON.stringify(today)).not.toMatch(
      /Demo letter body|bench by the river|Open when you miss me/,
    );
    // The soonest event from Events: the movie night five days out.
    expect(today.event).toEqual({
      id: "e-movie",
      kind: "date",
      title: "Movie night on call",
      emoji: "🍿",
      date: "2026-10-27",
      daysAway: 5,
    });
  });

  it("lets characters reflect only the partner's shared feelings, never drafts (P-57, §4)", async () => {
    const { store, home: h } = home();
    const at = new Date(Date.parse("2026-10-22T10:30:00Z")).toISOString();
    store.update((s) => ({
      ...s,
      days: {
        ...s.days,
        entries: [
          ...s.days.entries.filter((e) => e.mood === undefined),
          {
            id: "n-low",
            authorId: DEMO_PARTNER_ID,
            kind: "feeling",
            text: "private",
            emoji: "🌧️",
            mood: "low",
            dayOffset: 0,
            localTime: null,
            at,
            visibility: "private",
          },
        ],
      },
    }));
    expect((await h.today()).companions.partner.feeling).toBeNull();
    store.update((s) => ({
      ...s,
      days: {
        ...s.days,
        entries: s.days.entries.map((e) =>
          e.id === "n-low" ? { ...e, visibility: "shared" as const } : e,
        ),
      },
    }));
    expect((await h.today()).companions.partner.feeling).toBe("low");
  });

  it("shows nothing waiting when no letter can be opened yet", async () => {
    const { store, home: h } = home();
    store.update((s) => ({ ...s, letters: s.letters.filter((l) => l.unlock.type !== "manual") }));
    expect((await h.today()).waiting).toBe(false);
  });

  it("records a sent signal as sent, and nothing about delivery or reading (§5)", async () => {
    const { store, home: h } = home();
    const before = store.read().home.sent.length;
    const result = await h.sendSignal("missing-you");
    expect(Object.keys(result)).toEqual(["sentAt"]);
    expect(store.read().home.sent).toHaveLength(before + 1);
    expect(JSON.stringify(store.read().home)).not.toMatch(/delivered|seen|read/i);
  });

  it("shows the partner's latest signal until dismissed on this phone", async () => {
    const { store, home: h } = home();
    store.update((s) => ({
      ...s,
      home: {
        ...s.home,
        incoming: [{ id: "in-1", signal: "thought-of-you", at: "2026-10-22T10:00:00Z" }],
      },
    }));
    expect((await h.today()).incoming).toEqual({ id: "in-1", signal: "thought-of-you" });
    await h.dismissIncoming("in-1");
    expect((await h.today()).incoming).toBeNull();
  });

  it("counts the partner as using the app only once paired and set up (P-63)", async () => {
    const { store, home: h } = home();
    expect((await h.today()).partnerActive).toBe(false); // paired, Noah still setting up
    store.update((s) => ({
      ...s,
      profiles: { ...s.profiles, partner: { ...s.profiles.partner, ready: true } },
    }));
    expect((await h.today()).partnerActive).toBe(true);
    store.update((s) => ({
      ...s,
      pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: EMPTY_PAIRING } },
    }));
    expect((await h.today()).partnerActive).toBe(false);
  });
});
