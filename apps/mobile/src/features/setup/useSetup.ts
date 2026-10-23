/**
 * Data hooks for identity and setup (SETUP-01 to SETUP-08). Screens go through SetupRepository
 * only (apps/mobile/AGENTS.md rule 1).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SetupRepository } from "@/data/repositories/types";
import type { GemSide } from "@/domain/identity";

export const setupKeys = { all: ["setup"] as const };

/** Only for signed-in people; pass `enabled: false` elsewhere. */
export function useSetupState(enabled = true) {
  const { setup } = useRepositories();
  return useQuery({ queryKey: setupKeys.all, queryFn: () => setup.get(), enabled });
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
