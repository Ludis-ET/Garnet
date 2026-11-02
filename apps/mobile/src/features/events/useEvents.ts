/** Data hooks for Events and chapters (EVT-01 to EVT-09), through EventsRepository only. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { EventInput } from "@/data/repositories/types";
import type { ChapterPromptId } from "@/domain/events";

export const eventKeys = {
  all: ["events"] as const,
  list: ["events", "list"] as const,
  one: (id: string) => ["events", "one", id] as const,
  chapters: ["events", "chapters"] as const,
  chapter: (month: string) => ["events", "chapter", month] as const,
};

export function useEvents() {
  const { events } = useRepositories();
  return useQuery({ queryKey: eventKeys.list, queryFn: () => events.list() });
}

export function useEvent(id: string) {
  const { events } = useRepositories();
  return useQuery({ queryKey: eventKeys.one(id), queryFn: () => events.get(id) });
}

export function useChapters() {
  const { events } = useRepositories();
  return useQuery({ queryKey: eventKeys.chapters, queryFn: () => events.chapters() });
}

export function useChapter(month: string) {
  const { events } = useRepositories();
  return useQuery({ queryKey: eventKeys.chapter(month), queryFn: () => events.chapter(month) });
}

/** Events also show on Home (coming up, birthdays), so every change refreshes both. */
function useEventMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: eventKeys.all }),
        client.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useSaveEvent() {
  const { events } = useRepositories();
  return useEventMutation((input: EventInput) => events.save(input));
}

export function useRemoveEvent() {
  const { events } = useRepositories();
  return useEventMutation((id: string) => events.remove(id));
}

export function useReflect() {
  const { events } = useRepositories();
  return useEventMutation((input: { month: string; prompt: ChapterPromptId; text: string }) =>
    events.reflect(input.month, input.prompt, input.text),
  );
}

export function useRenameChapter() {
  const { events } = useRepositories();
  return useEventMutation((input: { month: string; title: string }) =>
    events.rename(input.month, input.title),
  );
}
