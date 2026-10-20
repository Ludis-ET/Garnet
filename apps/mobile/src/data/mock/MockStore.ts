import { createDemoState, type DemoState } from "@/data/fixtures/demo";

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
    this.state = createDemoState();
    this.settings = { latencyMs: 350, failCalls: false, offline: false, ...settings };
  }

  read(): Readonly<DemoState> {
    return this.state;
  }

  update(mutate: (draft: DemoState) => DemoState): void {
    this.state = mutate(this.state);
    this.emit();
  }

  /** "Reset Demo Data" (spec A3): restores the seeded baseline exactly. */
  reset(): void {
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
