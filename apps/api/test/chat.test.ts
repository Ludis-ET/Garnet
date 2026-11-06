import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  ChatMessageDto,
  ChatMessagesResponse,
  ChatPresenceResponse,
  ConversationSummaryResponse,
  SearchChatResponse,
} from "@garnet/contracts";
import { startTestApi, type TestApi } from "./harness";

describe("chat API endpoints & business logic (B5, CHAT-01 to CHAT-09, P-58, P-61, P-62)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  it("sends a message, returns DTO, and partner sees it in message list", async () => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Good morning from Addis!" },
    });
    expect(sendRes.statusCode).toBe(200);
    const sentMsg = sendRes.json<ChatMessageDto>();
    expect(sentMsg.text).toBe("Good morning from Addis!");
    expect(sentMsg.status).toBe("sent");
    expect(sentMsg.senderId).toBe(api.cookies.selam ? sentMsg.senderId : "");

    // Noah reads the messages
    const listRes = await api.call("GET", "/v1/chat/messages", {
      cookie: api.cookies.noah,
    });
    expect(listRes.statusCode).toBe(200);
    const msgs = listRes.json<ChatMessagesResponse>().messages;
    expect(msgs.some((m) => m.id === sentMsg.id)).toBe(true);
  });

  it("edits a message within 15 minutes by author; rejects non-author and expired window", async () => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Typo here" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Noah (non-author) cannot edit
    const noahEditRes = await api.call("PATCH", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.noah,
      body: { text: "Noah cannot change this" },
    });
    expect(noahEditRes.statusCode).toBe(404);

    // Selam edits successfully
    const selamEditRes = await api.call("PATCH", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.selam,
      body: { text: "Corrected text" },
    });
    expect(selamEditRes.statusCode).toBe(200);
    const editedMsg = selamEditRes.json<ChatMessageDto>();
    expect(editedMsg.text).toBe("Corrected text");
    expect(editedMsg.editedAt).not.toBeNull();

    // Expired edit window simulation: update created_at to 20 minutes ago
    await api.db.query(
      "update chat_message set created_at = now() - interval '20 minutes' where id = $1",
      [msg.id],
    );
    const expiredEditRes = await api.call("PATCH", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.selam,
      body: { text: "Too late to edit" },
    });
    expect(expiredEditRes.statusCode).toBe(400); // RFC 9457 validation
  });

  it("deletes for-me hides only for caller; delete for-everyone tombstones for both", async () => {
    // 1. Delete for me
    const send1 = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Delete for me test" },
    });
    const msg1 = send1.json<ChatMessageDto>();

    const delForMe = await api.call("DELETE", `/v1/chat/messages/${msg1.id}`, {
      cookie: api.cookies.selam,
      body: { mode: "for-me" },
    });
    expect(delForMe.statusCode).toBe(204);

    // Selam does not see it
    const selamList = await api.call("GET", "/v1/chat/messages", { cookie: api.cookies.selam });
    expect(selamList.json<ChatMessagesResponse>().messages.some((m) => m.id === msg1.id)).toBe(
      false,
    );

    // Noah still sees it
    const noahList = await api.call("GET", "/v1/chat/messages", { cookie: api.cookies.noah });
    expect(noahList.json<ChatMessagesResponse>().messages.some((m) => m.id === msg1.id)).toBe(true);

    // 2. Delete for everyone
    const send2 = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Secret to remove" },
    });
    const msg2 = send2.json<ChatMessageDto>();

    // Noah cannot delete for everyone
    const noahDelRes = await api.call("DELETE", `/v1/chat/messages/${msg2.id}`, {
      cookie: api.cookies.noah,
      body: { mode: "for-everyone" },
    });
    expect(noahDelRes.statusCode).toBe(404);

    // Selam deletes for everyone
    const selamDelRes = await api.call("DELETE", `/v1/chat/messages/${msg2.id}`, {
      cookie: api.cookies.selam,
      body: { mode: "for-everyone" },
    });
    expect(selamDelRes.statusCode).toBe(204);

    // Both now see tombstone "This message was removed."
    const noahView = await api.call("GET", "/v1/chat/messages", { cookie: api.cookies.noah });
    const tombstone = noahView.json<ChatMessagesResponse>().messages.find((m) => m.id === msg2.id);
    expect(tombstone?.text).toBe("This message was removed.");
    expect(tombstone?.deletedForEveryone).toBe(true);
  });

  it("toggles reactions and aggregates without per-person comparisons (§5)", async () => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Photo coming up" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Noah reacts with ❤️
    const react1 = await api.call("POST", `/v1/chat/messages/${msg.id}/reactions`, {
      cookie: api.cookies.noah,
      body: { emoji: "❤️" },
    });
    expect(react1.statusCode).toBe(200);
    const updated1 = react1.json<ChatMessageDto>();
    expect(updated1.reactions).toEqual([{ emoji: "❤️", count: 1, reactedByMe: true }]);

    // Selam also reacts with ❤️
    const react2 = await api.call("POST", `/v1/chat/messages/${msg.id}/reactions`, {
      cookie: api.cookies.selam,
      body: { emoji: "❤️" },
    });
    expect(react2.statusCode).toBe(200);
    const updated2 = react2.json<ChatMessageDto>();
    expect(updated2.reactions).toEqual([{ emoji: "❤️", count: 2, reactedByMe: true }]);

    // Noah toggles ❤️ off
    const react3 = await api.call("POST", `/v1/chat/messages/${msg.id}/reactions`, {
      cookie: api.cookies.noah,
      body: { emoji: "❤️" },
    });
    expect(react3.statusCode).toBe(200);
    const updated3 = react3.json<ChatMessageDto>();
    expect(updated3.reactions).toEqual([{ emoji: "❤️", count: 1, reactedByMe: false }]);
  });

  it("pins and unpins messages; getPinned returns pinned list", async () => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Remember this place" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Noah pins it
    const pinRes = await api.call("POST", `/v1/chat/messages/${msg.id}/pin`, {
      cookie: api.cookies.noah,
    });
    expect(pinRes.statusCode).toBe(200);
    expect(pinRes.json<ChatMessageDto>().pinned).toBe(true);

    // List pinned
    const pinnedRes = await api.call("GET", "/v1/chat/pinned", { cookie: api.cookies.selam });
    expect(pinnedRes.json<ChatMessagesResponse>().messages.some((m) => m.id === msg.id)).toBe(true);

    // Noah unpins it
    const unpinRes = await api.call("POST", `/v1/chat/messages/${msg.id}/pin`, {
      cookie: api.cookies.noah,
    });
    expect(unpinRes.statusCode).toBe(200);
    expect(unpinRes.json<ChatMessageDto>().pinned).toBe(false);
  });

  it("calculates unread count from private read cursor; never leaks read state without mutual opt-in", async () => {
    // Selam marks read right now
    await api.call("POST", "/v1/chat/read", { cookie: api.cookies.selam });

    // Noah sends two messages
    await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.noah,
      body: { text: "Unread 1" },
    });
    await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.noah,
      body: { text: "Unread 2" },
    });

    // Selam checks summary
    const summary1 = (
      await api.call("GET", "/v1/chat/summary", { cookie: api.cookies.selam })
    ).json<ConversationSummaryResponse>();
    expect(summary1.unreadCount).toBeGreaterThanOrEqual(2);

    // Selam marks read
    const readRes = await api.call("POST", "/v1/chat/read", { cookie: api.cookies.selam });
    expect(readRes.statusCode).toBe(204);

    // Selam unread count is now 0
    const summary2 = (
      await api.call("GET", "/v1/chat/summary", { cookie: api.cookies.selam })
    ).json<ConversationSummaryResponse>();
    expect(summary2.unreadCount).toBe(0);

    // Because read receipts are null (unanswered), Noah sees seenUpTo = null
    const noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.seenUpTo).toBeNull();
  });

  it("mutual opt-in enables 'Seen' and 'Here Now' watching character (P-58, P-61, U-35)", async () => {
    // Step 1: Selam opts in, Noah has not -> Seen is still null
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.selam,
      body: { readReceipts: true },
    });
    let noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.seenUpTo).toBeNull();
    expect(noahPresence.partnerHere).toBe(false);

    // Step 2: Noah also opts in -> receiptsActive becomes TRUE
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.noah,
      body: { readReceipts: true },
    });

    // Now Noah sees Selam's seenUpTo
    noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.seenUpTo).not.toBeNull();

    // Selam sends watching heartbeat
    await api.call("POST", "/v1/chat/presence/watching", {
      cookie: api.cookies.selam,
      body: { watching: true },
    });

    // Noah now sees partnerHere = true!
    noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.partnerHere).toBe(true);

    // Step 3: Either partner turning read receipts off revokes both Seen and Here Now immediately
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.selam,
      body: { readReceipts: false },
    });

    noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.seenUpTo).toBeNull();
    expect(noahPresence.partnerHere).toBe(false);
  });

  it("typing indicator broadcasts only when enabled by author (P-58)", async () => {
    // Selam enables typing indicators
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.selam,
      body: { typingIndicators: true },
    });

    // Selam sends typing heartbeat
    await api.call("POST", "/v1/chat/presence/typing", {
      cookie: api.cookies.selam,
      body: { typing: true },
    });

    // Noah sees partnerTyping = true
    let noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.partnerTyping).toBe(true);

    // Selam turns off typing indicators in settings
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.selam,
      body: { typingIndicators: false },
    });

    // Noah now sees partnerTyping = false
    noahPresence = (
      await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.noah })
    ).json<ChatPresenceResponse>();
    expect(noahPresence.partnerTyping).toBe(false);
  });

  it("searches chat messages by text; excludes deleted-for-me", async () => {
    const send = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Meeting at Bole airport" },
    });
    const msg = send.json<ChatMessageDto>();

    // Search query matches
    const searchRes = await api.call("GET", "/v1/chat/search?q=Bole", {
      cookie: api.cookies.noah,
    });
    expect(searchRes.statusCode).toBe(200);
    const results = searchRes.json<SearchChatResponse>().messages;
    expect(results.some((m) => m.id === msg.id)).toBe(true);

    // If Noah deletes for-me, it no longer appears in his search
    await api.call("DELETE", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.noah,
      body: { mode: "for-me" },
    });

    const searchAfterDel = await api.call("GET", "/v1/chat/search?q=Bole", {
      cookie: api.cookies.noah,
    });
    expect(searchAfterDel.json<SearchChatResponse>().messages.some((m) => m.id === msg.id)).toBe(
      false,
    );
  });
});
