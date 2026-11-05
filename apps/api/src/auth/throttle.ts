import { createHash } from "node:crypto";

/**
 * Per-account back-off (P-78, ADR-0006): after a few free tries, each further one waits twice as
 * long as the last, up to a ceiling, and everything is forgotten after a quiet spell or on
 * success. Never a permanent lockout (that would let anyone lock the other person out). Keys are
 * hashes of the email, so the same answer comes for an address with or without an account.
 *
 * In memory, which is right for one local API process (B1); a shared store comes with hosting
 * (U-07), like AttemptLimiter.
 */
export interface BackoffRule {
  /** Tries allowed before any wait. */
  free: number;
  /** The first wait; each later one doubles. */
  baseMs: number;
  /** The longest wait. */
  capMs: number;
  /** After this long without a try, the key starts afresh. */
  forgetMs: number;
}

/** Wrong passwords for one email: 5 free, then 30 s, 1 min, 2 min … at most 15 min. */
export const SIGN_IN_BACKOFF: BackoffRule = {
  free: 5,
  baseMs: 30_000,
  capMs: 15 * 60_000,
  forgetMs: 24 * 60 * 60_000,
};

/** Emails sent to one address (verification, reset, "account exists"): 3 free, then 1 min … 1 h. */
export const MAIL_BACKOFF: BackoffRule = {
  free: 3,
  baseMs: 60_000,
  capMs: 60 * 60_000,
  forgetMs: 6 * 60 * 60_000,
};

/** Keys kept before old ones are swept, so a flood of made-up emails can't grow memory. */
export const MAX_KEYS = 10_000;

export class Backoff {
  readonly #state = new Map<string, { tries: number; last: number }>();

  constructor(
    private readonly rule: BackoffRule,
    private readonly now: () => number = Date.now,
  ) {}

  /** Keys currently remembered. */
  get size(): number {
    return this.#state.size;
  }

  /** How long `key` must wait before its next try, in ms; 0 when it may try now. */
  waitMs(key: string): number {
    const s = this.#live(key);
    if (s === undefined || s.tries < this.rule.free) return 0;
    const delay = Math.min(this.rule.baseMs * 2 ** (s.tries - this.rule.free), this.rule.capMs);
    return Math.max(0, s.last + delay - this.now());
  }

  /** Counts one try for `key` (a wrong password, an email sent). */
  record(key: string): void {
    const s = this.#live(key) ?? { tries: 0, last: 0 };
    this.#state.delete(key);
    this.#state.set(key, { tries: s.tries + 1, last: this.now() });
    if (this.#state.size > MAX_KEYS) this.#sweep();
  }

  /** Forgets `key` (a successful sign-in). */
  clear(key: string): void {
    this.#state.delete(key);
  }

  #live(key: string): { tries: number; last: number } | undefined {
    const s = this.#state.get(key);
    if (s !== undefined && this.now() - s.last >= this.rule.forgetMs) {
      this.#state.delete(key);
      return undefined;
    }
    return s;
  }

  /** Drops forgotten keys, then the least recently tried ones, down to MAX_KEYS. */
  #sweep(): void {
    for (const key of [...this.#state.keys()]) this.#live(key);
    for (const key of this.#state.keys()) {
      if (this.#state.size <= MAX_KEYS) break;
      this.#state.delete(key);
    }
  }
}

/** The key for an email: trimmed, lower-cased and hashed, never the address itself. */
export function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}
