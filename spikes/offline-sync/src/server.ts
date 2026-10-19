import type {
  Change,
  Entry,
  EntryId,
  Mutation,
  MutationId,
  MutationResult,
  PullResponse,
  UserId,
} from "./protocol";

interface LoggedChange {
  readonly seq: number;
  readonly change: Change;
  readonly audience: ReadonlySet<UserId>;
}

/**
 * Reference server for one relationship. In-memory, synchronous and deterministic.
 * Authorization is checked on every call (§12): only the two members may act, private
 * entries are visible to their author alone, and only authors mutate their own entries.
 */
export class ReferenceServer {
  readonly entries = new Map<EntryId, Entry>();
  readonly tombstones = new Set<EntryId>();
  /** Object storage stand-in: mediaId → entryId. */
  readonly storedMedia = new Map<string, EntryId>();
  /** How many times each mutation's effect was applied. Must never exceed 1. */
  readonly effectCount = new Map<MutationId, number>();

  private readonly processed = new Map<
    MutationId,
    { fingerprint: string; actor: UserId; result: MutationResult }
  >();
  private readonly log: LoggedChange[] = [];
  private readonly members: ReadonlySet<UserId>;

  constructor(members: readonly [UserId, UserId]) {
    this.members = new Set(members);
  }

  apply(actor: UserId, mutation: Mutation): MutationResult {
    if (!this.members.has(actor)) return { status: "rejected", reason: "forbidden" };

    const fingerprint = JSON.stringify(mutation);
    const previous = this.processed.get(mutation.mutationId);
    if (previous !== undefined) {
      // Idempotent replay: same key + same payload + same actor → the original result.
      if (previous.fingerprint !== fingerprint || previous.actor !== actor) {
        return { status: "rejected", reason: "idempotency-key-reuse" };
      }
      return this.replay(mutation, previous.result);
    }

    const { result, changedState } = this.execute(actor, mutation);
    this.processed.set(mutation.mutationId, { fingerprint, actor, result });
    if (changedState) {
      this.effectCount.set(
        mutation.mutationId,
        (this.effectCount.get(mutation.mutationId) ?? 0) + 1,
      );
    }
    return result;
  }

  /**
   * Idempotency records are kept for a bounded time in production. Tombstones and version
   * checks must keep stale replays safe after these records are gone.
   */
  forgetIdempotencyRecords(): void {
    this.processed.clear();
  }

  /**
   * Idempotent replay: the same outcome as the first attempt, but described with the entry's
   * CURRENT state so a client never adopts stale data from a retried response.
   */
  private replay(mutation: Mutation, original: MutationResult): MutationResult {
    if (original.status !== "applied" || mutation.kind === "delete") return original;
    if (this.tombstones.has(mutation.entryId)) return { status: "gone" };
    return { status: "applied", entry: this.entries.get(mutation.entryId) ?? null };
  }

  pull(actor: UserId, since: number): PullResponse {
    if (!this.members.has(actor)) throw new Error("forbidden");
    return {
      changes: this.log.filter((c) => c.seq > since && c.audience.has(actor)).map((c) => c.change),
      cursor: this.log.length,
    };
  }

  /** Entries the given user is allowed to see. */
  visibleTo(user: UserId): Entry[] {
    return [...this.entries.values()].filter(
      (e) => e.visibility === "shared" || e.authorId === user,
    );
  }

  private execute(actor: UserId, m: Mutation): { result: MutationResult; changedState: boolean } {
    const unchanged = (result: MutationResult) => ({ result, changedState: false });

    if (m.kind === "create") {
      if (this.tombstones.has(m.entryId)) return unchanged({ status: "gone" });
      const existing = this.entries.get(m.entryId);
      if (existing !== undefined) {
        // A create is also idempotent by entity id, so stale replays without an idempotency
        // record (expired, or a device restored from backup) are harmless.
        return unchanged(
          existing.authorId === actor
            ? { status: "applied", entry: existing }
            : { status: "rejected", reason: "duplicate-id" },
        );
      }
      const entry: Entry = {
        id: m.entryId,
        authorId: actor,
        body: m.body,
        visibility: m.visibility,
        version: 1,
        mediaIds: [],
      };
      this.entries.set(entry.id, entry);
      this.record({ type: "upsert", entry, mutationId: m.mutationId });
      return { result: { status: "applied", entry }, changedState: true };
    }

    if (m.kind === "delete") return this.delete(actor, m);

    // Author mutations: edit, share, attach.
    if (this.tombstones.has(m.entryId)) return unchanged({ status: "gone" });
    const entry = this.entries.get(m.entryId);
    // A non-author must not learn that someone else's private entry exists.
    if (entry === undefined || (entry.visibility === "private" && entry.authorId !== actor)) {
      return unchanged({ status: "rejected", reason: "not-found" });
    }
    if (entry.authorId !== actor) return unchanged({ status: "rejected", reason: "forbidden" });
    if (entry.version !== m.baseVersion) return unchanged({ status: "conflict", current: entry });

    let updated: Entry;
    switch (m.kind) {
      case "edit":
        updated = { ...entry, body: m.body, version: entry.version + 1 };
        break;
      case "share":
        updated = { ...entry, visibility: "shared", version: entry.version + 1 };
        break;
      case "attach":
        this.storedMedia.set(m.mediaId, entry.id);
        updated = {
          ...entry,
          mediaIds: [...entry.mediaIds, m.mediaId],
          version: entry.version + 1,
        };
        break;
    }
    this.entries.set(updated.id, updated);
    this.record({ type: "upsert", entry: updated, mutationId: m.mutationId });
    return { result: { status: "applied", entry: updated }, changedState: true };
  }

  private delete(
    actor: UserId,
    { entryId, mutationId }: Mutation,
  ): { result: MutationResult; changedState: boolean } {
    if (this.tombstones.has(entryId)) {
      return { result: { status: "applied", entry: null }, changedState: false };
    }
    const entry = this.entries.get(entryId);
    if (entry?.visibility === "private" && entry.authorId !== actor) {
      return { result: { status: "rejected", reason: "not-found" }, changedState: false };
    }
    // Delete is pre-emptive: a tombstone is written even if the create has not arrived yet.
    this.tombstones.add(entryId);
    this.entries.delete(entryId);
    for (const [mediaId, owner] of this.storedMedia) {
      if (owner === entryId) this.storedMedia.delete(mediaId); // purge (async job in production)
    }
    // Only people who could have seen the entry learn that it was deleted.
    const audience = entry?.visibility === "shared" ? this.members : new Set([actor]);
    this.record({ type: "delete", entryId, mutationId }, audience);
    return { result: { status: "applied", entry: null }, changedState: true };
  }

  private record(change: Change, audience?: ReadonlySet<UserId>): void {
    const resolved =
      audience ??
      (change.type === "upsert" && change.entry.visibility === "private"
        ? new Set([change.entry.authorId])
        : this.members);
    this.log.push({ seq: this.log.length + 1, change, audience: resolved });
  }
}
