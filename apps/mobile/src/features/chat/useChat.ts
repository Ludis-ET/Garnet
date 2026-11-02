import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SendMessageInput } from "@/data/repositories/types";
import type { ChatMessage, ChatSettings } from "@/domain/chat";

export const CHAT_QUERY_KEYS = {
  summary: ["chat", "summary"] as const,
  messages: ["chat", "messages"] as const,
  settings: ["chat", "settings"] as const,
  presence: ["chat", "presence"] as const,
  pinned: ["chat", "pinned"] as const,
  sharedMedia: ["chat", "sharedMedia"] as const,
  search: (q: string) => ["chat", "search", q] as const,
};

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
  return useQuery({ queryKey: CHAT_QUERY_KEYS.presence, queryFn: () => chat.presence() });
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
