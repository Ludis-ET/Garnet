/**
 * Data hooks for identity and setup (SETUP-01 to SETUP-08). Screens go through SetupRepository
 * only (apps/mobile/AGENTS.md rule 1).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SetupRepository } from "@/data/repositories/types";
import type { GemSide } from "@/domain/identity";

export const setupKeys = { all: ["setup"] as const };

/**
 * Only for signed-in people; pass `enabled: false` elsewhere. `refetchMs` looks again while a
 * screen waits on the partner (P-99), until realtime updates arrive (production-fix-plan R).
 */
export function useSetupState(enabled = true, refetchMs?: number) {
  const { setup } = useRepositories();
  return useQuery({
    queryKey: setupKeys.all,
    queryFn: () => setup.get(),
    enabled,
    ...(refetchMs === undefined ? {} : { refetchInterval: refetchMs }),
  });
}

function useSetupMutation<TInput, TResult>(
  run: (setup: SetupRepository, input: TInput) => Promise<TResult>,
) {
  const { setup } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => run(setup, input),
    onSettled: () => client.invalidateQueries({ queryKey: setupKeys.all }),
  });
}

export const useSaveSetup = () =>
  useSetupMutation((s, patch: Parameters<SetupRepository["save"]>[0]) => s.save(patch));
export const useChooseSide = () => useSetupMutation((s, side: GemSide) => s.chooseSide(side));
export function useCompleteSetup() {
  const { setup } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => setup.complete(),
    onSettled: () => client.invalidateQueries({ queryKey: setupKeys.all }),
  });
}

/** "Together since", for both partners (P-79). */
export function useSetTogetherSince() {
  const { setup } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (date: string | null) => setup.setTogetherSince(date),
    onSettled: () => client.invalidateQueries({ queryKey: setupKeys.all }),
  });
}

/** A picture from the gallery becomes theirs (P-98); the screens see it at once. */
export const useSetPicture = () =>
  useSetupMutation((s, picture: { base64: string }) => s.setPicture(picture));

/** Back to initials; the stored picture is removed (P-98). */
export const useClearPicture = () => useSetupMutation((s) => s.clearPicture());
