/**
 * Surprises (SUR-01 to SUR-07): what never reaches the recipient before opening, and who may
 * do what. The demo has one ready surprise for Selam, one locked each way, one opened, one
 * withdrawn and one that failed to schedule (the sender's alone).
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID, DEMO_PARTNER_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

function setup(userId = DEMO_ME_ID) {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [userId]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...s.profiles,
      byUser: {
        [userId]: { ...newProfile("Selam"), side: "ruby", timeZone: "Africa/Addis_Ababa" },
      },
    },
  }));
  return { store, repos: createMockRepositories(store, () => Temporal.Now.instant()) };
}

describe("surprises privacy (SUR-01, A9)", () => {
  it("lists the recipient's surprises without anything inside before they open", async () => {
    const { repos, store } = setup();
    const { items } = await repos.surprises.list();
    const secrets = store
      .read()
      .surprises.filter((s) => s.recipientId === DEMO_ME_ID && s.state === "scheduled")
      .map((s) => s.content.text);
    const text = JSON.stringify(items);
    for (const secret of secrets) expect(text).not.toContain(secret);
    expect(items.find((i) => i.id === "sur-failed")).toMatchObject({ kind: "failed" });
  });

  it("never shows the partner a surprise that failed to schedule", async () => {
    const { repos } = setup();
    // Seen from Noah's side: Selam's failed surprise doesn't exist for him.
    const { store } = setup(DEMO_PARTNER_ID);
    const noah = createMockRepositories(store, () => Temporal.Now.instant());
    expect((await noah.surprises.list()).items.some((i) => i.id === "sur-failed")).toBe(false);
    expect((await repos.surprises.get("sur-failed")).kind).toBe("failed");
  });

  it("shows only the safe or generic title in notifications", async () => {
    const { repos, store } = setup();
    const items = await repos.inbox.list();
    const surprise = items.find((i) => i.category === "surprise");
    expect(surprise?.body).toBe("Something for you");
    const ready = store.read().surprises.find((s) => s.id === "sur-ready");
    expect(JSON.stringify(items)).not.toContain(ready?.content.text ?? "never");
  });
});

describe("who may do what (SUR-05, SUR-06)", () => {
  it("opens only when it's ready, and only for the recipient", async () => {
    const { repos } = setup();
    await expect(repos.surprises.open("sur-anniversary")).rejects.toThrow();
    await expect(repos.surprises.open("sur-birthday")).rejects.toThrow(); // Selam sent it
    const opened = await repos.surprises.open("sur-ready");
    expect(opened).toMatchObject({ kind: "opened", content: { kind: "photo" } });
  });

  it("lets only the sender cancel or retitle, and only before it opens (provisional, P-68)", async () => {
    const { repos } = setup();
    await expect(repos.surprises.cancel("sur-ready")).rejects.toThrow();
    await expect(repos.surprises.retitle("sur-song", "x")).rejects.toThrow(); // already opened
    await repos.surprises.retitle("sur-birthday", "  For you  ");
    expect(await repos.surprises.get("sur-birthday")).toMatchObject({ title: "For you" });
    await repos.surprises.cancel("sur-birthday");
    expect((await repos.surprises.get("sur-birthday")).kind).toBe("cancelled");
  });

  it("creates a locked surprise for the partner and retries a failed one", async () => {
    const { repos } = setup();
    const { id } = await repos.surprises.create({
      content: { kind: "message", text: "Hidden words", media: null, song: null },
      safeTitle: "  ",
      reveal: { type: "date", at: "2099-01-01T09:00:00Z" },
    });
    expect(await repos.surprises.get(id)).toMatchObject({
      kind: "locked",
      fromMe: true,
      title: "Something for you",
    });
    await repos.surprises.retry("sur-failed");
    expect((await repos.surprises.get("sur-failed")).kind).toBe("locked");
  });
});
