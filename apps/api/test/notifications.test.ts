import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  ChatMessageDto,
  NotificationsListResponse,
  SendSignalResponse,
} from "@garnet/contracts";
import { startTestApi, type TestApi } from "./harness";

describe("Notifications & Push Delivery API (B6, B-50, U-27, P-84, §5, §6)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  beforeEach(() => {
    api.pushSender.clear();
  });

  it("registers a push device and cascades on session sign-out (U-27, P-84)", async () => {
    // 1. Noah signs in and registers a push device
    const noahCookie = await api.signIn("noah@example.test");
    const regRes = await api.call("POST", "/v1/me/push-devices", {
      cookie: noahCookie,
      body: { token: "fcm-noah-phone-1", platform: "android" },
    });
    expect(regRes.statusCode).toBe(204);

    // 2. Push device exists in DB
    const devRows1 = await api.db.query<{ token: string }>(
      "select token from push_device where token = $1",
      ["fcm-noah-phone-1"],
    );
    expect(devRows1.rows).toEqual([{ token: "fcm-noah-phone-1" }]);

    // 3. Signing out the session cascades and deletes the push device (U-27)
    await api.call("POST", "/v1/auth/sign-out", { cookie: noahCookie, body: {} });

    const devRows2 = await api.db.query("select token from push_device where token = $1", [
      "fcm-noah-phone-1",
    ]);
    expect(devRows2.rows).toEqual([]);
  });

  it("sends push notification on chat message without leaking message text (§5, §6)", async () => {
    // Noah registers push token
    await api.call("POST", "/v1/me/push-devices", {
      cookie: api.cookies.noah,
      body: { token: "fcm-noah-chat-token", platform: "android" },
    });

    api.pushSender.clear();

    // Selam sends a secret chat message
    const msgRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Secret surprise message content 12345" },
    });
    expect(msgRes.statusCode).toBe(200);
    const msg = msgRes.json<ChatMessageDto>();
    expect(msg.text).toBe("Secret surprise message content 12345");

    // Push sender received notification for Noah
    expect(api.pushSender.sent.length).toBe(1);
    const push = api.pushSender.sent[0]!;
    expect(push.to).toBe("fcm-noah-chat-token");

    // Guardrail §6: payload body MUST NOT contain raw message text!
    expect(push.body).not.toContain("Secret surprise message content 12345");
    expect(push.data.href).toBe("/us/chat");
    expect(push.data.category).toBe("chat-message");
    expect(push.data.group).toBe("messages");
    expect(push.data.garnet).toBe(true);

    // Noah checks his in-app notification center
    const notifRes = await api.call("GET", "/v1/notifications", {
      cookie: api.cookies.noah,
    });
    expect(notifRes.statusCode).toBe(200);
    const notifs = notifRes.json<NotificationsListResponse>();
    expect(notifs.items.length).toBeGreaterThan(0);
    const item = notifs.items.find((i) => i.id === push.data.id);
    expect(item).toBeDefined();
    expect(item?.category).toBe("chat-message");
    expect(item?.group).toBe("messages");
    expect(item?.unread).toBe(true);
    expect(notifs.unreadCount).toBeGreaterThanOrEqual(1);

    // Noah marks it read
    const readRes = await api.call("PATCH", `/v1/notifications/${item!.id}/read`, {
      cookie: api.cookies.noah,
      body: {},
    });
    expect(readRes.statusCode).toBe(204);

    // Verify it is marked read
    const afterRead = await api.call("GET", "/v1/notifications", {
      cookie: api.cookies.noah,
    });
    const updated = afterRead
      .json<NotificationsListResponse>()
      .items.find((i) => i.id === item!.id);
    expect(updated?.unread).toBe(false);
  });

  it("handles emotional signals and respects SYS-05 badge guardrail", async () => {
    // Noah clears notifications
    await api.call("POST", "/v1/notifications/read-all", {
      cookie: api.cookies.noah,
      body: {},
    });

    api.pushSender.clear();

    // Selam sends an emotional signal
    const sigRes = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.selam,
      body: { signal: "thought-of-you", payload: {} },
    });
    expect(sigRes.statusCode).toBe(200);
    const sig = sigRes.json<SendSignalResponse>();
    expect(sig.signal).toBe("thought-of-you");

    // Push was delivered to Noah
    expect(api.pushSender.sent.length).toBe(1);
    expect(api.pushSender.sent[0]!.data.category).toBe("thought");
    expect(api.pushSender.sent[0]!.data.group).toBe("signals");

    // Guardrail SYS-05: emotional signals light the dot (hasUnread = true), but NEVER numeric badge
    const notifRes = await api.call("GET", "/v1/notifications", {
      cookie: api.cookies.noah,
    });
    const notifs = notifRes.json<NotificationsListResponse>();
    expect(notifs.hasUnread).toBe(true);
    expect(notifs.unreadCount).toBe(0); // Signals excluded from unread count!
  });

  it("respects recipient settings when notifications are turned off", async () => {
    // Noah turns messages notifications off in settings
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.noah,
      body: { notify: { messages: "off" } },
    });

    api.pushSender.clear();

    // Selam sends a message
    await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Testing off mode" },
    });

    // Push was NOT sent
    expect(api.pushSender.sent.length).toBe(0);

    // Restore settings
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.noah,
      body: { notify: { messages: "immediate" } },
    });
  });

  it("cleans up invalid / unregistered device tokens automatically", async () => {
    // Register token
    await api.call("POST", "/v1/me/push-devices", {
      cookie: api.cookies.noah,
      body: { token: "fcm-dead-token-999", platform: "android" },
    });

    // Mark as unregistered in sender
    api.pushSender.markUnregistered("fcm-dead-token-999");

    // Selam sends a message
    await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Trigger dead token cleanup" },
    });

    // Token was automatically deleted from push_device table
    const check = await api.db.query("select 1 from push_device where token = $1", [
      "fcm-dead-token-999",
    ]);
    expect(check.rows).toEqual([]);
  });
});
