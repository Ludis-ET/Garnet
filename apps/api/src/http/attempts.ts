/**
 * A small per-person limit on guessing (P-18): checking or accepting invitation codes. In memory,
 * which is right for one local API process (B1); a shared store comes with hosting (U-07).
 * Never a permanent lockout: attempts free up as the window moves on.
 */
export class AttemptLimiter {
  readonly #hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt for `key`; false when the window is already full. */
  take(key: string): boolean {
    const t = this.now();
    const recent = (this.#hits.get(key) ?? []).filter((at) => t - at < this.windowMs);
    if (recent.length >= this.max) {
      this.#hits.set(key, recent);
      return false;
    }
    recent.push(t);
    this.#hits.set(key, recent);
    return true;
  }
}
