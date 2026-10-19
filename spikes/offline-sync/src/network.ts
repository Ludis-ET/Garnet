/** Deterministic PRNG (mulberry32) so every failing scenario is reproducible from its seed. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface FaultRates {
  /** Request never reaches the server. */
  readonly dropRequest: number;
  /** Server applies the request but the response is lost — the classic duplicate-retry case. */
  readonly dropResponse: number;
  /** An intermediary delivers the same request twice. */
  readonly duplicate: number;
}

export const NO_FAULTS: FaultRates = { dropRequest: 0, dropResponse: 0, duplicate: 0 };

export class FaultyNetwork {
  faults: FaultRates;

  constructor(
    private readonly random: () => number,
    faults: FaultRates,
  ) {
    this.faults = faults;
  }

  /** Returns the server's answer, or undefined when the round trip failed. */
  call<T>(handler: () => T): T | undefined {
    if (this.random() < this.faults.dropRequest) return undefined;
    let result = handler();
    if (this.random() < this.faults.duplicate) result = handler();
    if (this.random() < this.faults.dropResponse) return undefined;
    return result;
  }
}
