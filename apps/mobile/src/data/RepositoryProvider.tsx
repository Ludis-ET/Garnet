import { createContext, useContext, useMemo, type ReactNode } from "react";
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
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
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
