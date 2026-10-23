/**
 * Days and Us mocks: privacy first. Noah's private drafts never appear anywhere; his "after our
 * days meet" moments only once a day is revealed; nothing counts or claims "seen" (§5).
 * Uses the PROVISIONAL day policy (U-02, U-06 open: 04:00 London, recap when both are ready).
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

/** Thursday 22 Oct 2026, 20:00 in Addis (17:00 London). */
function setUp(at = "2026-10-22T17:00:00Z") {
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
          side: "ruby",
          timeZone: "Africa/Addis_Ababa",
          complete: true,
        },
      },
      partner: { ...s.profiles.partner, side: "sapphire" },
    },
  }));
  const repos = createMockRepositories(store, () => clock);
  return { store, days: repos.days, us: repos.us };
}

describe("mock days (DAYS-01 to DAYS-11)", () => {
  it("never leaks a partner's private draft or unrevealed moment, anywhere", async () => {
    const { days } = setUp();
    const overview = await days.overview();
    const today = await days.day(overview.today);
    const everything = JSON.stringify([
      overview,
      today,
      await days.search({ query: "", kinds: [], who: "both" }),
    ]);
    expect(everything).not.toContain("Draft I'm not ready to share");
    expect(everything).not.toContain("New plant on my desk"); // after our days meet, today
    expect(today.partner.map((e) => e.text)).toEqual(["Morning run by the river"]);
    expect(await days.entry("n-draft")).toBeNull();
    expect(await days.entry("n-desk")).toBeNull();
  });

  it("shows the viewer's own moments, private ones included, and marks only own unrevealed ones editable", async () => {
    const { days } = setUp();
    const today = await days.day((await days.overview()).today);
    const lunch = today.mine.find((e) => e.text === "Lunch by the window");
    expect(lunch).toMatchObject({ visibility: "private", editable: true, mine: true });
    expect(today.partner.every((e) => !e.editable)).toBe(true);
  });

  it("reveals 'after our days meet' moments once both finished, read-only from then on", async () => {
    const { days } = setUp();
    const two = Temporal.PlainDate.from((await days.overview()).today)
      .subtract({ days: 2 })
      .toString();
    const day = await days.day(two);
    expect(day.state).toBe("ready");
    expect(day.partner.map((e) => e.text)).toContain("Rain on the bus window");
    expect(day.mine.every((e) => !e.editable)).toBe(true);
  });

  it("waits neutrally when only this person finished (no blame), and finishing marks ready", async () => {
    const { days } = setUp();
    const t = (await days.overview()).today;
    const yesterday = Temporal.PlainDate.from(t).subtract({ days: 1 }).toString();
    expect((await days.day(yesterday)).state).toBe("waiting");
    expect((await days.day(t)).state).toBe("open");
    await days.finishDay(t);
    expect((await days.day(t)).state).toBe("waiting");
  });

  it("starts new moments where the person chose, and keeps shared moments shared (P-20)", async () => {
    const { days } = setUp();
    const draft = await days.save({
      kind: "feeling",
      text: "Quiet evening",
      emoji: "😌",
      mood: "calm",
      visibility: "private",
    });
    expect(draft).toMatchObject({ visibility: "private", mine: true, editable: true });
    expect(await days.setVisibility(draft.id, "shared")).toEqual({ ok: true });
    expect(await days.setVisibility(draft.id, "private")).toEqual({
      ok: false,
      reason: "shared-stays-shared",
    });
    const edited = await days.save({
      id: draft.id,
      kind: "feeling",
      text: "Quiet evening",
      emoji: "😌",
      visibility: "private",
    });
    expect(edited.visibility).toBe("shared");
  });

  it("deletes with a tombstone, and the entry is gone everywhere", async () => {
    const { days, store } = setUp();
    await days.remove("m-coffee");
    expect(await days.entry("m-coffee")).toBeNull();
    expect(store.read().days.entries.find((e) => e.id === "m-coffee")?.deleted).toBe(true);
  });

  it("never offers counts in the overview (§5: no metrics)", async () => {
    const { days } = setUp();
    for (const d of (await days.overview()).days) {
      expect(Object.keys(d).sort()).toEqual([
        "date",
        "isToday",
        "me",
        "partner",
        "preview",
        "state",
        "thumb",
      ]);
      expect(d.preview.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("mock us (US-01 to US-10)", () => {
  it("records what was sent with its payload, newest first, with no delivery or read state", async () => {
    const { us } = setUp();
    await us.send("need-you", { need: "overwhelmed", note: "Long day" });
    const [latest] = await us.history();
    expect(latest).toMatchObject({
      signal: "need-you",
      mine: true,
      payload: { need: "overwhelmed" },
      responses: [],
    });
    expect(JSON.stringify(await us.history())).not.toMatch(/delivered|seen|readAt/i);
  });

  it("pins the partner's open support signal until it's answered", async () => {
    const { us, store } = setUp();
    expect((await us.overview()).openSupport).toBeNull();
    store.update((s) => ({
      ...s,
      home: {
        ...s.home,
        incoming: [
          ...s.home.incoming,
          { id: "i-9", signal: "need-you", at: null, minutesAgo: 5, payload: { need: "lonely" } },
        ],
      },
    }));
    expect((await us.overview()).openSupport?.id).toBe("i-9");
    await us.respond("i-9", "here");
    expect((await us.overview()).openSupport).toBeNull();
    expect(store.read().home.dismissed).toContain("i-9");
  });

  it("closes the support card when the partner says they're okay now (US-09)", async () => {
    const { us, store } = setUp();
    store.update((s) => ({
      ...s,
      home: {
        ...s.home,
        incoming: [
          ...s.home.incoming,
          { id: "i-10", signal: "need-you", at: null, minutesAgo: 30 },
          { id: "i-11", signal: "okay-now", at: null, minutesAgo: 5 },
        ],
      },
    }));
    expect((await us.overview()).openSupport).toBeNull();
  });
});
