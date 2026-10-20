/**
 * Prototype domain types (Master Mobile Design Specification A10). These are UI/mock shapes,
 * not the backend contract: Phase 4 defines server contracts against the approved journeys.
 * Timestamps are ISO-8601 UTC strings; zones are IANA names (ADR-0002).
 */

export type UserId = string;
export type Side = "ruby" | "sapphire";

export interface DemoUser {
  id: UserId;
  displayName: string;
  nickname: string | null;
  /** Shown instead of an email in the prototype; never a real address. */
  emailLabel: string;
  personalSide: Side;
  /** IANA zone, e.g. "Africa/Addis_Ababa". */
  timezone: string;
  /** Pronoun-free by default; copy uses names (spec §8: names and pronouns configurable). */
  pronouns: string | null;
}

export type LongDistanceStatus = "preparing" | "waitingForPartner" | "active";

export interface Relationship {
  id: string;
  partnerIds: readonly [UserId, UserId];
  displayName: string;
  longDistanceStatus: LongDistanceStatus;
  startAt: string | null;
  /** D-13 (Proposed): Europe/London. Cutoff is unresolved (U-02). */
  sharedTimezone: string;
}

export type UnlockRule =
  { type: "date"; at: string } | { type: "manual" } | { type: "event"; eventId: string };

export type OpenWhenState = "draft" | "sealed" | "opened" | "removed";

/** Stored record (mock). The body must never reach a view before the letter is opened. */
export interface OpenWhenLetter {
  id: string;
  authorId: UserId;
  recipientId: UserId;
  safePrompt: string;
  body: string;
  mediaRefs: readonly string[];
  unlock: UnlockRule;
  state: OpenWhenState;
  sealedAt: string | null;
  openedAt: string | null;
}
