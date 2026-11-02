/**
 * Events, chapters and Memories mocks (EVT-01 to EVT-09, MEM-01 to MEM-10; P-59): times in both
 * zones and never a time the clocks skip (ADR-0002); chapters optional with nothing counted per
 * person; "remove from collection" keeps the memory, "delete" removes it for both and records
 * no actor (U-16).
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import type { EventInput } from "@/data/repositories/types";
import { NO_MEMORY_FILTER } from "@/domain/memories";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

/** Monday 26 Oct 2026, 15:00 in Addis (12:00 London, GMT). */
function setUp(at = "2026-10-26T12:00:00Z") {
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
    },
  }));
  const repos = createMockRepositories(store, () => clock);
  return { store, events: repos.events, memories: repos.memories };
}

const input = (patch: Partial<EventInput>): EventInput => ({
  title: "Call",
  kind: "date",
  date: "2026-11-20",
  time: null,
  zone: null,
  repeats: "none",
  whose: null,
  description: "",
  reminders: [],
  art: "night",
  ...patch,
});

describe("mock events (EVT-01 to EVT-04)", () => {
  it("lists upcoming events soonest first, with timed ones in both zones", async () => {
    const { events } = setUp();
    const { events: list, today } = await events.list();
    expect(today).toBe("2026-10-26");
    expect(list.map((e) => e.id).slice(0, 3)).toEqual(["e-movie", "e-birthday", "e-anniversary"]);
    const anniversary = list.find((e) => e.id === "e-anniversary");
    expect(anniversary).toMatchObject({
      next: "2026-11-14",
      occurrence: 2,
      times: { me: "22:00", partner: "19:00" },
    });
    expect(list.find((e) => e.id === "e-birthday")).toMatchObject({
      whose: "partner",
      next: "2026-11-02",
    });
  });

  it("refuses an empty name and a time the London clocks skip, without moving it", async () => {
    const { events } = setUp();
    expect(await events.save(input({ title: "  " }))).toEqual({ ok: false, reason: "empty-title" });
    expect(
      await events.save(input({ date: "2027-03-28", time: "01:30", zone: "Europe/London" })),
    ).toEqual({ ok: false, reason: "missing-time" });
    const ok = await events.save(input({ time: "20:00", zone: "Europe/London" }));
    expect(ok.ok && ok.event.times).toEqual({ me: "23:00", partner: "20:00" });
  });

  it("deletes for both", async () => {
    const { events } = setUp();
    await events.remove("e-movie");
    expect(await events.get("e-movie")).toBeNull();
  });
});

describe("mock chapters (EVT-07, EVT-08)", () => {
  it("runs month by month from when they started, newest first, with optional prompts", async () => {
    const { events } = setUp();
    const chapters = await events.chapters();
    expect(chapters.map((c) => [c.month, c.number, c.title])).toEqual([
      ["2026-10", 2, "Finding our rhythm"],
      ["2026-09", 1, "London begins"],
    ]);
    const october = await events.chapter("2026-10");
    expect(october?.reflections.map((r) => r.prompt)).toEqual([
      "moment",
      "photo",
      "learned",
      "ahead",
    ]);
    expect(october?.reflections.find((r) => r.prompt === "moment")?.answers).toEqual([]);
  });

  it("adds the viewer's own line and renames, and counts nothing per person", async () => {
    const { events } = setUp();
    await events.reflect("2026-10", "moment", "Coffee on two continents");
    await events.rename("2026-10", "Still us");
    const october = await events.chapter("2026-10");
    expect(october?.title).toBe("Still us");
    expect(october?.reflections.find((r) => r.prompt === "moment")?.answers).toEqual([
      expect.objectContaining({ name: "Selam", text: "Coffee on two continents", mine: true }),
    ]);
    expect(JSON.stringify(october)).not.toMatch(/score|streak|missed/i);
  });
});

describe("mock memories (MEM-01 to MEM-10)", () => {
  it("lists newest first with author and kind, and filters", async () => {
    const { memories } = setUp();
    const list = await memories.list(NO_MEMORY_FILTER);
    expect(list[0]?.title).toBe("Same sky");
    expect(list.every((m, i) => i === 0 || (list[i - 1]?.date ?? "") >= m.date)).toBe(true);
    const voices = await memories.list({ ...NO_MEMORY_FILTER, kinds: ["voice"] });
    expect(voices.map((m) => m.kind)).toEqual(["voice", "voice"]);
    const mine = await memories.list({ ...NO_MEMORY_FILTER, who: "me" });
    expect(mine.every((m) => m.mine)).toBe(true);
  });

  it("keeps a memory when it leaves a collection, or when the collection is deleted (MEM-09)", async () => {
    const { memories } = setUp();
    await memories.setInCollection("mem-coffee", "c-random", false);
    expect((await memories.get("mem-coffee"))?.collections).toEqual([]);
    await memories.deleteCollection("c-apart");
    expect(await memories.get("mem-airport")).not.toBeNull();
    expect((await memories.collections()).map((c) => c.id)).not.toContain("c-apart");
  });

  it("deletes for both with a tombstone that names nobody (U-16)", async () => {
    const { memories, store } = setUp();
    await memories.remove("mem-rain");
    expect(await memories.get("mem-rain")).toBeNull();
    const tomb = store.read().moments.memories.find((m) => m.id === "mem-rain");
    expect(tomb?.deleted).toBe(true);
    expect(Object.keys(tomb ?? {})).not.toContain("deletedBy");
  });

  it("saves only what was explicitly saved", async () => {
    const { memories } = setUp();
    const before = (await memories.list(NO_MEMORY_FILTER)).length;
    const saved = await memories.save({
      title: "First snow call",
      story: "",
      date: "2026-10-26",
      place: "",
      media: null,
      tags: ["Calls"],
      collectionIds: ["c-random"],
    });
    expect(saved).toMatchObject({
      mine: true,
      kind: "text",
      collections: [{ id: "c-random", title: "Random moments" }],
    });
    expect((await memories.list(NO_MEMORY_FILTER)).length).toBe(before + 1);
  });
});
