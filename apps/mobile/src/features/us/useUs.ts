/** Data hooks for Us (US-01 to US-10), through UsRepository only (rule 1). */
import type { SignalId } from "@garnet/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SignalPayload, SignalResponse } from "@/domain/us";

export const usKeys = {
  all: ["us"] as const,
  overview: ["us", "overview"] as const,
  history: ["us", "history"] as const,
};

export function useUsOverview() {
  const { us } = useRepositories();
  return useQuery({ queryKey: usKeys.overview, queryFn: () => us.overview() });
}

export function useSignalHistory() {
  const { us } = useRepositories();
  return useQuery({ queryKey: usKeys.history, queryFn: () => us.history() });
}

/** Signals also surface on Home, so every change refreshes both. */
function useUsMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: usKeys.all }),
        client.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useSendSignalWith() {
  const { us } = useRepositories();
  return useUsMutation((input: { signal: SignalId; payload: SignalPayload }) =>
    us.send(input.signal, input.payload),
  );
}

export function useRespond() {
  const { us } = useRepositories();
  return useUsMutation((input: { id: string; response: SignalResponse }) =>
    us.respond(input.id, input.response),
  );
}
