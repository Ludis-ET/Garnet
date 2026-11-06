import { DEMO_PHOTOS, type AvatarChoice } from "@/data/fixtures/demoProfile";
import type { ChatRepository, SendMessageInput } from "@/data/repositories/types";
import {
  type ChatMessage,
  type ChatMedia,
  type ChatPresence,
  type ChatSettings,
  type ChatSticker,
  type ConversationSummary,
} from "@/domain/chat";
import {
  chatMessageDtoSchema,
  chatMessagesResponseSchema,
  chatPresenceResponseSchema,
  chatSettingsResponseSchema,
  conversationSummaryResponseSchema,
  searchChatResponseSchema,
  type ChatMessageDto,
  type ConversationSummaryResponse,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import type { ApiClient } from "./client";

function toChatMessage(dto: ChatMessageDto): ChatMessage {
  const msg: ChatMessage = {
    id: dto.id,
    senderId: dto.senderId,
    text: dto.text,
    createdAt: dto.createdAt,
    editedAt: dto.editedAt,
    status: dto.status,
    pinned: dto.pinned,
    pinnedAt: dto.pinnedAt,
    replyTo: dto.replyTo
      ? {
          id: dto.replyTo.id,
          senderId: dto.replyTo.senderId,
          senderName: dto.replyTo.senderName,
          text: dto.replyTo.text,
          ...(dto.replyTo.mediaType ? { mediaType: dto.replyTo.mediaType } : {}),
        }
      : null,
    reactions: dto.reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      reactedByMe: r.reactedByMe,
    })),
    ...(dto.media ? { media: dto.media as unknown as ChatMedia } : {}),
    ...(dto.sticker ? { sticker: dto.sticker as unknown as ChatSticker } : {}),
    ...(dto.deletedForMe ? { deletedForMe: true } : {}),
    ...(dto.deletedForEveryone ? { deletedForEveryone: true } : {}),
    ...(dto.uploadProgress !== undefined ? { uploadProgress: dto.uploadProgress } : {}),
    ...(dto.savedAsMemory ? { savedAsMemory: true } : {}),
  };
  return msg;
}

function toAvatar(
  a: { kind: "initials"; swatch: number } | { kind: "photo"; photo: string },
): AvatarChoice {
  if (a.kind === "initials") return a;
  const photo = DEMO_PHOTOS.find((p) => p === a.photo);
  return photo === undefined ? { kind: "initials", swatch: 0 } : { kind: "photo", photo };
}

function toConversationSummary(dto: ConversationSummaryResponse): ConversationSummary {
  return {
    viewerId: dto.viewerId,
    partner: {
      name: dto.partner.name,
      side: dto.partner.side,
      zone: dto.partner.zone,
      ...(dto.partner.avatar !== undefined ? { avatar: toAvatar(dto.partner.avatar) } : {}),
    },
    lastMessage: dto.lastMessage ? toChatMessage(dto.lastMessage) : null,
    unreadCount: dto.unreadCount,
    pinnedCount: dto.pinnedCount,
    mediaCount: dto.mediaCount,
  };
}

export function createHttpChat(api: ApiClient, sqlite?: SqliteStore): ChatRepository {
  return {
    getSummary: async () => {
      const res = await api.get("/v1/chat/summary", conversationSummaryResponseSchema);
      return toConversationSummary(res);
    },

    getMessages: async () => {
      try {
        const res = await api.get("/v1/chat/messages", chatMessagesResponseSchema);
        if (sqlite) {
          for (const m of res.messages) {
            await sqlite.saveConfirmedMessage({
              id: m.id,
              relationshipId: "default",
              senderId: m.senderId,
              kind: m.media ? m.media.type : m.sticker ? "sticker" : "text",
              body: m.text,
              mediaId: m.media?.id ?? null,
              replyToId: m.replyTo?.id ?? null,
              createdAt: m.createdAt,
              editedAt: m.editedAt,
              deletedForAll: m.deletedForEveryone === true,
              pinned: m.pinned,
            });
          }
        }
        return res.messages.map(toChatMessage);
      } catch (err) {
        if (sqlite) {
          const cached = await sqlite.getConfirmedMessages("default");
          if (cached.length > 0) {
            return cached.map((c) => ({
              id: c.id,
              senderId: c.senderId,
              text: c.body,
              createdAt: c.createdAt,
              editedAt: c.editedAt,
              status: "sent" as const,
              pinned: c.pinned,
              pinnedAt: null,
              replyTo: null,
              reactions: [],
              ...(c.deletedForAll ? { deletedForEveryone: true } : {}),
            }));
          }
        }
        throw err;
      }
    },

    sendMessage: async (input: SendMessageInput) => {
      const res = await api.post("/v1/chat/messages", chatMessageDtoSchema, input);
      return toChatMessage(res);
    },

    editMessage: async (id: string, text: string) => {
      const res = await api.patchWith(`/v1/chat/messages/${id}`, chatMessageDtoSchema, { text });
      return toChatMessage(res);
    },

    deleteMessage: async (id: string, mode: "for-me" | "for-everyone") => {
      await api.delete(`/v1/chat/messages/${id}`, { mode });
    },

    toggleReaction: async (messageId: string, emoji: string) => {
      const res = await api.post(`/v1/chat/messages/${messageId}/reactions`, chatMessageDtoSchema, {
        emoji,
      });
      return toChatMessage(res);
    },

    togglePin: async (messageId: string) => {
      const res = await api.post(`/v1/chat/messages/${messageId}/pin`, chatMessageDtoSchema);
      return toChatMessage(res);
    },

    retryMessage: async (id: string) => {
      // Replays sending with existing id
      const res = await api.post("/v1/chat/messages", chatMessageDtoSchema, { id });
      return toChatMessage(res);
    },

    cancelUpload: async () => {
      // Client-side cancellation
      return Promise.resolve();
    },

    markSaved: async (id: string) => {
      await api.postNoContent(`/v1/chat/messages/${id}/save-memory`, {});
    },

    markRead: async () => {
      await api.postNoContent("/v1/chat/read", {});
    },

    presence: async (): Promise<ChatPresence> => {
      return api.get("/v1/chat/presence", chatPresenceResponseSchema);
    },

    getSettings: async (): Promise<ChatSettings> => {
      return api.get("/v1/chat/settings", chatSettingsResponseSchema);
    },

    updateSettings: async (patch: Partial<ChatSettings>): Promise<ChatSettings> => {
      return api.patchWith("/v1/chat/settings", chatSettingsResponseSchema, patch);
    },

    search: async (query: string) => {
      if (!query.trim()) return [];
      const res = await api.get(
        `/v1/chat/search?q=${encodeURIComponent(query)}`,
        searchChatResponseSchema,
      );
      return res.messages.map(toChatMessage);
    },

    getPinned: async () => {
      const res = await api.get("/v1/chat/pinned", chatMessagesResponseSchema);
      return res.messages.map(toChatMessage);
    },

    getSharedMedia: async () => {
      const res = await api.get("/v1/chat/shared-media", chatMessagesResponseSchema);
      return res.messages.map(toChatMessage);
    },
  };
}
