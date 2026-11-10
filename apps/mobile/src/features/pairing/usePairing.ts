/**
 * Data hooks for pairing (PAIR-01 to PAIR-07). Screens never touch fixtures or the store
 * directly (apps/mobile/AGENTS.md rule 1): everything goes through PairingRepository.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { PairingRepository } from "@/data/repositories/types";

export const pairingKeys = {
  all: ["pairing"] as const,
  status: ["pairing", "status"] as const,
};

export function usePairingStatus(enabled = true, refetchInterval?: number) {
  const { pairing } = useRepositories();
  return useQuery({
    queryKey: pairingKeys.status,
    queryFn: () => pairing.status(),
    enabled,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  });
}

/** A pairing action that refreshes the pairing state afterwards. */
function usePairingMutation<TInput, TResult>(
  run: (pairing: PairingRepository, input: TInput) => Promise<TResult>,
) {
  const { pairing } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => run(pairing, input),
    onSettled: () => client.invalidateQueries({ queryKey: pairingKeys.all }),
  });
}

function usePairingAction<TResult>(run: (pairing: PairingRepository) => Promise<TResult>) {
  const { pairing } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => run(pairing),
    onSettled: () => client.invalidateQueries({ queryKey: pairingKeys.all }),
  });
}

export const useCreateInvite = () => usePairingAction((p) => p.createInvite());
export const useRevokeInvite = () => usePairingAction((p) => p.revokeInvite());
export const useCheckCode = () => usePairingMutation((p, code: string) => p.checkCode(code));
export const useAcceptInvite = () => usePairingAction((p) => p.accept());
export const useDeclineInvite = () => usePairingAction((p) => p.decline());
