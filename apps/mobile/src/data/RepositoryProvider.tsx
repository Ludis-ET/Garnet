import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Temporal } from "temporal-polyfill";
import { publishWidgets, widgetsSupported } from "@/widgets/publish";
import { buildWidgetSnapshot } from "@/widgets/snapshot";
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
      {widgetsSupported() ? <WidgetSync store={value.demo} /> : null}
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
  // Never cancel a refetch already on its way: with simulated latency and frequent changes
  // (upload progress, P-61) cancelling would keep every screen from ever updating.
  useEffect(
    () => store.subscribe(() => void client.invalidateQueries(undefined, { cancelRefetch: false })),
    [store, client],
  );
  return null;
}

/**
 * Android (P-73): keeps the home-screen widgets in step with the demo. A second after things
 * settle, the content-free snapshot is rebuilt and the widgets redrawn.
 */
function WidgetSync({ store }: { store: MockStore }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const publish = () => {
      try {
        publishWidgets(buildWidgetSnapshot(store.read(), Temporal.Now.instant()));
      } catch {
        // The widgets keep their last picture; the app is never affected.
      }
    };
    publish();
    const off = store.subscribe(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(publish, 1000);
    });
    return () => {
      off();
      if (timer !== null) clearTimeout(timer);
    };
  }, [store]);
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
