/**
 * Connection signals (§5).
 *
 * The eight signals and the two notification levels are from the scope record. The
 * assignment of each signal to a level is a Phase 1 proposal (P-07) awaiting review.
 *
 * Non-negotiables encoded here:
 * - Lock-screen previews are generic by default; each partner controls their own (§5).
 * - Nothing in this module models read receipts, escalation, or "seen" state (§5).
 */

export type NotificationLevel =
  /** Affectionate; normal-priority delivery. */
  | "gentle"
  /** A support request; more noticeable delivery. Never bypasses quiet hours or DND. */
  | "support";

export interface SignalDefinition {
  readonly id: string;
  readonly label: string;
  readonly level: NotificationLevel;
}

export const SIGNALS = Object.freeze([
  { id: "thought-of-you", label: "I Thought of You", level: "gentle" },
  { id: "missing-you", label: "Missing You", level: "gentle" },
  { id: "need-you", label: "I Need You", level: "support" },
  { id: "need-to-talk", label: "I Need to Talk", level: "support" },
  { id: "just-listen", label: "Just Listen", level: "support" },
  { id: "check-on-me", label: "Please Check On Me", level: "support" },
  { id: "cant-talk-yet", label: "I Can't Talk Yet", level: "gentle" },
  { id: "okay-now", label: "I'm Okay Now", level: "gentle" },
] as const satisfies readonly SignalDefinition[]);

export type SignalId = (typeof SIGNALS)[number]["id"];

/** §5 examples. Final wording is a copy decision. */
export const PRESET_RESPONSES = Object.freeze([
  "I'm here ❤️",
  "Can I call you?",
  "Give me a little time",
  "Tell me what's going on",
] as const);

export type LockScreenPreview = "generic" | "detailed";

export interface NotificationPreferences {
  readonly lockScreenPreview: LockScreenPreview;
  readonly quietHoursEnabled: boolean;
}

/** Privacy-first defaults (§2, §5). Quiet hours are respected by default. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = Object.freeze({
  lockScreenPreview: "generic",
  quietHoursEnabled: true,
});

/** Generic copy reveals neither the signal nor its level. Placeholder pending copy review. */
export const GENERIC_PREVIEW = Object.freeze({ title: "Garnet", body: "Something new for you 💜" });

export function findSignal(id: string): SignalDefinition | undefined {
  return SIGNALS.find((s) => s.id === id);
}

/** What the OS notification may display, given the RECIPIENT's preferences. */
export function notificationPreview(
  signal: SignalDefinition,
  recipient: NotificationPreferences,
): { title: string; body: string } {
  switch (recipient.lockScreenPreview) {
    case "generic":
      return GENERIC_PREVIEW;
    case "detailed":
      return { title: "Garnet", body: signal.label };
  }
}
