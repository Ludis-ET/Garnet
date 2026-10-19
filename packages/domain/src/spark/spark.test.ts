import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import {
  bothPartnersContributed,
  NON_QUALIFYING_ACTIVITY_KINDS,
  QUALIFYING_ACTIVITY_KINDS,
} from "./qualifying";
import {
  computeSpark,
  graceAvailableFrom,
  GRACE_COOLDOWN_OPTIONS,
  PROPOSED_MILESTONES,
  validateSparkPolicy,
  type FinalizedDay,
  type FinalizedDayKind,
  type SparkPolicy,
} from "./spark";

const START = Temporal.PlainDate.from("2026-11-01");

/** Builds consecutive day records from a compact string: C=connected, N=not, E=excused. */
function days(pattern: string): FinalizedDay[] {
  const kinds: Record<string, FinalizedDayKind> = {
    C: "connected",
    N: "not-connected",
    E: "excused",
  };
  return Array.from(pattern).map((ch, i) => {
    const kind = kinds[ch];
    if (kind === undefined) throw new Error(`Bad pattern char ${ch}`);
    return { day: START.add({ days: i }), kind };
  });
}

// U-03 and U-04 are unresolved, so every behavioural test names the policy it assumes.
const policy = (overrides: Partial<SparkPolicy> = {}): SparkPolicy => ({
  milestones: PROPOSED_MILESTONES,
  graceCooldownDays: GRACE_COOLDOWN_OPTIONS.rollingSevenDayWindow,
  whenGraceUnavailable: "rest",
  ...overrides,
});

const effects = (pattern: string, p: SparkPolicy = policy()) =>
  computeSpark(days(pattern), p).timeline.map((t) => t.effect);

describe("growth and milestones", () => {
  it("grows one per connected day and earns the 3-day milestone", () => {
    const { state, timeline } = computeSpark(days("CCC"), policy());
    expect(state.current).toBe(3);
    expect(timeline.map((t) => t.milestoneReached)).toEqual([null, null, 3]);
    expect(state.milestonesEarned).toEqual([{ milestone: 3, reachedOn: START.add({ days: 2 }) }]);
  });

  it("earns every proposed milestone up to 365", () => {
    const { state } = computeSpark(days("C".repeat(365)), policy());
    expect(state.milestonesEarned.map((m) => m.milestone)).toEqual([3, 7, 14, 30, 50, 100, 365]);
  });

  it("does not re-award a milestone after the streak rests and regrows", () => {
    const { state } = computeSpark(days("CCCNNCCC"), policy());
    expect(state.milestonesEarned.map((m) => m.milestone)).toEqual([3]);
  });
});

describe("grace", () => {
  it("preserves but does not grow the streak", () => {
    const { state, timeline } = computeSpark(days("CCN"), policy());
    expect(timeline.at(-1)?.effect).toBe("graced");
    expect(state.current).toBe(2);
  });

  it("never earns a milestone: CC + grace is still 2; the next connected day earns 3", () => {
    const { timeline } = computeSpark(days("CCNC"), policy());
    expect(timeline.map((t) => [t.effect, t.current, t.milestoneReached])).toEqual([
      ["grew", 1, null],
      ["grew", 2, null],
      ["graced", 2, null],
      ["grew", 3, 3],
    ]);
  });

  it("is not consumed when there is no streak to preserve (P-08)", () => {
    const { state, timeline } = computeSpark(days("NNC"), policy());
    expect(timeline.map((t) => t.effect)).toEqual(["idle", "idle", "grew"]);
    expect(state.lastGraceUsedOn).toBeNull();
  });

  it("is not consumed by excused (outage) days, which also do not grow", () => {
    const { state } = computeSpark(days("CCEEC"), policy());
    expect(effects("CCEEC")).toEqual(["grew", "grew", "excused", "excused", "grew"]);
    expect(state.current).toBe(3);
    expect(state.lastGraceUsedOn).toBeNull();
  });

  describe("U-03 boundary: cooldown candidates differ by exactly one day", () => {
    // Grace used on index 1. Next miss on index 8 = use + 7.
    const pattern = "CNCCCCCCN";

    it("rolling seven-day window (7): grace available again on use + 7", () => {
      expect(effects(pattern).at(-1)).toBe("graced");
    });

    it("seven full days after use (8): not yet available on use + 7", () => {
      const p = policy({ graceCooldownDays: GRACE_COOLDOWN_OPTIONS.sevenFullDaysAfterUse });
      expect(effects(pattern, p).at(-1)).toBe("rested");
      expect(effects(`${pattern.slice(0, -1)}CN`, p).at(-1)).toBe("graced");
    });

    it("reports when grace is next available", () => {
      const { state } = computeSpark(days("CN"), policy());
      expect(graceAvailableFrom(state, policy())?.toString()).toBe("2026-11-09");
    });
  });

  describe("U-04: no grace available / consecutive missed days", () => {
    it('"rest" ends the current streak but keeps best and milestones', () => {
      const { state, timeline } = computeSpark(days("CCCCNN"), policy());
      expect(timeline.map((t) => t.effect).slice(-2)).toEqual(["graced", "rested"]);
      expect(state.current).toBe(0);
      expect(state.best).toBe(4);
      expect(state.milestonesEarned.map((m) => m.milestone)).toEqual([3]);
    });

    it('"hold" keeps the count without growing until the next connected day', () => {
      const p = policy({ whenGraceUnavailable: "hold" });
      const { state, timeline } = computeSpark(days("CCCCNNNC"), p);
      expect(timeline.map((t) => t.effect).slice(-4)).toEqual(["graced", "held", "held", "grew"]);
      expect(state.current).toBe(5);
    });
  });
});

describe("input validation", () => {
  it("rejects gaps, duplicates and out-of-order days", () => {
    const [d0, d1, d2] = days("CCC") as [FinalizedDay, FinalizedDay, FinalizedDay];
    expect(() => computeSpark([d0, d2], policy())).toThrow(/consecutive/);
    expect(() => computeSpark([d0, d0], policy())).toThrow(/consecutive/);
    expect(() => computeSpark([d1, d0], policy())).toThrow(/consecutive/);
  });

  it("rejects malformed policies", () => {
    expect(() => validateSparkPolicy(policy({ graceCooldownDays: 0 }))).toThrow(RangeError);
    expect(() => validateSparkPolicy(policy({ milestones: [7, 3] }))).toThrow(RangeError);
    expect(() => validateSparkPolicy(policy({ milestones: [0] }))).toThrow(RangeError);
  });
});

describe("properties (fast-check)", () => {
  const patternArb = fc
    .array(fc.constantFrom("C", "N", "E"), { minLength: 0, maxLength: 120 })
    .map((chars) => chars.join(""));
  const policyArb = fc.record({
    milestones: fc.constant(PROPOSED_MILESTONES),
    graceCooldownDays: fc.constantFrom(7, 8),
    whenGraceUnavailable: fc.constantFrom("rest" as const, "hold" as const),
  });

  it("current never exceeds the number of connected days; best ≥ current", () => {
    fc.assert(
      fc.property(patternArb, policyArb, (pattern, p) => {
        const { state } = computeSpark(days(pattern), p);
        const connected = Array.from(pattern).filter((c) => c === "C").length;
        return state.current <= connected && state.best >= state.current;
      }),
    );
  });

  it("milestones are only reached on connected days and never lost", () => {
    fc.assert(
      fc.property(patternArb, policyArb, (pattern, p) => {
        const { state, timeline } = computeSpark(days(pattern), p);
        const reached = timeline.filter((t) => t.milestoneReached !== null);
        return (
          reached.every((t) => t.effect === "grew") &&
          state.milestonesEarned.length === reached.length
        );
      }),
    );
  });

  it("grace uses are never closer together than the cooldown", () => {
    fc.assert(
      fc.property(patternArb, policyArb, (pattern, p) => {
        const graced = computeSpark(days(pattern), p)
          .timeline.filter((t) => t.effect === "graced")
          .map((t) => t.day);
        return graced.every(
          (d, i) =>
            i === 0 || graced[i - 1]!.until(d, { largestUnit: "days" }).days >= p.graceCooldownDays,
        );
      }),
    );
  });

  it("excused days never change the count or consume grace", () => {
    fc.assert(
      fc.property(patternArb, policyArb, (pattern, p) => {
        const { timeline } = computeSpark(days(pattern), p);
        return timeline.every((t, i) => {
          if (t.effect !== "excused") return true;
          return t.current === (timeline[i - 1]?.current ?? 0);
        });
      }),
    );
  });
});

describe("bothPartnersContributed (D-15)", () => {
  const partners = ["ruby", "sapphire"] as const;

  it("requires a qualifying action from each partner", () => {
    expect(
      bothPartnersContributed(partners, [
        { actorId: "ruby", kind: "moment.shared" },
        { actorId: "sapphire", kind: "reply.sent" },
      ]),
    ).toBe(true);
    expect(bothPartnersContributed(partners, [{ actorId: "ruby", kind: "signal.sent" }])).toBe(
      false,
    );
  });

  it("ignores every passive activity, including private drafts", () => {
    const passive = NON_QUALIFYING_ACTIVITY_KINDS.flatMap((kind) =>
      partners.map((actorId) => ({ actorId, kind })),
    );
    expect(bothPartnersContributed(partners, passive)).toBe(false);
  });

  it("counts every qualifying kind", () => {
    for (const kind of QUALIFYING_ACTIVITY_KINDS) {
      expect(
        bothPartnersContributed(partners, [
          { actorId: "ruby", kind },
          { actorId: "sapphire", kind },
        ]),
      ).toBe(true);
    }
  });

  it("ignores non-partners and rejects identical partner ids", () => {
    expect(
      bothPartnersContributed(partners, [
        { actorId: "ruby", kind: "moment.shared" },
        { actorId: "stranger", kind: "moment.shared" },
      ]),
    ).toBe(false);
    expect(() => bothPartnersContributed(["ruby", "ruby"], [])).toThrow(RangeError);
  });
});
