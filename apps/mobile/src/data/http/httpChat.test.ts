import type { ApiClient } from "./client";
import { createHttpChat } from "./httpChat";

const MOCK_MESSAGE_DTO = {
  id: "0192f0a0-0000-7000-8000-000000000001",
  senderId: "0192f0a0-0000-7000-8000-000000000002",
  text: "Hello from http adapter test",
  createdAt: "2026-11-06T12:00:00Z",
  editedAt: null,
  status: "sent" as const,
  pinned: false,
  pinnedAt: null,
  replyTo: null,
  reactions: [{ emoji: "❤️", count: 1, reactedByMe: true }],
};

function asApiClient(mock: Record<string, unknown>): ApiClient {
  return mock as unknown as ApiClient;
}

describe("createHttpChat (B5)", () => {
  it("getSummary calls GET /v1/chat/summary and maps response", async () => {
    const api = {
      get: jest.fn((path: string) => {
        expect(path).toBe("/v1/chat/summary");
        return Promise.resolve({
          viewerId: "0192f0a0-0000-7000-8000-000000000002",
          partner: {
            name: "Noah",
            side: "sapphire",
            zone: "Europe/London",
          },
          lastMessage: MOCK_MESSAGE_DTO,
          unreadCount: 1,
          pinnedCount: 0,
          mediaCount: 0,
        } as unknown);
      }),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const chat = createHttpChat(asApiClient(api));
    const summary = await chat.getSummary();
    expect(summary.viewerId).toBe("0192f0a0-0000-7000-8000-000000000002");
    expect(summary.partner.name).toBe("Noah");
    expect(summary.lastMessage?.text).toBe("Hello from http adapter test");
    expect(summary.unreadCount).toBe(1);
  });

  it("sendMessage calls POST /v1/chat/messages", async () => {
    const api = {
      get: jest.fn(),
      post: jest.fn((path: string, _schema: unknown, body: unknown) => {
        expect(path).toBe("/v1/chat/messages");
        expect(body).toEqual({ text: "Hello from test" });
        return Promise.resolve(MOCK_MESSAGE_DTO as unknown);
      }),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const chat = createHttpChat(asApiClient(api));
    const msg = await chat.sendMessage({ text: "Hello from test" });
    expect(msg.id).toBe(MOCK_MESSAGE_DTO.id);
    expect(msg.text).toBe(MOCK_MESSAGE_DTO.text);
  });

  it("editMessage calls PATCH /v1/chat/messages/:id", async () => {
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn((path: string, _schema: unknown, body: unknown) => {
        expect(path).toBe(`/v1/chat/messages/${MOCK_MESSAGE_DTO.id}`);
        expect(body).toEqual({ text: "Updated text" });
        return Promise.resolve({
          ...MOCK_MESSAGE_DTO,
          text: "Updated text",
          editedAt: "2026-11-06T12:05:00Z",
        } as unknown);
      }),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const chat = createHttpChat(asApiClient(api));
    const edited = await chat.editMessage(MOCK_MESSAGE_DTO.id, "Updated text");
    expect(edited.text).toBe("Updated text");
    expect(edited.editedAt).toBe("2026-11-06T12:05:00Z");
  });

  it("deleteMessage calls DELETE /v1/chat/messages/:id", async () => {
    let deletedPath = "";
    let deletedBody: unknown = null;
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn((path: string, body?: unknown) => {
        deletedPath = path;
        deletedBody = body;
        return Promise.resolve();
      }),
      deleteWith: jest.fn(),
    };

    const chat = createHttpChat(asApiClient(api));
    await chat.deleteMessage(MOCK_MESSAGE_DTO.id, "for-me");
    expect(deletedPath).toBe(`/v1/chat/messages/${MOCK_MESSAGE_DTO.id}`);
    expect(deletedBody).toEqual({ mode: "for-me" });
  });

  it("presence calls GET /v1/chat/presence", async () => {
    const api = {
      get: jest.fn((path: string) => {
        expect(path).toBe("/v1/chat/presence");
        return Promise.resolve({
          partnerTyping: true,
          seenUpTo: "2026-11-06T12:00:00Z",
          partnerHere: false,
        } as unknown);
      }),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const chat = createHttpChat(asApiClient(api));
    const presence = await chat.presence();
    expect(presence.partnerTyping).toBe(true);
    expect(presence.seenUpTo).toBe("2026-11-06T12:00:00Z");
  });

  it("markRead calls POST /v1/chat/read with no content", async () => {
    let calledPath = "";
    const api = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn((path: string) => {
        calledPath = path;
        return Promise.resolve();
      }),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const chat = createHttpChat(asApiClient(api));
    await chat.markRead();
    expect(calledPath).toBe("/v1/chat/read");
  });
});
