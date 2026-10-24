import { createDemoState, type DemoState } from "@/data/fixtures/demo";

const STORAGE_KEY = "garnet_demo_store_v1";

function loadPersistedState(): DemoState | null {
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DemoState> | null;
        if (parsed?.meId && parsed.users && parsed.auth && parsed.profiles) {
          const fresh = createDemoState();
          return {
            ...fresh,
            ...parsed,
            auth: { ...fresh.auth, ...parsed.auth },
            pairing: { ...fresh.pairing, ...parsed.pairing },
            profiles: { ...fresh.profiles, ...parsed.profiles },
            home: { ...fresh.home, ...parsed.home },
            days: { ...fresh.days, ...parsed.days },
            chat: { ...fresh.chat, ...parsed.chat },
          };
        }
      }
    }
  } catch {
    // Ignore storage parse or access errors
  }
  return null;
}

function savePersistedState(state: DemoState): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore quota or access errors
  }
}

function clearPersistedState(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

/**
 * In-memory demo state with simulated service behaviour (spec §6 "Mock behavior contract").
 * Nothing here talks to a network. Simulation is explicit and controllable so screens can be
 * reviewed in loading, failure, slow and offline states.
 */
export interface SimulationSettings {
  /** Artificial latency per call, in ms. 0 in tests. */
  latencyMs: number;
  /** When true, every call fails with a recoverable MockServiceError. */
  failCalls: boolean;
  /** Developer toggle for offline UI states (no real sync exists). */
  offline: boolean;
  /** When true, state changes are persisted to localStorage. Defaults to true outside test runner. */
  persist: boolean;
}

export class MockServiceError extends Error {
  constructor(readonly kind: "failure" | "offline") {
    super(kind === "offline" ? "You're offline (simulated)." : "That didn't work (simulated).");
    this.name = "MockServiceError";
  }
}

type Listener = () => void;

export class MockStore {
  private state: DemoState;
  private readonly listeners = new Set<Listener>();
  settings: SimulationSettings;

  constructor(settings: Partial<SimulationSettings> = {}) {
    const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test";
    const persist = settings.persist ?? !isTest;
    this.settings = {
      latencyMs: 350,
      failCalls: false,
      offline: false,
      persist,
      ...settings,
    };
    const loaded = persist ? loadPersistedState() : null;
    this.state = loaded ?? createDemoState();
  }

  read(): Readonly<DemoState> {
    return this.state;
  }

  update(mutate: (draft: DemoState) => DemoState): void {
    this.state = mutate(this.state);
    if (this.settings.persist) {
      savePersistedState(this.state);
    }
    this.emit();
  }

  /** Changes simulation settings (prototype panel, SYS-06) and notifies subscribers. */
  configure(settings: Partial<SimulationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.emit();
  }

  /** "Reset Demo Data" (spec A3): restores the seeded baseline exactly. */
  reset(): void {
    if (this.settings.persist) {
      clearPersistedState();
    }
    this.state = createDemoState();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Wraps a mock operation with simulated latency, failure and offline behaviour. */
  async simulate<T>(operation: () => T): Promise<T> {
    if (this.settings.latencyMs > 0)
      await new Promise((resolve) => setTimeout(resolve, this.settings.latencyMs));
    if (this.settings.offline) throw new MockServiceError("offline");
    if (this.settings.failCalls) throw new MockServiceError("failure");
    return operation();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
