import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Temporal } from "temporal-polyfill";
import { publishWidgets, widgetsSupported } from "@/widgets/publish";
import {
  buildProductionWidgetSnapshot,
  buildWidgetSnapshot,
  type ProductionWidgetSession,
} from "@/widgets/snapshot";
import { MockStore } from "./mock/MockStore";
import { withApiAreas } from "./http/apiRepositories";
import { API_AREAS_ON, API_URL } from "./http/config";
import { createMockRepositories } from "./mock/mockRepositories";
import type { Repositories } from "./repositories/types";
import { SqliteStore } from "./sqlite/sqliteStore";

interface DataContextValue {
  repositories: Repositories;
  /** Prototype-only controls (Reset Demo Data, simulated offline/failure). */
  demo: MockStore;
  sqlite: SqliteStore;
}

const DataContext = createContext<DataContextValue | null>(null);

export function RepositoryProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: MockStore;
}) {
  const [sqlite] = useState(() => new SqliteStore());

  const value = useMemo<DataContextValue>(() => {
    const demo = store ?? new MockStore();
    // Areas named in EXPO_PUBLIC_API_AREAS use the API; the rest stay on mock data (P-76).
    return {
      demo,
      sqlite,
      repositories: withApiAreas(createMockRepositories(demo), demo, API_URL, API_AREAS_ON, sqlite),
    };
  }, [store, sqlite]);

  return (
    <DataContext.Provider value={value}>
      <DemoQuerySync store={value.demo} />
      {widgetsSupported() ? <WidgetSync store={value.demo} sqlite={value.sqlite} /> : null}
      {children}
    </DataContext.Provider>
  );
}

/** Query roots that belong to an area on the API: the mock store says nothing about them. */
const API_ROOTS: ReadonlySet<unknown> = new Set<unknown>(API_AREAS_ON);

/**
 * Prototype controls (SYS-06) change the mock store directly; refresh cached queries whenever
 * it changes so every screen reflects the new simulated state. Queries on the API are left
 * alone: sample chat moving along must not mean a round trip to the server.
 */
function DemoQuerySync({ store }: { store: MockStore }) {
  const client = useQueryClient();
  // Never cancel a refetch already on its way: with simulated latency and frequent changes
  // (upload progress, P-61) cancelling would keep every screen from ever updating.
  useEffect(
    () =>
      store.subscribe(
        () =>
          void client.invalidateQueries(
            { predicate: (q) => !API_ROOTS.has(q.queryKey[0]) },
            { cancelRefetch: false },
          ),
      ),
    [store, client],
  );
  return null;
}

/**
 * Android (P-73, P-91): keeps the home-screen widgets in step with the app.
 * In production builds with SQLite and an active session, builds the snapshot directly from SQLite.
 * Otherwise falls back smoothly to the store snapshot.
 */
function WidgetSync({ store, sqlite }: { store: MockStore; sqlite: SqliteStore }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const publish = async () => {
      try {
        const s = store.read();
        const meId = s.auth.status.kind === "signedIn" ? s.auth.status.userId : null;
        if (meId) {
          const profile = s.profiles.byUser[meId];
          const partner = s.profiles.partner;
          if (profile && partner.name.length > 0 && profile.side && partner.side) {
            const session: ProductionWidgetSession = {
              userId: meId,
              relationshipId: s.relationship.id,
              mySide: profile.side,
              partnerSide: partner.side,
              myZone: profile.timeZone ?? "Europe/London",
              partnerZone: partner.timeZone,
              partnerName: partner.name,
              togetherDate: s.profiles.togetherSince,
            };
            const snap = await buildProductionWidgetSnapshot(
              sqlite,
              session,
              Temporal.Now.instant(),
            );
            publishWidgets(snap);
            return;
          }
        }
        publishWidgets(buildWidgetSnapshot(store.read(), Temporal.Now.instant()));
      } catch {
        // The widgets keep their last picture; the app is never affected.
      }
    };
    void publish();
    const off = store.subscribe(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        void publish();
      }, 1000);
    });
    return () => {
      off();
      if (timer !== null) clearTimeout(timer);
    };
  }, [store, sqlite]);
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
