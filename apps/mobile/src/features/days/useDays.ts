/** Data hooks for Days (DAYS-01 to DAYS-11), through DaysRepository only (rule 1). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { EntryInput } from "@/data/repositories/types";
import type { EntryFilter, Visibility } from "@/domain/days";

export const daysKeys = {
  all: ["days"] as const,
  overview: ["days", "overview"] as const,
  day: (date: string) => ["days", "day", date] as const,
  entry: (id: string) => ["days", "entry", id] as const,
  search: (filter: EntryFilter) => ["days", "search", filter] as const,
};

export function useDaysOverview() {
  const { days } = useRepositories();
  return useQuery({ queryKey: daysKeys.overview, queryFn: () => days.overview() });
}

export function useDay(date: string) {
  const { days } = useRepositories();
  return useQuery({ queryKey: daysKeys.day(date), queryFn: () => days.day(date) });
}

export function useEntry(id: string | null) {
  const { days } = useRepositories();
  return useQuery({
    queryKey: daysKeys.entry(id ?? ""),
    queryFn: () => days.entry(id ?? ""),
    enabled: id !== null,
  });
}

export function useSearch(filter: EntryFilter | null) {
  const { days } = useRepositories();
  const empty: EntryFilter = { query: "", kinds: [], who: "both" };
  return useQuery({
    queryKey: daysKeys.search(filter ?? empty),
    queryFn: () => days.search(filter ?? empty),
    enabled: filter !== null,
  });
}

/** Moments also show on Home, so every change refreshes both. */
function useDaysMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: daysKeys.all }),
        client.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useSaveEntry() {
  const { days } = useRepositories();
  return useDaysMutation((input: EntryInput) => days.save(input));
}

export function useSetVisibility() {
  const { days } = useRepositories();
  return useDaysMutation((input: { id: string; visibility: Visibility }) =>
    days.setVisibility(input.id, input.visibility),
  );
}

export function useRemoveEntry() {
  const { days } = useRepositories();
  return useDaysMutation((id: string) => days.remove(id));
}

export function useRetryUpload() {
  const { days } = useRepositories();
  return useDaysMutation((id: string) => days.retryUpload(id));
}

export function useFinishDay() {
  const { days } = useRepositories();
  return useDaysMutation((date: string) => days.finishDay(date));
}
