import type { Temporal } from "temporal-polyfill";
import type { ChatRepository, SendMessageInput } from "@/data/repositories/types";
import {
  searchChatMessages,
  type ChatMessage,
  type ChatSettings,
  type ConversationSummary,
} from "@/domain/chat";
import type { MockStore } from "./MockStore";

export function createMockChat(
  store: MockStore,
  now: () => Temporal.Instant,
  localIdOf: () => string,
): ChatRepository {
  const getMeAndPartner = () => {
    const { meId, profiles } = store.read();
    const partnerProfile = profiles.partner;

    return {
      meId,
      partnerPerson: {
        name: partnerProfile.name,
        side: partnerProfile.side ?? "sapphire",
        zone: partnerProfile.timeZone,
      },
    };
  };

  return {
    getSummary: () =>
      store.simulate(() => {
        const { meId, partnerPerson } = getMeAndPartner();
        const { messages } = store.read().chat;
        const visible = messages.filter((m) => !m.deletedForMe);
        const lastMessage = visible[visible.length - 1] ?? null;

        const unreadCount =
          visible.filter((m) => m.senderId !== meId && !m.deletedForEveryone).length > 0 ? 1 : 0; // Simulated 1 unread conversation dot

        const pinnedCount = visible.filter((m) => m.pinned && !m.deletedForEveryone).length;
        const mediaCount = visible.filter((m) => Boolean(m.media) && !m.deletedForEveryone).length;

        const summary: ConversationSummary = {
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
          status: "sent",
          pinned: false,
          pinnedAt: null,
          replyTo: replyPreview,
          reactions: [],
          ...(input.media ? { media: input.media } : {}),
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
        const updated: ChatMessage = { ...target, status: "sent" };

        store.update((s) => ({
          ...s,
          chat: {
            ...s.chat,
            messages: s.chat.messages.map((m) => (m.id === messageId ? updated : m)),
          },
        }));

        return updated;
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
