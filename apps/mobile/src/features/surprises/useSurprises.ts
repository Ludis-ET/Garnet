/** Data hooks for Surprises (SUR-01 to SUR-07), through SurprisesRepository only (rule 1). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SurprisesRepository } from "@/data/repositories/types";

export const surpriseKeys = { all: ["surprises"] as const };

export function useSurprises() {
  const { surprises } = useRepositories();
  return useQuery({ queryKey: surpriseKeys.all, queryFn: () => surprises.list() });
}

export function useSurprise(id: string) {
  const { surprises } = useRepositories();
  return useQuery({ queryKey: [...surpriseKeys.all, id], queryFn: () => surprises.get(id) });
}

function useSurpriseMutation<T, R>(run: (r: SurprisesRepository, input: T) => Promise<R>) {
  const { surprises } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => run(surprises, input),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: surpriseKeys.all }),
        client.invalidateQueries({ queryKey: ["inbox"] }),
      ]),
  });
}

export const useCreateSurprise = () =>
  useSurpriseMutation((r, input: Parameters<SurprisesRepository["create"]>[0]) => r.create(input));
export const useOpenSurprise = () => useSurpriseMutation((r, id: string) => r.open(id));
export const useCancelSurprise = () => useSurpriseMutation((r, id: string) => r.cancel(id));
export const useRetitleSurprise = () =>
  useSurpriseMutation((r, input: { id: string; title: string | null }) =>
    r.retitle(input.id, input.title),
  );
export const useRetrySurprise = () => useSurpriseMutation((r, id: string) => r.retry(id));
