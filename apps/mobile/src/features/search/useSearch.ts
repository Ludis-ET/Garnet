/** Data hooks for universal search (SEARCH-01, SEARCH-02), through SearchRepository (rule 1). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SearchFilters } from "@/data/repositories/types";

export const searchKeys = {
  all: ["search"] as const,
  recent: ["search", "recent"] as const,
};

export function useSearch(query: string, filters: SearchFilters) {
  const { search } = useRepositories();
  return useQuery({
    queryKey: ["search", "results", query.trim(), filters.kinds, filters.who],
    queryFn: () => search.search(query, filters),
    enabled: query.trim().length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useRecentSearches() {
  const { search } = useRepositories();
  return useQuery({ queryKey: searchKeys.recent, queryFn: () => search.recent() });
}

function useRecentMutation<T>(run: (input: T) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => client.invalidateQueries({ queryKey: searchKeys.recent }),
  });
}

export function useRememberSearch() {
  const { search } = useRepositories();
  return useRecentMutation((q: string) => search.remember(q));
}
export function useForgetSearch() {
  const { search } = useRepositories();
  return useRecentMutation((q: string) => search.forget(q));
}
export function useClearSearches() {
  const { search } = useRepositories();
  return useRecentMutation<undefined>(() => search.clearRecent());
}
