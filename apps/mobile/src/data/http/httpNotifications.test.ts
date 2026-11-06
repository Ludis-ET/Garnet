import type { ApiClient } from "./client";
import { createHttpNotifications } from "./httpNotifications";

function asApiClient(mock: Record<string, unknown>): ApiClient {
  return mock as unknown as ApiClient;
}

describe("createHttpNotifications (B6, B-50, U-27)", () => {
  it("list calls GET /v1/notifications and returns items", async () => {
    const mockItem = {
      id: "0192f0a0-0000-7000-8000-000000000001",
      category: "chat-message",
      group: "messages" as const,
      label: "Message",
      emoji: "💬",
      title: "Garnet",
      body: "Something new for you 💜",
      at: "2026-11-06T14:00:00Z",
      href: "/us/chat",
      unread: true,
    };

    const api = {
      get: jest.fn((path: string) => {
        expect(path).toBe("/v1/notifications");
        return Promise.resolve({
          items: [mockItem],
          unreadCount: 1,
          hasUnread: true,
        });
      }),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const repo = createHttpNotifications(asApiClient(api));
    const items = await repo.list();
    expect(items).toEqual([mockItem]);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("markRead calls PATCH /v1/notifications/:id/read", async () => {
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn((path: string, body: unknown) => {
        expect(path).toBe("/v1/notifications/notif-123/read");
        expect(body).toEqual({});
        return Promise.resolve();
      }),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const repo = createHttpNotifications(asApiClient(api));
    await repo.markRead("notif-123");
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it("markUnread calls PATCH /v1/notifications/:id/unread", async () => {
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn((path: string, body: unknown) => {
        expect(path).toBe("/v1/notifications/notif-123/unread");
        expect(body).toEqual({});
        return Promise.resolve();
      }),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const repo = createHttpNotifications(asApiClient(api));
    await repo.markUnread("notif-123");
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it("markAllRead calls POST /v1/notifications/read-all", async () => {
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn((path: string, body: unknown) => {
        expect(path).toBe("/v1/notifications/read-all");
        expect(body).toEqual({});
        return Promise.resolve();
      }),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const repo = createHttpNotifications(asApiClient(api));
    await repo.markAllRead();
    expect(api.postNoContent).toHaveBeenCalledTimes(1);
  });

  it("registerPushDevice and unregisterPushDevice call appropriate endpoints", async () => {
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn((path: string, body: unknown) => {
        expect(path).toBe("/v1/me/push-devices");
        expect(body).toEqual({ token: "device-token-abc", platform: "android" });
        return Promise.resolve();
      }),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn((path: string) => {
        expect(path).toBe("/v1/me/push-devices/device-token-abc");
        return Promise.resolve();
      }),
      deleteWith: jest.fn(),
    };

    const repo = createHttpNotifications(asApiClient(api));
    await repo.registerPushDevice("device-token-abc", "android");
    expect(api.postNoContent).toHaveBeenCalledTimes(1);

    await repo.unregisterPushDevice("device-token-abc");
    expect(api.delete).toHaveBeenCalledTimes(1);
  });
});
