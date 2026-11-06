import { describe, expect, it } from "vitest";
import {
  chatMessageDtoSchema,
  chatPresenceResponseSchema,
  conversationSummaryResponseSchema,
  deleteMessageRequestSchema,
  editMessageRequestSchema,
  sendMessageRequestSchema,
  toggleReactionRequestSchema,
  updateChatSettingsRequestSchema,
} from "./chat";

describe("chat contracts (B5, CHAT-01 to CHAT-09)", () => {
  const SENDER_ID = "0192f0a0-0000-7000-8000-000000000001";
  const MSG_ID = "0192f0a0-0000-7000-8000-000000000002";
  const PARTNER_ID = "0192f0a0-0000-7000-8000-000000000003";

  it("validates a full chat message DTO", () => {
    const raw = {
      id: MSG_ID,
      senderId: SENDER_ID,
      text: "Thinking of you!",
      createdAt: "2026-11-06T12:00:00Z",
      editedAt: null,
      status: "sent",
      pinned: true,
      pinnedAt: "2026-11-06T12:05:00Z",
      replyTo: null,
      reactions: [{ emoji: "❤️", count: 1, reactedByMe: true }],
      sticker: { character: "ruby", mood: "loving" },
      savedAsMemory: true,
    };
    const parsed = chatMessageDtoSchema.parse(raw);
    expect(parsed.id).toBe(MSG_ID);
    expect(parsed.status).toBe("sent");
    expect(parsed.reactions[0]?.emoji).toBe("❤️");
  });

  it("validates send message request", () => {
    const parsed = sendMessageRequestSchema.parse({
      text: "Hello from London",
      sticker: { character: "sapphire", mood: "happy" },
    });
    expect(parsed.text).toBe("Hello from London");
    expect(parsed.sticker?.character).toBe("sapphire");
  });

  it("validates edit and delete requests", () => {
    const edit = editMessageRequestSchema.parse({ text: "Updated message" });
    expect(edit.text).toBe("Updated message");

    const delForMe = deleteMessageRequestSchema.parse({ mode: "for-me" });
    expect(delForMe.mode).toBe("for-me");

    const delForEveryone = deleteMessageRequestSchema.parse({ mode: "for-everyone" });
    expect(delForEveryone.mode).toBe("for-everyone");

    expect(() => deleteMessageRequestSchema.parse({ mode: "invalid" })).toThrow();
  });

  it("validates reaction toggle", () => {
    const react = toggleReactionRequestSchema.parse({ emoji: "🥰" });
    expect(react.emoji).toBe("🥰");
  });

  it("validates chat settings update (U-35, P-58)", () => {
    const update1 = updateChatSettingsRequestSchema.parse({ readReceipts: true });
    expect(update1.readReceipts).toBe(true);

    const update2 = updateChatSettingsRequestSchema.parse({ readReceipts: null });
    expect(update2.readReceipts).toBeNull();

    const update3 = updateChatSettingsRequestSchema.parse({ typingIndicators: false });
    expect(update3.typingIndicators).toBe(false);
  });

  it("validates chat presence response (P-58, P-61)", () => {
    const presence = chatPresenceResponseSchema.parse({
      partnerTyping: true,
      seenUpTo: "2026-11-06T12:00:00Z",
      partnerHere: false,
    });
    expect(presence.partnerTyping).toBe(true);
    expect(presence.seenUpTo).toBe("2026-11-06T12:00:00Z");
  });

  it("validates conversation summary response", () => {
    const summary = conversationSummaryResponseSchema.parse({
      viewerId: SENDER_ID,
      partner: {
        id: PARTNER_ID,
        name: "Noah",
        side: "sapphire",
        zone: "Europe/London",
      },
      lastMessage: null,
      unreadCount: 0,
      pinnedCount: 2,
      mediaCount: 1,
    });
    expect(summary.viewerId).toBe(SENDER_ID);
    expect(summary.partner.name).toBe("Noah");
    expect(summary.unreadCount).toBe(0);
  });
});
