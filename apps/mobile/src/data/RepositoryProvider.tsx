import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MockStore } from "./mock/MockStore";
import { createMockRepositories } from "./mock/mockRepositories";
import type { Repositories } from "./repositories/types";

interface DataContextValue {
  repositories: Repositories;
  /** Prototype-only controls (Reset Demo Data, simulated offline/failure). */
  demo: MockStore;
}

const DataContext = createContext<DataContextValue | null>(null);

export function RepositoryProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: MockStore;
}) {
  const value = useMemo<DataContextValue>(() => {
    const demo = store ?? new MockStore();
    return { demo, repositories: createMockRepositories(demo) };
  }, [store]);
  return (
    <DataContext.Provider value={value}>
      <DemoQuerySync store={value.demo} />
      {children}
    </DataContext.Provider>
  );
}

/**
 * Prototype controls (SYS-06) change the mock store directly; refresh cached queries whenever
 * it changes so every screen reflects the new simulated state.
 */
function DemoQuerySync({ store }: { store: MockStore }) {
  const client = useQueryClient();
  useEffect(() => store.subscribe(() => void client.invalidateQueries()), [store, client]);
  return null;
}

function useData(): DataContextValue {
  const value = useContext(DataContext);
  if (value === null) throw new Error("useRepositories must be used inside <RepositoryProvider>");
  return value;
}

/** Screens get data through feature hooks built on these repositories — never from fixtures. */
export function useRepositories(): Repositories {
  return useData().repositories;
}

export function useDemoControls(): MockStore {
  return useData().demo;
}

/** Current simulation settings (offline, failures, latency), re-rendering when they change. */
export function useSimulation(): MockStore["settings"] {
  const store = useData().demo;
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.settings,
  );
}
