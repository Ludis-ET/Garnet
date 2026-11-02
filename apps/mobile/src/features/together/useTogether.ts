/** Data hooks for Our World's plans, places and soundtrack (prompt 13), via TogetherRepository. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { TogetherRepository } from "@/data/repositories/types";

export const togetherKeys = {
  all: ["together"] as const,
  plans: ["together", "plans"] as const,
  places: ["together", "places"] as const,
  songs: ["together", "songs"] as const,
};

export function usePlans() {
  const { together } = useRepositories();
  return useQuery({ queryKey: togetherKeys.plans, queryFn: () => together.plans() });
}
export function usePlaces() {
  const { together } = useRepositories();
  return useQuery({ queryKey: togetherKeys.places, queryFn: () => together.places() });
}
export function useSongs() {
  const { together } = useRepositories();
  return useQuery({ queryKey: togetherKeys.songs, queryFn: () => together.songs() });
}

function useTogetherMutation<T, R>(run: (r: TogetherRepository, input: T) => Promise<R>) {
  const { together } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => run(together, input),
    onSettled: () => client.invalidateQueries({ queryKey: togetherKeys.all }),
  });
}

export const useSavePlan = () =>
  useTogetherMutation((r, input: Parameters<TogetherRepository["savePlan"]>[0]) =>
    r.savePlan(input),
  );
export const useCompletePlan = () => useTogetherMutation((r, id: string) => r.completePlan(id));
export const useDeletePlan = () => useTogetherMutation((r, id: string) => r.deletePlan(id));
export const useAddPlace = () =>
  useTogetherMutation((r, input: Parameters<TogetherRepository["addPlace"]>[0]) =>
    r.addPlace(input),
  );
export const useDeletePlace = () => useTogetherMutation((r, id: string) => r.deletePlace(id));
export const useAddSong = () =>
  useTogetherMutation((r, input: Parameters<TogetherRepository["addSong"]>[0]) => r.addSong(input));
export const useDeleteSong = () => useTogetherMutation((r, id: string) => r.deleteSong(id));
