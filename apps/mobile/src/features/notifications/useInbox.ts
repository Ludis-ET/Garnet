/** Data hooks for the in-app notification centre (NOTIF-01), through InboxRepository (rule 1). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";

export const inboxKeys = { all: ["inbox"] as const };

export function useInbox() {
  const { inbox } = useRepositories();
  return useQuery({ queryKey: inboxKeys.all, queryFn: () => inbox.list() });
}

/**
 * What's new for the bell (this person's own; never shared). Emotional signals are never
 * counted (SYS-05: a dot, never a count of emotional signals), so they only light the dot.
 */
export function useUnreadCount(): number {
  return (useInbox().data ?? []).filter((i) => i.unread && i.group !== "signals").length;
}

/** Whether anything is new at all, signals included (the dot). */
export function useHasUnread(): boolean {
  return (useInbox().data ?? []).some((i) => i.unread);
}

function useInboxMutation<T>(run: (input: T) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => client.invalidateQueries({ queryKey: inboxKeys.all }),
  });
}

export function useMarkRead() {
  const { inbox } = useRepositories();
  return useInboxMutation((id: string) => inbox.markRead(id));
}
export function useMarkAllRead() {
  const { inbox } = useRepositories();
  return useInboxMutation<undefined>(() => inbox.markAllRead());
}

export function useMarkUnread() {
  const { inbox } = useRepositories();
  return useInboxMutation((id: string) => inbox.markUnread(id));
}
