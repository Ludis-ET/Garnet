import type { Temporal } from "temporal-polyfill";
import type { ChatRepository, SendMessageInput } from "@/data/repositories/types";
import {
  unreadCount as countUnread,
  receiptsActive,
  searchChatMessages,
  type ChatMessage,
  type ChatSettings,
  type ConversationSummary,
} from "@/domain/chat";
import type { MockStore } from "./MockStore";
import { viewerOf } from "./viewer";

export function createMockChat(
  store: MockStore,
  now: () => Temporal.Instant,
  localIdOf: () => string,
): ChatRepository {
  // The signed-in person and their partner, with the sides and zones chosen in setup.
  const getMeAndPartner = () => {
    const v = viewerOf(store.read());
    return { meId: v.userId, me: v.me, partnerPerson: v.partner };
  };

  return {
    getSummary: () =>
      store.simulate(() => {
        const { meId, partnerPerson } = getMeAndPartner();
        const { messages } = store.read().chat;
        const visible = messages.filter((m) => !m.deletedForMe);
        const lastMessage = visible[visible.length - 1] ?? null;

        const unreadCount = countUnread(messages, meId, store.read().chat.readUpTo ?? null);

        const pinnedCount = visible.filter((m) => m.pinned && !m.deletedForEveryone).length;
        const mediaCount = visible.filter((m) => Boolean(m.media) && !m.deletedForEveryone).length;

        const summary: ConversationSummary = {
          viewerId: meId,
          partner: partnerPerson,
          lastMessage,
          unreadCount,
          pinnedCount,
          mediaCount,
        };
        return summary;
      }),

    getMessages: () =>
      store.simulate(() => {
        const { messages } = store.read().chat;
        return messages.filter((m) => !m.deletedForMe);
      }),

    sendMessage: (input: SendMessageInput) =>
      store.simulate(() => {
        const { meId, partnerPerson } = getMeAndPartner();
        const nowIso = now().toString();
        const newId = localIdOf();

        let replyPreview = null;
        if (input.replyToId) {
          const original = store.read().chat.messages.find((m) => m.id === input.replyToId);
          if (original) {
            replyPreview = {
              id: original.id,
              senderId: original.senderId,
              senderName: original.senderId === meId ? "You" : partnerPerson.name,
              text: original.text ? original.text : (original.media?.caption ?? "Media"),
              ...(original.media ? { mediaType: original.media.type } : {}),
            };
          }
        }

        const newMessage: ChatMessage = {
          id: newId,
          senderId: meId,
          text: input.text ?? "",
          createdAt: nowIso,
          editedAt: null,
          // Media uploads first (simulated progress, P-61); words send at once.
          status: input.media === undefined ? "sent" : "sending",
          ...(input.media === undefined ? {} : { uploadProgress: 0 }),
          pinned: false,
          pinnedAt: null,
          replyTo: replyPreview,
          reactions: [],
          ...(input.media ? { media: input.media } : {}),
          ...(input.sticker ? { sticker: input.sticker } : {}),
        };

        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: [...s.chat.messages, newMessage],
          },
        }));

        return newMessage;
      }),

    editMessage: (id: string, text: string) =>
      store.simulate(() => {
        const target = store.read().chat.messages.find((m) => m.id === id);
        if (!target) throw new Error(`Message not found: ${id}`);
        const nowIso = now().toString();
        const updated: ChatMessage = {
          ...target,
          text,
          editedAt: nowIso,
        };

        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) => (m.id === id ? updated : m)),
          },
        }));

        return updated;
      }),

    deleteMessage: (id: string, mode: "for-me" | "for-everyone") =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) => {
              if (m.id === id) {
                if (mode === "for-me") {
                  return { ...m, deletedForMe: true };
                } else {
                  const cleaned = { ...m };
                  delete cleaned.media;
                  return {
                    ...cleaned,
                    deletedForEveryone: true,
                    text: "This message was removed.",
                    reactions: [],
                  };
                }
              }
              return m;
            }),
          },
        }));
      }),

    toggleReaction: (messageId: string, emoji: string) =>
      store.simulate(() => {
        const target = store.read().chat.messages.find((m) => m.id === messageId);
        if (!target) throw new Error(`Message not found: ${messageId}`);

        const existingReactionIndex = target.reactions.findIndex((r) => r.emoji === emoji);
        const newReactions = [...target.reactions];

        if (existingReactionIndex >= 0) {
          const existing = newReactions[existingReactionIndex];
          if (existing) {
            if (existing.reactedByMe) {
              if (existing.count <= 1) {
                newReactions.splice(existingReactionIndex, 1);
              } else {
                newReactions[existingReactionIndex] = {
                  ...existing,
                  count: existing.count - 1,
                  reactedByMe: false,
                };
              }
            } else {
              newReactions[existingReactionIndex] = {
                ...existing,
                count: existing.count + 1,
                reactedByMe: true,
              };
            }
          }
        } else {
          newReactions.push({ emoji, count: 1, reactedByMe: true });
        }

        const updated: ChatMessage = { ...target, reactions: newReactions };

        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) => (m.id === messageId ? updated : m)),
          },
        }));

        return updated;
      }),

    togglePin: (messageId: string) =>
      store.simulate(() => {
        const target = store.read().chat.messages.find((m) => m.id === messageId);
        if (!target) throw new Error(`Message not found: ${messageId}`);
        const nowIso = now().toString();
        const isPinned = !target.pinned;
        const updated: ChatMessage = {
          ...target,
          pinned: isPinned,
          pinnedAt: isPinned ? nowIso : null,
        };

        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) => (m.id === messageId ? updated : m)),
          },
        }));

        return updated;
      }),

    retryMessage: (messageId: string) =>
      store.simulate(() => {
        const target = store.read().chat.messages.find((m) => m.id === messageId);
        if (!target) throw new Error(`Message not found: ${messageId}`);
        // A media message starts its upload again from the beginning.
        const updated: ChatMessage =
          target.media === undefined
            ? { ...target, status: "sent" }
            : { ...target, status: "sending", uploadProgress: 0 };

        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) => (m.id === messageId ? updated : m)),
          },
        }));

        return updated;
      }),

    presence: () =>
      store.simulate(() => {
        const { chat } = store.read();
        // Typing only if the partner shares it; "Seen" only when both said yes (P-58, U-35).
        return {
          partnerTyping: chat.partner.typingIndicators && chat.partnerTyping,
          seenUpTo: receiptsActive(chat.settings.readReceipts, chat.partner.readReceipts)
            ? chat.partnerSeenUpTo
            : null,
          partnerHere:
            receiptsActive(chat.settings.readReceipts, chat.partner.readReceipts) &&
            chat.partnerInChat,
        };
      }),

    cancelUpload: (messageId: string) =>
      store.simulate(() => {
        // Never sent: an unfinished upload simply goes away.
        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.filter((m) => !(m.id === messageId && m.status !== "sent")),
          },
        }));
      }),

    markRead: () =>
      store.simulate(() => {
        const at = now().toString();
        store.update((s) =>
          s.chat.readUpTo === at ? s : { ...s, chat: { ...s.chat, readUpTo: at } },
        );
      }),

    markSaved: (messageId: string) =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) =>
              m.id === messageId ? { ...m, savedAsMemory: true } : m,
            ),
          },
        }));
      }),

    getSettings: () =>
      store.simulate(() => {
        return store.read().chat.settings;
      }),

    updateSettings: (patch: Partial<ChatSettings>) =>
      store.simulate(() => {
        let nextSettings: ChatSettings = store.read().chat.settings;
        store.update((s) => {
          nextSettings = { ...s.chat.settings, ...patch };
          return {
            ...s,
            chat: {
              ...s.chat,
              settings: nextSettings,
            },
          };
        });
        return nextSettings;
      }),

    search: (query: string) =>
      store.simulate(() => {
        const { messages } = store.read().chat;
        return searchChatMessages(messages, query);
      }),

    getPinned: () =>
      store.simulate(() => {
        const { messages } = store.read().chat;
        return messages.filter((m) => m.pinned && !m.deletedForMe && !m.deletedForEveryone);
      }),

    getSharedMedia: () =>
      store.simulate(() => {
        const { messages } = store.read().chat;
        return messages.filter((m) => Boolean(m.media) && !m.deletedForMe && !m.deletedForEveryone);
      }),
  };
}
