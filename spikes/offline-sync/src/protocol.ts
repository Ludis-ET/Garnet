/**
 * Wire protocol for the offline-sync spike (F-04). Shapes are illustrative, not the Phase 2 API.
 *
 * Core ideas under test (docs/architecture/offline-sync.md):
 * - Client-generated stable entity ids (UUIDv7 in production, P-04).
 * - Every mutation carries a unique mutationId used as an idempotency key.
 * - Author mutations carry baseVersion for optimistic concurrency.
 * - Deletion writes a tombstone; any later mutation on that id is answered "gone" (P-05).
 * - Clients pull a per-user change feed; private entries never enter the partner's feed.
 */

export type UserId = string;
export type EntryId = string;
export type MutationId = string;
export type Visibility = "private" | "shared";

export interface Entry {
  readonly id: EntryId;
  readonly authorId: UserId;
  readonly body: string;
  readonly visibility: Visibility;
  /** Server version; increments on every applied author mutation. */
  readonly version: number;
  readonly mediaIds: readonly string[];
}

interface MutationBase {
  readonly mutationId: MutationId;
  readonly entryId: EntryId;
}

export type Mutation =
  | (MutationBase & {
      readonly kind: "create";
      readonly body: string;
      readonly visibility: Visibility;
    })
  | (MutationBase & { readonly kind: "edit"; readonly body: string; readonly baseVersion: number })
  | (MutationBase & { readonly kind: "share"; readonly baseVersion: number })
  | (MutationBase & {
      readonly kind: "attach";
      readonly mediaId: string;
      readonly baseVersion: number;
    })
  | (MutationBase & { readonly kind: "delete" });

export type MutationResult =
  /** The entry's CURRENT server state (null after a delete). Replays also return current state. */
  | { readonly status: "applied"; readonly entry: Entry | null }
  /** The entity was deleted. Drop local copy and every queued mutation for it. */
  | { readonly status: "gone" }
  /** baseVersion did not match. Carries the current server entry. */
  | { readonly status: "conflict"; readonly current: Entry }
  | {
      readonly status: "rejected";
      readonly reason: "forbidden" | "not-found" | "duplicate-id" | "idempotency-key-reuse";
    };

/**
 * A change-feed item. `mutationId` names the mutation that caused it, so a device that sees
 * its own mutation in the feed knows it was applied even if the response was lost.
 */
export type Change =
  | { readonly type: "upsert"; readonly entry: Entry; readonly mutationId: MutationId }
  | { readonly type: "delete"; readonly entryId: EntryId; readonly mutationId: MutationId };

export interface PullResponse {
  readonly changes: readonly Change[];
  readonly cursor: number;
}
