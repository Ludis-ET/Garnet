/** Data hooks for Memories (MEM-01 to MEM-10), through MemoriesRepository only (rule 1). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { MemoryInput } from "@/data/repositories/types";
import { NO_MEMORY_FILTER, type MemoryFilter } from "@/domain/memories";

export const memoryKeys = {
  all: ["memories"] as const,
  list: (f: MemoryFilter) => ["memories", "list", f] as const,
  one: (id: string) => ["memories", "one", id] as const,
  collections: ["memories", "collections"] as const,
  collection: (id: string) => ["memories", "collection", id] as const,
  start: ["memories", "start"] as const,
};

export function useMemories(filter: MemoryFilter = NO_MEMORY_FILTER) {
  const { memories } = useRepositories();
  return useQuery({ queryKey: memoryKeys.list(filter), queryFn: () => memories.list(filter) });
}

export function useMemory(id: string) {
  const { memories } = useRepositories();
  return useQuery({ queryKey: memoryKeys.one(id), queryFn: () => memories.get(id) });
}

export function useCollections() {
  const { memories } = useRepositories();
  return useQuery({ queryKey: memoryKeys.collections, queryFn: () => memories.collections() });
}

export function useCollection(id: string) {
  const { memories } = useRepositories();
  return useQuery({ queryKey: memoryKeys.collection(id), queryFn: () => memories.collection(id) });
}

export function useStart() {
  const { memories } = useRepositories();
  return useQuery({ queryKey: memoryKeys.start, queryFn: () => memories.start() });
}

/** Memories also show in chapters, so every change refreshes both. */
function useMemoryMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: memoryKeys.all }),
        client.invalidateQueries({ queryKey: ["events"] }),
      ]);
    },
  });
}

export function useSaveMemory() {
  const { memories } = useRepositories();
  return useMemoryMutation((input: MemoryInput) => memories.save(input));
}

export function useRemoveMemory() {
  const { memories } = useRepositories();
  return useMemoryMutation((id: string) => memories.remove(id));
}

export function useCreateCollection() {
  const { memories } = useRepositories();
  return useMemoryMutation((input: { title: string; description: string }) =>
    memories.createCollection(input),
  );
}

export function useDeleteCollection() {
  const { memories } = useRepositories();
  return useMemoryMutation((id: string) => memories.deleteCollection(id));
}

export function useSetInCollection() {
  const { memories } = useRepositories();
  return useMemoryMutation((input: { memoryId: string; collectionId: string; inIt: boolean }) =>
    memories.setInCollection(input.memoryId, input.collectionId, input.inIt),
  );
}
