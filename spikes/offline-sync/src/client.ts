import type { FaultyNetwork } from "./network";
import type {
  Change,
  Entry,
  EntryId,
  Mutation,
  MutationResult,
  UserId,
  Visibility,
} from "./protocol";
import type { ReferenceServer } from "./server";

export interface LocalEntry {
  readonly id: EntryId;
  readonly authorId: UserId;
  readonly body: string;
  readonly visibility: Visibility;
  /** The server version this device expects once its queued mutations apply. */
  readonly expectedVersion: number;
  readonly mediaIds: readonly string[];
}

export interface DeviceSnapshot {
  readonly confirmed: ReadonlyMap<EntryId, Entry>;
  readonly outbox: readonly Mutation[];
  readonly cursor: number;
}

export type SyncIssue =
  | { readonly kind: "conflict-copy-created"; readonly original: EntryId; readonly copy: EntryId }
  | { readonly kind: "deleted-elsewhere"; readonly entryId: EntryId }
  | { readonly kind: "rejected"; readonly mutation: Mutation; readonly reason: string };

/**
 * A device, modelled as CONFIRMED server state plus a durable, strictly ordered PENDING queue
 * (P-14). What the user sees is always `confirmed` with the pending queue replayed on top
 * ("rebase"), so server updates are never skipped and local work is never hidden.
 *
 * Found by property testing: an earlier design that patched a single local map and skipped
 * server updates for entries with queued work diverged permanently after a backup restore.
 *
 * In production, confirmed state and the outbox live in SQLite; the view is maintained
 * incrementally rather than recomputed.
 */
export class Device {
  readonly confirmed = new Map<EntryId, Entry>();
  readonly outbox: Mutation[] = [];
  readonly issues: SyncIssue[] = [];
  /** Every entry / deletion this device ever received from the server — privacy audit. */
  readonly received: Entry[] = [];
  readonly receivedDeletes: EntryId[] = [];
  online = true;
  private cursor = 0;
  private counter = 0;

  constructor(
    readonly userId: UserId,
    readonly deviceId: string,
    private readonly server: ReferenceServer,
    private readonly network: FaultyNetwork,
  ) {}

  /** The user-visible state: confirmed server state with pending mutations replayed. */
  get entries(): ReadonlyMap<EntryId, LocalEntry> {
    const view = new Map<EntryId, LocalEntry>();
    for (const e of this.confirmed.values()) {
      view.set(e.id, {
        id: e.id,
        authorId: e.authorId,
        body: e.body,
        visibility: e.visibility,
        expectedVersion: e.version,
        mediaIds: e.mediaIds,
      });
    }
    for (const m of this.outbox) applyLocally(view, m, this.userId);
    return view;
  }

  // ---- Local operations (work offline) -------------------------------------------------------

  create(body: string, visibility: Visibility): EntryId {
    const entryId = this.nextId("e");
    this.outbox.push({ kind: "create", mutationId: this.nextId("m"), entryId, body, visibility });
    return entryId;
  }

  edit(entryId: EntryId, body: string): void {
    const { expectedVersion } = this.ownEntry(entryId);
    this.outbox.push({
      kind: "edit",
      mutationId: this.nextId("m"),
      entryId,
      body,
      baseVersion: expectedVersion,
    });
  }

  share(entryId: EntryId): void {
    const { expectedVersion } = this.ownEntry(entryId);
    this.outbox.push({
      kind: "share",
      mutationId: this.nextId("m"),
      entryId,
      baseVersion: expectedVersion,
    });
  }

  attach(entryId: EntryId): string {
    const { expectedVersion } = this.ownEntry(entryId);
    const mediaId = this.nextId("media");
    this.outbox.push({
      kind: "attach",
      mutationId: this.nextId("m"),
      entryId,
      mediaId,
      baseVersion: expectedVersion,
    });
    return mediaId;
  }

  delete(entryId: EntryId): void {
    if (!this.entries.has(entryId)) throw new Error(`Unknown entry ${entryId}`);
    this.outbox.push({ kind: "delete", mutationId: this.nextId("m"), entryId });
  }

  // ---- Sync --------------------------------------------------------------------------------

  /** Sends the head of the outbox once. A lost request or response leaves it queued for retry. */
  sendNext(): void {
    const mutation = this.outbox[0];
    if (!this.online || mutation === undefined) return;
    const result = this.network.call(() => this.server.apply(this.userId, mutation));
    if (result !== undefined) this.handleResult(mutation, result);
  }

  pull(): void {
    if (!this.online) return;
    const response = this.network.call(() => this.server.pull(this.userId, this.cursor));
    if (response === undefined) return;
    for (const change of response.changes) this.applyChange(change);
    this.cursor = response.cursor;
  }

  /**
   * Models an OS backup of the app's local database. ID generation is deliberately NOT part of
   * the snapshot: production ids are random UUIDv7, so a restored device never reissues ids.
   */
  snapshot(): DeviceSnapshot {
    return { confirmed: new Map(this.confirmed), outbox: [...this.outbox], cursor: this.cursor };
  }

  /** Restores a stale backup: old confirmed state, old queued mutations, old cursor. */
  restore(snapshot: DeviceSnapshot): void {
    this.confirmed.clear();
    for (const [id, entry] of snapshot.confirmed) this.confirmed.set(id, entry);
    this.outbox.splice(0, this.outbox.length, ...snapshot.outbox);
    this.cursor = snapshot.cursor;
  }

  // ---- Internals ---------------------------------------------------------------------------

  private handleResult(mutation: Mutation, result: MutationResult): void {
    // Capture the user's view before the head leaves the queue (needed for conflicts).
    const viewBefore = this.entries.get(mutation.entryId);
    this.outbox.shift();
    switch (result.status) {
      case "applied":
        if (result.entry === null) this.confirmed.delete(mutation.entryId);
        else this.confirm(result.entry);
        return;
      case "gone":
        this.forget(mutation.entryId);
        this.issues.push({ kind: "deleted-elsewhere", entryId: mutation.entryId });
        return;
      case "conflict":
        this.resolveConflict(mutation.entryId, viewBefore, result.current);
        return;
      case "rejected":
        this.issues.push({ kind: "rejected", mutation, reason: result.reason });
        return;
    }
  }

  /**
   * P-15: never silently discard the user's words. Preserve the local text (and media that
   * never reached the server) as a new PRIVATE draft — never auto-shared — then accept the
   * server's version of the original. Delete wins (P-05): a queued delete is kept.
   */
  private resolveConflict(id: EntryId, local: LocalEntry | undefined, current: Entry): void {
    const deletePending = this.outbox.some((m) => m.entryId === id && m.kind === "delete");
    this.dropQueued(id, { keepDeletes: true });
    this.confirm(current);
    if (deletePending || local === undefined) return;

    const unsyncedMedia = local.mediaIds.filter((m) => !current.mediaIds.includes(m));
    if (local.body !== current.body || unsyncedMedia.length > 0) {
      const copy = this.create(local.body, "private");
      // Re-upload media from the local file under a new id, attached to the copy.
      unsyncedMedia.forEach(() => this.attach(copy));
      this.issues.push({ kind: "conflict-copy-created", original: id, copy });
    }
  }

  private applyChange(change: Change): void {
    // Our own mutation in the feed means it was applied: acknowledge it even if its response
    // was lost. Otherwise it would be replayed on top of state that already includes it.
    const ownIndex = this.outbox.findIndex((m) => m.mutationId === change.mutationId);
    if (ownIndex !== -1) this.outbox.splice(ownIndex, 1);

    if (change.type === "delete") {
      this.receivedDeletes.push(change.entryId);
      this.forget(change.entryId);
      return;
    }
    this.received.push(change.entry);
    this.confirm(change.entry);
  }

  /** Confirmed state only moves forward: an older version (late feed item) never regresses it. */
  private confirm(entry: Entry): void {
    const known = this.confirmed.get(entry.id);
    if (known === undefined || entry.version >= known.version) this.confirmed.set(entry.id, entry);
  }

  /** Deleted (here or elsewhere): drop confirmed state and every queued mutation, uploads included. */
  private forget(id: EntryId): void {
    this.confirmed.delete(id);
    this.dropQueued(id);
  }

  private dropQueued(id: EntryId, { keepDeletes = false } = {}): void {
    for (let i = this.outbox.length - 1; i >= 0; i--) {
      const m = this.outbox[i];
      if (m?.entryId === id && !(keepDeletes && m.kind === "delete")) this.outbox.splice(i, 1);
    }
  }

  private ownEntry(id: EntryId): LocalEntry {
    const entry = this.entries.get(id);
    if (entry === undefined) throw new Error(`Unknown entry ${id}`);
    if (entry.authorId !== this.userId) throw new Error("Only the author can change an entry");
    return entry;
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${this.deviceId}-${prefix}${String(this.counter)}`;
  }
}

/** Optimistic local application of a pending mutation, mirroring the server's rules. */
function applyLocally(view: Map<EntryId, LocalEntry>, m: Mutation, userId: UserId): void {
  const entry = view.get(m.entryId);
  switch (m.kind) {
    case "create":
      if (entry === undefined) {
        view.set(m.entryId, {
          id: m.entryId,
          authorId: userId,
          body: m.body,
          visibility: m.visibility,
          expectedVersion: 1,
          mediaIds: [],
        });
      }
      return;
    case "delete":
      view.delete(m.entryId);
      return;
    case "edit":
      if (entry)
        view.set(m.entryId, { ...entry, body: m.body, expectedVersion: entry.expectedVersion + 1 });
      return;
    case "share":
      if (entry)
        view.set(m.entryId, {
          ...entry,
          visibility: "shared",
          expectedVersion: entry.expectedVersion + 1,
        });
      return;
    case "attach":
      if (entry) {
        view.set(m.entryId, {
          ...entry,
          mediaIds: [...entry.mediaIds, m.mediaId],
          expectedVersion: entry.expectedVersion + 1,
        });
      }
      return;
  }
}
