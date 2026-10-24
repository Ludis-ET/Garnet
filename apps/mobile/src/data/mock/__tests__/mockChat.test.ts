import { Temporal } from "temporal-polyfill";
import { MockStore } from "../MockStore";
import { createMockChat } from "../mockChat";

describe("mockChat repository", () => {
  const fixedInstant = Temporal.Instant.from("2026-10-24T18:00:00Z");
  const now = () => fixedInstant;
  let counter = 0;
  const localIdOf = () => `test-id-${++counter}`;

  it("returns summary with partner and counts", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const chat = createMockChat(store, now, localIdOf);

    const summary = await chat.getSummary();
    expect(summary.partner.name).toBe("Noah");
    expect(summary.partner.side).toBe("sapphire");
    expect(summary.lastMessage).not.toBeNull();
    expect(summary.pinnedCount).toBeGreaterThan(0);
    expect(summary.mediaCount).toBeGreaterThan(0);
  });

  it("sends a message and respects replyTo", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const chat = createMockChat(store, now, localIdOf);

    const sent = await chat.sendMessage({
      text: "See you soon!",
      replyToId: "msg-chat-1",
    });

    expect(sent.text).toBe("See you soon!");
    expect(sent.senderId).toBe("demo-user-ruby");
    expect(sent.replyTo?.id).toBe("msg-chat-1");
    expect(sent.status).toBe("sent");

    const messages = await chat.getMessages();
    expect(messages[messages.length - 1]?.id).toBe(sent.id);
  });

  it("edits a message", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const chat = createMockChat(store, now, localIdOf);

    const edited = await chat.editMessage("msg-chat-2", "Updated text");
    expect(edited.text).toBe("Updated text");
    expect(edited.editedAt).toBe("2026-10-24T18:00:00Z");
  });

  it("handles delete for me and delete for everyone (CHAT-04)", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const chat = createMockChat(store, now, localIdOf);

    // Delete for me
    await chat.deleteMessage("msg-chat-1", "for-me");
    let messages = await chat.getMessages();
    expect(messages.find((m) => m.id === "msg-chat-1")).toBeUndefined();

    // Delete for everyone
    await chat.deleteMessage("msg-chat-2", "for-everyone");
    messages = await chat.getMessages();
    const removed = messages.find((m) => m.id === "msg-chat-2");
    expect(removed).toBeDefined();
    expect(removed?.deletedForEveryone).toBe(true);
    expect(removed?.text).toBe("This message was removed.");
  });

  it("toggles reactions and pins", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const chat = createMockChat(store, now, localIdOf);

    // Toggle reaction
    const withHeart = await chat.toggleReaction("msg-chat-2", "❤️");
    expect(withHeart.reactions.find((r) => r.emoji === "❤️")?.count).toBe(1);

    const unHeart = await chat.toggleReaction("msg-chat-2", "❤️");
    expect(unHeart.reactions.find((r) => r.emoji === "❤️")).toBeUndefined();

    // Toggle pin
    const pinned = await chat.togglePin("msg-chat-2");
    expect(pinned.pinned).toBe(true);
    expect(pinned.pinnedAt).toBe("2026-10-24T18:00:00Z");

    const unpinned = await chat.togglePin("msg-chat-2");
    expect(unpinned.pinned).toBe(false);
  });

  it("manages settings and respects U-35 read receipts default off", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const chat = createMockChat(store, now, localIdOf);

    const settings = await chat.getSettings();
    expect(settings.readReceipts).toBe(false); // U-35

    const updated = await chat.updateSettings({ readReceipts: true });
    expect(updated.readReceipts).toBe(true);
  });
});
