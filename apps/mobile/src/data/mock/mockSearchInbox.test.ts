/**
 * Privacy probes for search (SEARCH-01) and the notification centre (NOTIF-01): what one person
 * may never find or be told about. A partner's private moment or draft letter, a sealed letter's
 * words and deleted messages stay out; unread marks belong to the viewer alone (§4, §5).
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID, DEMO_PARTNER_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import type { SearchFilters } from "@/data/repositories/types";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

const ALL: SearchFilters = { kinds: [], who: "both" };
const clock = Temporal.Instant.from("2026-10-22T11:00:00Z");

function setup() {
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
    days: {
      ...s.days,
      entries: [
        ...s.days.entries,
        entry("p-private", DEMO_PARTNER_ID, "zebra private thought", "private"),
        entry("p-later", DEMO_PARTNER_ID, "zebra after reveal", "afterReveal"),
        entry("p-shared", DEMO_PARTNER_ID, "zebra shared walk", "shared"),
        entry("m-private", DEMO_ME_ID, "zebra my own draft", "private"),
        { ...entry("m-gone", DEMO_ME_ID, "zebra deleted", "shared"), deleted: true },
      ],
    },
    letters: [
      ...s.letters,
      {
        id: "p-draft-letter",
        authorId: DEMO_PARTNER_ID,
        recipientId: DEMO_ME_ID,
        safePrompt: "Open when you see a zebra",
        body: "secret",
        mediaRefs: [],
        unlock: { type: "manual" },
        state: "draft",
        sealedAt: null,
        openedAt: null,
      },
      {
        id: "p-sealed-letter",
        authorId: DEMO_PARTNER_ID,
        recipientId: DEMO_ME_ID,
        safePrompt: "Open when the rain comes",
        body: "The quokka words inside",
        mediaRefs: [],
        unlock: { type: "manual" },
        state: "sealed",
        sealedAt: "2026-10-01T10:00:00Z",
        openedAt: null,
      },
    ],
    chat: {
      ...s.chat,
      messages: [
        ...s.chat.messages,
        message("gone", DEMO_PARTNER_ID, "zebra removed", { deletedForEveryone: true }),
        message("hidden", DEMO_PARTNER_ID, "zebra hidden", { deletedForMe: true }),
        message("kept", DEMO_PARTNER_ID, "zebra kept"),
      ],
    },
  }));
  return { store, repos: createMockRepositories(store, () => clock) };
}

function entry(
  id: string,
  authorId: string,
  text: string,
  visibility: "private" | "shared" | "afterReveal",
) {
  return {
    id,
    authorId,
    kind: "text" as const,
    text,
    emoji: "📝",
    dayOffset: 1,
    localTime: "09:00",
    at: null,
    visibility,
  };
}

function message(id: string, senderId: string, text: string, extra = {}) {
  return {
    id,
    senderId,
    text,
    createdAt: "2026-10-21T10:00:00Z",
    editedAt: null,
    status: "sent" as const,
    pinned: false,
    pinnedAt: null,
    replyTo: null,
    reactions: [],
    ...extra,
  };
}

describe("search privacy (SEARCH-01)", () => {
  it("finds own drafts and shared things, never a partner's private or unrevealed moment", async () => {
    const { repos } = setup();
    const ids = (await repos.search.search("zebra", ALL)).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["p-shared", "m-private", "kept"]));
    expect(ids).not.toContain("p-private");
    expect(ids).not.toContain("p-later");
  });

  it("never returns deleted items or a partner's draft letter", async () => {
    const { repos } = setup();
    const ids = (await repos.search.search("zebra", ALL)).map((r) => r.id);
    expect(ids).not.toContain("m-gone");
    expect(ids).not.toContain("gone");
    expect(ids).not.toContain("hidden");
    expect(ids).not.toContain("p-draft-letter");
  });

  it("matches a sealed letter by its prompt only, with no snippet", async () => {
    const { repos } = setup();
    expect(await repos.search.search("quokka", ALL)).toEqual([]);
    const [hit] = await repos.search.search("rain", { kinds: ["letter"], who: "both" });
    expect(hit).toMatchObject({ id: "p-sealed-letter", sealed: true, snippet: null });
  });

  it("filters by kind and person", async () => {
    const { repos } = setup();
    const mine = await repos.search.search("zebra", { kinds: ["moment"], who: "me" });
    expect(mine.map((r) => r.id)).toEqual(["m-private"]);
  });

  it("keeps recent searches for this person, most recent first, and clears them", async () => {
    const { repos } = setup();
    await repos.search.remember("zebra");
    await repos.search.remember("rain");
    await repos.search.remember("zebra");
    expect(await repos.search.recent()).toEqual(["zebra", "rain"]);
    await repos.search.clearRecent();
    expect(await repos.search.recent()).toEqual([]);
  });
});

describe("notification centre (NOTIF-01)", () => {
  it("lists safe text only: a letter's prompt, never its words", async () => {
    const { repos } = setup();
    const items = await repos.inbox.list();
    const text = items.map((i) => `${i.title} ${i.body}`).join(" ");
    expect(text).not.toContain("quokka");
    expect(text).not.toContain("secret");
    expect(items.some((i) => i.category === "open-when" && i.body.includes("rain"))).toBe(true);
    expect(text).not.toContain("zebra removed");
  });

  it("marks read for the viewer only, without touching anything the partner sees", async () => {
    const { repos, store } = setup();
    const before = await repos.inbox.list();
    expect(before.some((i) => i.unread)).toBe(true);
    const partnerView = JSON.stringify(store.read().chat);
    await repos.inbox.markAllRead();
    expect((await repos.inbox.list()).every((i) => !i.unread)).toBe(true);
    expect(JSON.stringify(store.read().chat)).toBe(partnerView);
    expect(Object.keys(store.read().settings.readIds)).toEqual([DEMO_ME_ID]);
  });
});
