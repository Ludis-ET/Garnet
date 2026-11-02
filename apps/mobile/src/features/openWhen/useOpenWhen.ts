import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { CreateLetterInput } from "@/data/repositories/types";
import type { UnlockRule } from "@/domain/models";
import { useHomeToday } from "@/features/home/useHome";
import type { CapsuleSide } from "./components/GemCapsule";

const QUERY_KEY = ["openWhen"] as const;

export function useOpenWhenList() {
  const { openWhen } = useRepositories();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => openWhen.list(),
  });
}

export function useOpenWhenLetter(id: string) {
  const { openWhen } = useRepositories();
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => openWhen.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateDraft() {
  const { openWhen } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLetterInput) => openWhen.createDraft(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useSaveDraft() {
  const { openWhen } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateLetterInput> }) =>
      openWhen.saveDraft(id, patch),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (data.kind !== "unavailable") {
        queryClient.setQueryData([...QUERY_KEY, data.id], data);
      }
    },
  });
}

export function useSealLetter() {
  const { openWhen } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, unlock }: { id: string; unlock: UnlockRule }) => openWhen.seal(id, unlock),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (data.kind !== "unavailable") {
        queryClient.setQueryData([...QUERY_KEY, data.id], data);
      }
    },
  });
}

export function useOpenLetter() {
  const { openWhen } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => openWhen.open(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (result.ok && result.view.kind !== "unavailable") {
        queryClient.setQueryData([...QUERY_KEY, result.view.id], result.view);
      }
    },
  });
}

export function useDeleteLetter() {
  const { openWhen } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => openWhen.deleteLetter(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Each person's gem colour for letters, from what they chose in setup (P-57): the viewer's own
 * letters wear their side, the partner's theirs; Garnet violet before a side is chosen.
 */
export function useLetterSides(): { mine: CapsuleSide; theirs: CapsuleSide } {
  const today = useHomeToday().data;
  return { mine: today?.me.side ?? "garnet", theirs: today?.partner.side ?? "garnet" };
}
