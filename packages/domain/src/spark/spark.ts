import { Temporal } from "temporal-polyfill";

/**
 * Shared Spark — streak engine (§7, D-14 … D-18).
 *
 * A pure fold over finalized shared days. Because state is always derived from day records,
 * a late-sync correction is handled by re-running the fold (correction policy: U-05).
 *
 * Rules implemented (status in docs/decisions/decision-log.md):
 * - A "connected" day (both partners contributed) grows the streak by one.          D-15
 * - A missed day consumes one available grace day: preserved, never grown.          D-14, D-16
 * - Grace activates automatically on finalization, without blame.                   D-16, D-17
 * - Grace never earns a milestone (it cannot grow the count).                       §7 Safety
 * - Excused days (service outage) are neutral and never consume grace.              §7, P-13
 * - No streak, nothing to preserve: grace is not consumed.                          P-08
 * - Earned milestones and best streak are never lost.                               §7 Controls
 *
 * Deliberately NOT decided here — callers must choose explicitly via SparkPolicy:
 * - grace replenishment boundary                                                    U-03
 * - behaviour when grace is unavailable / consecutive missed days                   U-04
 */

export type FinalizedDayKind =
  /** Both partners made at least one qualifying contribution. */
  | "connected"
  /** At least one partner did not. Who is intentionally not recorded (P-09). */
  | "not-connected"
  /** Neutral day, e.g. a service outage. Neither grows nor consumes grace. */
  | "excused";

export interface FinalizedDay {
  readonly day: Temporal.PlainDate;
  readonly kind: FinalizedDayKind;
}

export interface SparkPolicy {
  /** Streak lengths that earn a milestone. Proposed: PROPOSED_MILESTONES. */
  readonly milestones: readonly number[];
  /**
   * After grace is used on day D, the next grace may be used on day D + graceCooldownDays.
   * UNRESOLVED (U-03) — see GRACE_COOLDOWN_OPTIONS.
   */
  readonly graceCooldownDays: number;
  /**
   * What a not-connected day does when no grace is available. UNRESOLVED (U-04).
   * - "rest": the current streak ends; the crystal rests. Best streak and milestones are kept.
   * - "hold": the streak is held (not grown, not reset) until the next connected day.
   */
  readonly whenGraceUnavailable: "rest" | "hold";
}

/** §7 proposed milestones. */
export const PROPOSED_MILESTONES: readonly number[] = Object.freeze([3, 7, 14, 30, 50, 100, 365]);

/** Candidate answers for U-03. Neither is approved. */
export const GRACE_COOLDOWN_OPTIONS = Object.freeze({
  /** D-14 read literally: at most one grace in any 7 consecutive shared days. */
  rollingSevenDayWindow: 7,
  /** D-18 recommendation: available after seven FULL days have passed since the use. */
  sevenFullDaysAfterUse: 8,
});

export type DayEffect =
  /** Streak grew by one. */
  | "grew"
  /** Grace preserved the streak. */
  | "graced"
  /** Neutral day; nothing changed. */
  | "excused"
  /** No grace available; streak ended (policy "rest"). */
  | "rested"
  /** No grace available; streak held (policy "hold"). */
  | "held"
  /** Not connected but there was no streak to preserve. */
  | "idle";

export interface EarnedMilestone {
  readonly milestone: number;
  readonly reachedOn: Temporal.PlainDate;
}

export interface SparkState {
  readonly current: number;
  readonly best: number;
  readonly lastDay: Temporal.PlainDate | null;
  readonly lastGraceUsedOn: Temporal.PlainDate | null;
  readonly milestonesEarned: readonly EarnedMilestone[];
}

export interface TimelineEntry {
  readonly day: Temporal.PlainDate;
  readonly effect: DayEffect;
  readonly current: number;
  readonly milestoneReached: number | null;
}

export interface SparkResult {
  readonly state: SparkState;
  readonly timeline: readonly TimelineEntry[];
}

export const INITIAL_SPARK_STATE: SparkState = Object.freeze({
  current: 0,
  best: 0,
  lastDay: null,
  lastGraceUsedOn: null,
  milestonesEarned: Object.freeze([]),
});

/** @throws RangeError when the policy is malformed. */
export function validateSparkPolicy(policy: SparkPolicy): SparkPolicy {
  const { milestones, graceCooldownDays } = policy;
  if (!Number.isInteger(graceCooldownDays) || graceCooldownDays < 1) {
    throw new RangeError(`graceCooldownDays must be a positive integer, got ${graceCooldownDays}`);
  }
  milestones.forEach((m, i) => {
    if (!Number.isInteger(m) || m < 1) throw new RangeError(`Invalid milestone ${m}`);
    const previous = milestones[i - 1];
    if (previous !== undefined && m <= previous) {
      throw new RangeError("Milestones must be strictly ascending");
    }
  });
  return policy;
}

/** The first shared day on which grace can be used again, or null if available now. */
export function graceAvailableFrom(
  state: SparkState,
  policy: SparkPolicy,
): Temporal.PlainDate | null {
  return state.lastGraceUsedOn?.add({ days: policy.graceCooldownDays }) ?? null;
}

function isGraceAvailable(state: SparkState, policy: SparkPolicy, day: Temporal.PlainDate) {
  const from = graceAvailableFrom(state, policy);
  return from === null || Temporal.PlainDate.compare(day, from) >= 0;
}

/** Applies one finalized day. Days must be applied consecutively, without gaps. */
export function applyDay(
  state: SparkState,
  record: FinalizedDay,
  policy: SparkPolicy,
): { state: SparkState; entry: TimelineEntry } {
  const { day, kind } = record;
  if (state.lastDay !== null && !state.lastDay.add({ days: 1 }).equals(day)) {
    throw new RangeError(
      `Days must be consecutive: expected ${state.lastDay.add({ days: 1 }).toString()}, got ${day.toString()}`,
    );
  }

  let next: SparkState = { ...state, lastDay: day };
  let effect: DayEffect;
  let milestoneReached: number | null = null;

  switch (kind) {
    case "connected": {
      const current = state.current + 1;
      const alreadyEarned = state.milestonesEarned.some((m) => m.milestone === current);
      if (policy.milestones.includes(current) && !alreadyEarned) {
        milestoneReached = current;
        next = {
          ...next,
          milestonesEarned: [...state.milestonesEarned, { milestone: current, reachedOn: day }],
        };
      }
      next = { ...next, current, best: Math.max(state.best, current) };
      effect = "grew";
      break;
    }
    case "excused":
      effect = "excused";
      break;
    case "not-connected":
      if (state.current === 0) {
        effect = "idle";
      } else if (isGraceAvailable(state, policy, day)) {
        next = { ...next, lastGraceUsedOn: day };
        effect = "graced";
      } else if (policy.whenGraceUnavailable === "rest") {
        next = { ...next, current: 0 };
        effect = "rested";
      } else {
        effect = "held";
      }
      break;
  }

  return { state: next, entry: { day, effect, current: next.current, milestoneReached } };
}

/** Folds a consecutive run of finalized days into Spark state plus a neutral timeline. */
export function computeSpark(
  days: Iterable<FinalizedDay>,
  policy: SparkPolicy,
  initial: SparkState = INITIAL_SPARK_STATE,
): SparkResult {
  validateSparkPolicy(policy);
  let state = initial;
  const timeline: TimelineEntry[] = [];
  for (const record of days) {
    const result = applyDay(state, record, policy);
    state = result.state;
    timeline.push(result.entry);
  }
  return { state, timeline };
}
