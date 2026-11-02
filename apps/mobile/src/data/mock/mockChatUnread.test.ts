/**
 * Unread counts (P-66): this person's own read position, never sent to the partner. "Seen"
 * stays the mutual choice (P-58), so reading must not touch anything the partner could see.
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

function setup() {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...s.profiles,
      byUser: {
        [DEMO_ME_ID]: { ...newProfile("Selam"), side: "ruby", timeZone: "Africa/Addis_Ababa" },
      },
    },
  }));
  return { store, repos: createMockRepositories(store, () => Temporal.Now.instant()) };
}

describe("unread messages (P-66)", () => {
  it("counts the partner's messages after this person's read position", async () => {
    const { repos } = setup();
    expect((await repos.chat.getSummary()).unreadCount).toBe(2);
  });

  it("clears on reading without changing anything the partner sees", async () => {
    const { repos, store } = setup();
    const before = store.read().chat;
    await repos.chat.markRead();
    expect((await repos.chat.getSummary()).unreadCount).toBe(0);
    const after = store.read().chat;
    expect(after.partnerSeenUpTo).toBe(before.partnerSeenUpTo);
    expect(after.partner).toEqual(before.partner);
    expect(after.messages).toEqual(before.messages);
  });

  it("marks message notifications read too, and 'keep unread' sticks", async () => {
    const { repos } = setup();
    const unreadMsgs = async () =>
      (await repos.inbox.list()).filter((i) => i.category === "chat-message" && i.unread);
    expect((await unreadMsgs()).length).toBe(2);
    await repos.chat.markRead();
    expect(await unreadMsgs()).toEqual([]);
    const any = (await repos.inbox.list()).find((i) => i.category === "chat-message");
    if (any === undefined) throw new Error("no message notification");
    await repos.inbox.markUnread(any.id);
    expect((await unreadMsgs()).map((i) => i.id)).toEqual([any.id]);
  });
});
