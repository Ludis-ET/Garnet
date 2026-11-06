import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_METAS,
  notificationItemSchema,
  notificationsListResponseSchema,
  registerPushDeviceSchema,
} from "./notifications";

describe("notifications contracts (B6, B-50, U-27)", () => {
  it("validates valid push device registration", () => {
    const valid = { token: "fcm-device-token-12345", platform: "android" };
    expect(registerPushDeviceSchema.parse(valid)).toEqual(valid);

    const ios = { token: "apns-device-token-67890", platform: "ios" };
    expect(registerPushDeviceSchema.parse(ios)).toEqual(ios);
  });

  it("rejects invalid push device registration", () => {
    expect(() => registerPushDeviceSchema.parse({ token: "", platform: "android" })).toThrow();
    expect(() => registerPushDeviceSchema.parse({ token: "token", platform: "windows" })).toThrow();
    expect(() =>
      registerPushDeviceSchema.parse({ token: "token", platform: "android", extra: true }),
    ).toThrow();
  });

  it("validates notification item and list response", () => {
    const item = {
      id: "0192f0a0-0000-7000-8000-000000000001",
      category: "chat-message",
      group: "messages" as const,
      label: "Message",
      emoji: "💬",
      title: "Garnet",
      body: "Something new for you 💜",
      at: "2026-11-06T14:00:00.000Z",
      href: "/us/chat",
      unread: true,
    };
    expect(notificationItemSchema.parse(item)).toEqual(item);

    const list = {
      items: [item],
      unreadCount: 1,
      hasUnread: true,
    };
    expect(notificationsListResponseSchema.parse(list)).toEqual(list);
  });

  it("contains all catalogue categories in NOTIFICATION_METAS", () => {
    expect(NOTIFICATION_METAS["thought"]).toEqual({
      group: "signals",
      label: "Thought",
      emoji: "💭",
    });
    expect(NOTIFICATION_METAS["chat-message"]).toEqual({
      group: "messages",
      label: "Message",
      emoji: "💬",
    });
    expect(NOTIFICATION_METAS["day-reveal"]).toEqual({
      group: "days",
      label: "Your day",
      emoji: "🌅",
    });
  });
});
