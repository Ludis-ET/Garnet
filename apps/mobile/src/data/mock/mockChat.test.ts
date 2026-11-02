/**
 * Chat presence (P-58): "Seen" only when both said yes (U-35 open; unanswered counts as no),
 * typing only when the partner shares it. Never a last-seen time or "online".
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { newProfile } from "@/data/fixtures/demoProfile";
import { receiptsActive } from "@/domain/chat";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

function setUp(mine: boolean | null, partners: boolean | null) {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    profiles: {
      ...s.profiles,
      byUser: { [DEMO_ME_ID]: { ...newProfile("Selam"), side: "ruby", complete: true } },
    },
    chat: {
      ...s.chat,
      settings: { ...s.chat.settings, readReceipts: mine },
      partner: { readReceipts: partners, typingIndicators: true },
      partnerSeenUpTo: "2026-10-26T10:00:00Z",
      partnerTyping: true,
      partnerInChat: true,
    },
  }));
  return { store, chat: createMockRepositories(store, () => Temporal.Now.instant()).chat };
}

const answers = [true, false, null] as const;

describe("chat presence (P-58)", () => {
  it.each(answers.flatMap((a) => answers.map((b) => [a, b] as const)))(
    "shows Seen with me=%s and Noah=%s only when both said yes",
    async (mine, partners) => {
      const { chat } = setUp(mine, partners);
      const both = mine === true && partners === true;
      const p = await chat.presence();
      expect(p.seenUpTo !== null).toBe(both);
      // Noah "here" (his character watching, P-61) follows the same mutual choice.
      expect(p.partnerHere).toBe(both);
      expect(receiptsActive(mine, partners)).toBe(both);
    },
  );

  it("starts unanswered, and hides typing when the partner doesn't share it", async () => {
    const { store, chat } = setUp(null, true);
    expect((await chat.getSettings()).readReceipts).toBeNull();
    expect((await chat.presence()).partnerTyping).toBe(true);
    store.update((s) => ({
      ...s,
      chat: { ...s.chat, partner: { ...s.chat.partner, typingIndicators: false } },
    }));
    expect((await chat.presence()).partnerTyping).toBe(false);
    expect(JSON.stringify(await chat.presence())).not.toMatch(/online|lastSeen/i);
  });
});

describe("uploads (P-61)", () => {
  it("sends media as an upload, cancels an unfinished one, and restarts on retry", async () => {
    const { store, chat } = setUp(true, true);
    const m = await chat.sendMessage({ text: "", media: { type: "photo", art: "sea" } });
    expect(m).toMatchObject({ status: "sending", uploadProgress: 0 });
    await chat.cancelUpload(m.id);
    expect(store.read().chat.messages.find((x) => x.id === m.id)).toBeUndefined();
    const again = await chat.sendMessage({ text: "", media: { type: "photo", art: "sea" } });
    store.update((s) => ({
      ...s,
      chat: {
        ...s.chat,
        messages: s.chat.messages.map((x) =>
          x.id === again.id ? { ...x, status: "failed" as const, uploadProgress: 0.6 } : x,
        ),
      },
    }));
    expect(await chat.retryMessage(again.id)).toMatchObject({
      status: "sending",
      uploadProgress: 0,
    });
    const words = await chat.sendMessage({ text: "hi" });
    expect(words.status).toBe("sent");
    expect(words.uploadProgress).toBeUndefined();
  });
});
