import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import { API_AREAS_ON, API_URL } from "@/data/http/config";
import { getGarnetAuthClient } from "@/data/http/authClient";
import { connectChatStream } from "@/data/http/chatStream";
import { toChatMessage } from "@/data/http/httpChat";
import type { ChatMessageDto } from "@garnet/contracts";
import type { SendMessageInput } from "@/data/repositories/types";
import type { ChatMessage, ChatPresence, ChatSettings } from "@/domain/chat";

export const CHAT_QUERY_KEYS = {
  summary: ["chat", "summary"] as const,
  messages: ["chat", "messages"] as const,
  settings: ["chat", "settings"] as const,
  presence: ["chat", "presence"] as const,
  pinned: ["chat", "pinned"] as const,
  sharedMedia: ["chat", "sharedMedia"] as const,
  search: (q: string) => ["chat", "search", q] as const,
};

/**
 * Real-time Server-Sent Events stream for live chat delivery, typing indicators,
 * reactions, pin updates, and message edits without polling.
 */
export function useChatStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!API_URL || !API_AREAS_ON.has("chat")) return;

    const auth = getGarnetAuthClient(API_URL);
    const conn = connectChatStream(
      API_URL,
      async () => {
        const cookie = await auth.getCookie();
        return cookie ? { cookie } : {};
      },
      (msg) => {
        if (msg.type === "message_received" && msg.payload) {
          const dto = msg.payload as ChatMessageDto;
          queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) => {
            if (!old) return [toChatMessage(dto)];
            if (old.some((m) => m.id === dto.id)) return old;
            return [...old, toChatMessage(dto)];
          });
          void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
        } else if (msg.type === "message_edited" && msg.payload) {
          const dto = msg.payload as ChatMessageDto;
          const updated = toChatMessage(dto);
          queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
            old ? old.map((m) => (m.id === updated.id ? updated : m)) : [updated],
          );
        } else if (msg.type === "message_deleted" && msg.payload) {
          const p = msg.payload as { id: string; mode: string };
          queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) => {
            if (!old) return [];
            if (p.mode === "for-me") return old.filter((m) => m.id !== p.id);
            return old.map((m) =>
              m.id === p.id
                ? {
                    ...m,
                    deletedForEveryone: true,
                    text: "This message was removed.",
                    reactions: [],
                  }
                : m,
            );
          });
          void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
        } else if (msg.type === "reaction_updated" && msg.payload) {
          const dto = msg.payload as ChatMessageDto;
          const updated = toChatMessage(dto);
          queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
            old ? old.map((m) => (m.id === updated.id ? updated : m)) : [updated],
          );
        } else if (msg.type === "pin_updated" && msg.payload) {
          const dto = msg.payload as ChatMessageDto;
          const updated = toChatMessage(dto);
          queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
            old ? old.map((m) => (m.id === updated.id ? updated : m)) : [updated],
          );
          void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.pinned });
        } else if (msg.type === "typing" && msg.payload) {
          const p = msg.payload as { typing: boolean };
          queryClient.setQueryData<ChatPresence>(CHAT_QUERY_KEYS.presence, (old) => ({
            partnerTyping: p.typing,
            seenUpTo: old?.seenUpTo ?? null,
            partnerHere: old?.partnerHere ?? false,
          }));
        } else if (msg.type === "presence" && msg.payload) {
          const p = msg.payload as { watching: boolean };
          queryClient.setQueryData<ChatPresence>(CHAT_QUERY_KEYS.presence, (old) => ({
            partnerTyping: old?.partnerTyping ?? false,
            seenUpTo: old?.seenUpTo ?? null,
            partnerHere: p.watching,
          }));
        }
      },
    );

    return () => {
      conn.close();
    };
  }, [queryClient]);
}

export function useChatSummary() {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.summary,
    queryFn: () => chat.getSummary(),
  });
}

export function useChatMessages() {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.messages,
    queryFn: () => chat.getMessages(),
  });
}

export function useSendMessage() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => chat.sendMessage(input),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
        old ? [...old, newMessage] : [newMessage],
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.sharedMedia });
    },
  });
}

export function useEditMessage() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => chat.editMessage(id, text),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
        old ? old.map((m) => (m.id === updated.id ? updated : m)) : [updated],
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.pinned });
    },
  });
}

export function useDeleteMessage() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: "for-me" | "for-everyone" }) =>
      chat.deleteMessage(id, mode),
    onSuccess: (_, { id, mode }) => {
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) => {
        if (!old) return [];
        if (mode === "for-me") {
          return old.filter((m) => m.id !== id);
        }
        return old.map((m) => {
          if (m.id !== id) return m;
          const cleaned = { ...m };
          delete cleaned.media;
          return {
            ...cleaned,
            deletedForEveryone: true,
            text: "This message was removed.",
            reactions: [],
          };
        });
      });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.pinned });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.sharedMedia });
    },
  });
}

export function useToggleReaction() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      chat.toggleReaction(messageId, emoji),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
        old ? old.map((m) => (m.id === updated.id ? updated : m)) : [updated],
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
    },
  });
}

export function useTogglePin() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => chat.togglePin(messageId),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages, (old) =>
        old ? old.map((m) => (m.id === updated.id ? updated : m)) : [updated],
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.pinned });
    },
  });
}

export function useRetryMessage() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => chat.retryMessage(messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.summary });
    },
  });
}

export function useChatPresence() {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.presence,
    queryFn: () => chat.presence(),
  });
}

export function useChatSettings() {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.settings,
    queryFn: () => chat.getSettings(),
  });
}

export function useUpdateChatSettings() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<ChatSettings>) => chat.updateSettings(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.settings });
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.presence });
    },
  });
}

export function usePinnedMessages() {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.pinned,
    queryFn: () => chat.getPinned(),
  });
}

export function useSharedMedia() {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.sharedMedia,
    queryFn: () => chat.getSharedMedia(),
  });
}

export function useSearchChat(query: string) {
  const { chat } = useRepositories();
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.search(query),
    queryFn: () => chat.search(query),
    enabled: query.trim().length > 0,
  });
}

export function useCancelUpload() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chat.cancelUpload(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });
}

export function useMarkSaved() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chat.markSaved(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages });
    },
  });
}

/** Clears this person's own unread count (P-66). Never tells the partner anything. */
export function useMarkChatRead() {
  const { chat } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => chat.markRead(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
      void queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
