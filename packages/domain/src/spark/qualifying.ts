/**
 * Which activity counts toward Shared Spark (D-15).
 *
 * Only intentional connection qualifies. Passive activity never does.
 * Private drafts never qualify (P-10): counting them would let the partner infer that an
 * unshared entry exists, which breaks "private drafts stay private".
 */

export const QUALIFYING_ACTIVITY_KINDS = Object.freeze([
  "moment.shared",
  "signal.sent",
  "reply.sent",
] as const);

export const NON_QUALIFYING_ACTIVITY_KINDS = Object.freeze([
  "app.opened",
  "widget.viewed",
  "notification.received",
  "recap.viewed",
  "draft.saved",
] as const);

export type QualifyingActivityKind = (typeof QUALIFYING_ACTIVITY_KINDS)[number];
export type ActivityKind = QualifyingActivityKind | (typeof NON_QUALIFYING_ACTIVITY_KINDS)[number];

export interface Activity {
  readonly actorId: string;
  readonly kind: ActivityKind;
}

const QUALIFYING: ReadonlySet<ActivityKind> = new Set(QUALIFYING_ACTIVITY_KINDS);

export function isQualifyingActivity(kind: ActivityKind): kind is QualifyingActivityKind {
  return QUALIFYING.has(kind);
}

/**
 * Whether BOTH partners made at least one qualifying contribution on a shared day.
 *
 * Returns only a boolean by design (P-09): the Spark pipeline never learns or stores which
 * partner did not contribute, so no screen, notification or log can assign blame (§7 Safety).
 * Activities by anyone other than the two partners are ignored.
 */
export function bothPartnersContributed(
  partnerIds: readonly [string, string],
  activities: Iterable<Activity>,
): boolean {
  const [a, b] = partnerIds;
  if (a === b) throw new RangeError("A relationship has exactly two distinct partners");

  let aContributed = false;
  let bContributed = false;
  for (const { actorId, kind } of activities) {
    if (!isQualifyingActivity(kind)) continue;
    if (actorId === a) aContributed = true;
    else if (actorId === b) bContributed = true;
    if (aContributed && bContributed) return true;
  }
  return false;
}
