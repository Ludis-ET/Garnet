/** Data hooks for Home (HOME-01 to HOME-05), through HomeRepository only (rule 1). */
import type { SignalId } from "@garnet/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";

export const homeKeys = { all: ["home"] as const };

export function useHomeToday() {
  const { home } = useRepositories();
  return useQuery({ queryKey: homeKeys.all, queryFn: () => home.today() });
}

function useHomeMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    // Home writes reach Days (moments) and Us (signals) too.
    onSettled: async () => {
      await Promise.all(
        [homeKeys.all, ["days"], ["us"]].map((queryKey) => client.invalidateQueries({ queryKey })),
      );
    },
  });
}

export function useLogMoment() {
  const { home } = useRepositories();
  return useHomeMutation((input: { text: string; emoji: string; share: boolean }) =>
    home.logMoment(input),
  );
}

export function useSendSignal() {
  const { home } = useRepositories();
  return useHomeMutation((signal: SignalId) => home.sendSignal(signal));
}

export function useDismissIncoming() {
  const { home } = useRepositories();
  return useHomeMutation((id: string) => home.dismissIncoming(id));
}
