import { Temporal } from "temporal-polyfill";
import {
  dateGroupLabel,
  groupMessagesByDate,
  isMessageEditable,
  searchChatMessages,
  type ChatMessage,
} from "../chat";

describe("chat domain rules", () => {
  const now = Temporal.Instant.from("2026-10-24T18:00:00Z");

  const baseMessage: ChatMessage = {
    id: "msg-1",
    senderId: "user-1",
    text: "Hello there",
    createdAt: "2026-10-24T17:50:00Z", // 10 minutes ago
    editedAt: null,
    status: "sent",
    pinned: false,
    pinnedAt: null,
    replyTo: null,
    reactions: [],
  };

  describe("isMessageEditable", () => {
    it("allows author to edit within 15 minutes", () => {
      expect(isMessageEditable(baseMessage, "user-1", now)).toBe(true);
    });

    it("disallows editing when author is different", () => {
      expect(isMessageEditable(baseMessage, "user-2", now)).toBe(false);
    });

    it("disallows editing when message is older than 15 minutes", () => {
      const oldMessage: ChatMessage = {
        ...baseMessage,
        createdAt: "2026-10-24T17:30:00Z", // 30 minutes ago
      };
      expect(isMessageEditable(oldMessage, "user-1", now)).toBe(false);
    });

    it("disallows editing deleted messages", () => {
      const deletedMessage: ChatMessage = {
        ...baseMessage,
        deletedForEveryone: true,
      };
      expect(isMessageEditable(deletedMessage, "user-1", now)).toBe(false);
    });
  });

  describe("dateGroupLabel and groupMessagesByDate", () => {
    it("labels today and yesterday correctly", () => {
      expect(dateGroupLabel("2026-10-24T12:00:00Z", now, "Europe/London")).toBe("Today");
      expect(dateGroupLabel("2026-10-23T12:00:00Z", now, "Europe/London")).toBe("Yesterday");
    });

    it("groups messages by date label", () => {
      const messages: ChatMessage[] = [
        {
          ...baseMessage,
          id: "m-yesterday",
          createdAt: "2026-10-23T12:00:00Z",
        },
        {
          ...baseMessage,
          id: "m-today-1",
          createdAt: "2026-10-24T10:00:00Z",
        },
        {
          ...baseMessage,
          id: "m-today-2",
          createdAt: "2026-10-24T12:00:00Z",
        },
      ];

      const groups = groupMessagesByDate(messages, now, "Europe/London");
      expect(groups).toHaveLength(2);
      expect(groups[0]?.dateLabel).toBe("Yesterday");
      expect(groups[0]?.messages).toHaveLength(1);
      expect(groups[1]?.dateLabel).toBe("Today");
      expect(groups[1]?.messages).toHaveLength(2);
    });
  });

  describe("searchChatMessages", () => {
    const list: ChatMessage[] = [
      { ...baseMessage, id: "1", text: "Morning sunshine" },
      { ...baseMessage, id: "2", text: "See you at 7" },
      {
        ...baseMessage,
        id: "3",
        text: "",
        media: { type: "photo", art: "sunrise", caption: "Sunrise over London" },
      },
    ];

    it("matches text content case-insensitively", () => {
      const res = searchChatMessages(list, "sunshine");
      expect(res).toHaveLength(1);
      expect(res[0]?.id).toBe("1");
    });

    it("matches caption content", () => {
      const res = searchChatMessages(list, "London");
      expect(res).toHaveLength(1);
      expect(res[0]?.id).toBe("3");
    });

    it("returns empty array for empty query or no match", () => {
      expect(searchChatMessages(list, "")).toEqual([]);
      expect(searchChatMessages(list, "unicorn")).toEqual([]);
    });
  });
});
