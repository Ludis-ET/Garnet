import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  Backoff,
  emailKey,
  MAIL_BACKOFF,
  MAX_KEYS,
  SIGN_IN_BACKOFF,
  type BackoffRule,
} from "../src/auth/throttle";

const RULE: BackoffRule = { free: 3, baseMs: 1_000, capMs: 8_000, forgetMs: 60_000 };

function clock() {
  let t = 1_000_000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("per-account back-off (P-78)", () => {
  it("lets the free tries through, then doubles each wait up to the ceiling", () => {
    const c = clock();
    const b = new Backoff(RULE, c.now);
    const waits: number[] = [];
    for (let i = 0; i < 7; i++) {
      waits.push(b.waitMs("k"));
      b.record("k");
    }
    expect(waits).toEqual([0, 0, 0, 1_000, 2_000, 4_000, 8_000]);
    expect(b.waitMs("k")).toBe(8_000); // the ceiling, never more
  });

  it("frees a key once its wait has passed, and forgets it after a quiet spell", () => {
    const c = clock();
    const b = new Backoff(RULE, c.now);
    for (let i = 0; i < 4; i++) b.record("k");
    expect(b.waitMs("k")).toBe(2_000);
    c.advance(2_000);
    expect(b.waitMs("k")).toBe(0);
    c.advance(RULE.forgetMs);
    b.record("k");
    expect(b.waitMs("k")).toBe(0); // starting afresh: one try so far
  });

  it("clears on success and keeps keys apart", () => {
    const c = clock();
    const b = new Backoff(RULE, c.now);
    for (let i = 0; i < 5; i++) b.record("a");
    expect(b.waitMs("a")).toBeGreaterThan(0);
    expect(b.waitMs("b")).toBe(0);
    b.clear("a");
    expect(b.waitMs("a")).toBe(0);
  });

  it("property: never a lockout — every wait is at most the ceiling, and ends", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ op: "record" as const }),
            fc.record({
              op: fc.constant("advance" as const),
              ms: fc.integer({ min: 0, max: 20_000 }),
            }),
          ),
          { minLength: 1, maxLength: 200 },
        ),
        (ops) => {
          const c = clock();
          const b = new Backoff(RULE, c.now);
          for (const o of ops) {
            if (o.op === "record") b.record("k");
            else c.advance(o.ms);
            const wait = b.waitMs("k");
            expect(wait).toBeGreaterThanOrEqual(0);
            expect(wait).toBeLessThanOrEqual(RULE.capMs);
          }
          c.advance(RULE.capMs);
          expect(b.waitMs("k")).toBe(0);
        },
      ),
    );
  });

  it("property: waits never shrink as wrong tries pile up quickly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), (tries) => {
        const c = clock();
        const b = new Backoff(RULE, c.now);
        let previous = 0;
        for (let i = 0; i < tries; i++) {
          b.record("k");
          const wait = b.waitMs("k");
          expect(wait).toBeGreaterThanOrEqual(previous);
          previous = wait;
        }
      }),
    );
  });

  it("keeps memory bounded when flooded with made-up addresses", () => {
    const c = clock();
    const b = new Backoff(RULE, c.now);
    for (let i = 0; i < 4; i++) b.record("victim");
    for (let i = 0; i < 12_000; i++) b.record(`made-up-${String(i)}`);
    // The least recently tried keys are swept first; a flood can't grow memory without bound.
    expect(b.size).toBeLessThanOrEqual(MAX_KEYS);
    b.record(`made-up-${String(11_999)}`);
    b.record(`made-up-${String(11_999)}`);
    expect(b.waitMs(`made-up-${String(11_999)}`)).toBe(1_000);
  });

  it("uses the chosen rules: 5 free sign-in tries up to 15 minutes; 3 emails up to an hour", () => {
    expect(SIGN_IN_BACKOFF).toMatchObject({ free: 5, capMs: 15 * 60_000 });
    expect(MAIL_BACKOFF).toMatchObject({ free: 3, capMs: 60 * 60_000 });
  });

  it("keys on a hash of the normalised email, never the address", () => {
    expect(emailKey(" Selam@Example.Test ")).toBe(emailKey("selam@example.test"));
    expect(emailKey("selam@example.test")).toMatch(/^[0-9a-f]{64}$/);
    expect(emailKey("selam@example.test")).not.toContain("selam");
  });
});
