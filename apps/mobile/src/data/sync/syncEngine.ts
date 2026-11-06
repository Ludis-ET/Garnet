/**
 * Mobile Offline Sync Engine (B3, P-81, ADR-0003, F-04).
 *
 * Implements the F-04 protocol invariants:
 * - Confirmed server state in SQLite + strictly ordered outbox.
 * - Optimistic local view via FIFO outbox replay ("rebase").
 * - Atomic batch push to /v1/mutations with optimistic baseVersion locking.
 * - Private conflict copies on concurrent edits (never lose typed words, §5).
 * - Change feed pulling from /v1/changes with cursor persistence.
 * - Acknowledgement of mutations seen in the feed.
 * - Pre-emptive and idempotent deletions with tombstones (delete wins, P-05).
 */
import type {
  BatchMutationsRequest,
  BatchMutationsResponse,
  ChangeFeedResponse,
  EntryDto,
  EntryKind,
  Mutation,
  Visibility,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import { generateUuid } from "./uuid";

export interface SyncEngineConfig {
  getUserId: () => string;
  getUserTimeZone: () => string;
  postMutations: (req: BatchMutationsRequest) => Promise<BatchMutationsResponse>;
  getChanges: (since: string, limit: number) => Promise<ChangeFeedResponse>;
}

export type SyncIssue =
  | { kind: "conflict-copy-created"; originalId: string; copyId: string }
  | { kind: "deleted-elsewhere"; entryId: string }
  | { kind: "rejected"; mutation: Mutation; reason: string };

export class SyncEngine {
  private syncInProgress = false;
  readonly issues: SyncIssue[] = [];

  drainIssues(): SyncIssue[] {
    return this.issues.splice(0, this.issues.length);
  }

  constructor(
    private readonly store: SqliteStore,
    private readonly config: SyncEngineConfig,
  ) {}

  /** The rebased user-visible entries: confirmed SQLite state with pending outbox applied on top. */
  async getVisibleEntries(): Promise<EntryDto[]> {
    const confirmed = await this.store.getConfirmedEntries();
    const outbox = await this.store.getOutbox();
    const map = new Map<string, EntryDto>();

    for (const c of confirmed) {
      map.set(c.id, c);
    }

    const userId = this.config.getUserId();
    const timeZone = this.config.getUserTimeZone();

    for (const item of outbox) {
      const m = item.mutation;
      const current = map.get(m.entryId);

      switch (m.kind) {
        case "create": {
          if (!current) {
            const nowIso = new Date().toISOString();
            map.set(m.entryId, {
              id: m.entryId,
              authorId: userId,
              kind: m.entryKind,
              body: m.body,
              emoji: m.emoji ?? null,
              mood: m.mood ?? null,
              activity: m.activity ?? null,
              place: m.place ?? null,
              visibility: m.visibility,
              occurredAt: m.occurredAt,
              occurredTimeZone: m.occurredTimeZone || timeZone,
              sharedAt: m.visibility !== "private" ? nowIso : null,
              sharedDay: null,
              version: 1,
              revealedAt: null,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
          break;
        }
        case "edit": {
          if (current) {
            map.set(m.entryId, {
              ...current,
              body: m.body,
              emoji: m.emoji ?? current.emoji,
              mood: m.mood ?? current.mood,
              activity: m.activity ?? current.activity,
              place: m.place ?? current.place,
              occurredAt: m.occurredAt ?? current.occurredAt,
              version: current.version + 1,
              updatedAt: new Date().toISOString(),
            });
          }
          break;
        }
        case "share": {
          if (current) {
            map.set(m.entryId, {
              ...current,
              visibility: m.visibility,
              version: current.version + 1,
              updatedAt: new Date().toISOString(),
            });
          }
          break;
        }
        case "delete": {
          map.delete(m.entryId);
          break;
        }
      }
    }

    return Array.from(map.values());
  }

  async getEntryById(id: string): Promise<EntryDto | null> {
    const entries = await this.getVisibleEntries();
    return entries.find((e) => e.id === id) ?? null;
  }

  // ---- Local operations (work completely offline) --------------------------------------------

  async createEntry(input: {
    kind?: EntryKind;
    text: string;
    emoji?: string;
    mood?: string;
    activity?: string;
    place?: string;
    visibility: Visibility;
    occurredAt?: string;
  }): Promise<EntryDto> {
    const entryId = generateUuid();
    const mutationId = generateUuid();
    const userId = this.config.getUserId();
    const timeZone = this.config.getUserTimeZone();
    const nowIso = new Date().toISOString();
    const occurredAt = input.occurredAt ?? nowIso;

    const mutation: Mutation = {
      kind: "create",
      mutationId,
      entryId,
      entryKind: input.kind ?? "text",
      body: input.text,
      emoji: input.emoji,
      mood: input.mood,
      activity: input.activity,
      place: input.place,
      visibility: input.visibility,
      occurredAt,
      occurredTimeZone: timeZone,
    };

    await this.store.enqueueMutation(mutation);

    return {
      id: entryId,
      authorId: userId,
      kind: input.kind ?? "text",
      body: input.text,
      emoji: input.emoji ?? null,
      mood: input.mood ?? null,
      activity: input.activity ?? null,
      place: input.place ?? null,
      visibility: input.visibility,
      occurredAt,
      occurredTimeZone: timeZone,
      sharedAt: input.visibility !== "private" ? nowIso : null,
      sharedDay: null,
      version: 1,
      revealedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  async editEntry(
    id: string,
    input: {
      text: string;
      emoji?: string;
      mood?: string;
      activity?: string;
      place?: string;
      occurredAt?: string;
    },
  ): Promise<EntryDto> {
    const current = await this.getEntryById(id);
    if (!current) throw new Error(`Unknown entry ${id}`);

    const mutationId = generateUuid();
    const mutation: Mutation = {
      kind: "edit",
      mutationId,
      entryId: id,
      baseVersion: current.version,
      body: input.text,
      emoji: input.emoji,
      mood: input.mood,
      activity: input.activity,
      place: input.place,
      occurredAt: input.occurredAt,
    };

    await this.store.enqueueMutation(mutation, current.version);

    return {
      ...current,
      body: input.text,
      emoji: input.emoji ?? current.emoji,
      mood: input.mood ?? current.mood,
      activity: input.activity ?? current.activity,
      place: input.place ?? current.place,
      occurredAt: input.occurredAt ?? current.occurredAt,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  async shareEntry(id: string, visibility: "shared" | "afterReveal" = "shared"): Promise<void> {
    const current = await this.getEntryById(id);
    if (!current) throw new Error(`Unknown entry ${id}`);

    const mutationId = generateUuid();
    const mutation: Mutation = {
      kind: "share",
      mutationId,
      entryId: id,
      baseVersion: current.version,
      visibility,
    };

    await this.store.enqueueMutation(mutation, current.version);
  }

  async deleteEntry(id: string): Promise<void> {
    const outbox = await this.store.getOutbox();
    const hasCreateQueued = outbox.some(
      (o) => o.mutation.kind === "create" && o.mutation.entryId === id,
    );
    const confirmed = (await this.store.getConfirmedEntries()).find((e) => e.id === id);

    // If it was created locally and never pushed to the server, cancel all outbox mutations for it.
    // Product guardrail §5: private drafts must never reach the server, change feed, logs, etc.
    if (hasCreateQueued && !confirmed) {
      await this.store.dropQueuedForEntry(id);
      return;
    }

    await this.store.dropQueuedForEntry(id);
    const mutationId = generateUuid();
    const mutation: Mutation = {
      kind: "delete",
      mutationId,
      entryId: id,
    };

    await this.store.enqueueMutation(mutation);
  }

  // ---- Sync Protocol (F-04) -----------------------------------------------------------------

  async sync(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    try {
      await this.push();
      await this.pull();
    } finally {
      this.syncInProgress = false;
    }
  }

  async push(): Promise<{ applied: number; conflicts: number; gone: number }> {
    const outbox = await this.store.getOutbox();
    if (outbox.length === 0) return { applied: 0, conflicts: 0, gone: 0 };

    const batch = outbox.slice(0, 50).map((item) => item.mutation);
    const counts = { applied: 0, conflicts: 0, gone: 0 };

    try {
      const response = await this.config.postMutations({ mutations: batch });

      for (let i = 0; i < batch.length; i++) {
        const m = batch[i];
        if (!m) continue;
        const res = response.results[i];
        if (!res) continue;

        const viewBefore = await this.getEntryById(m.entryId);
        await this.store.removeOutboxMutation(m.mutationId);

        switch (res.status) {
          case "applied": {
            counts.applied++;
            if (res.entry === null) {
              await this.store.removeConfirmedEntry(m.entryId);
            } else {
              await this.store.saveConfirmedEntry(res.entry);
            }
            break;
          }
          case "gone": {
            counts.gone++;
            await this.store.removeConfirmedEntry(m.entryId);
            await this.store.dropQueuedForEntry(m.entryId);
            this.issues.push({ kind: "deleted-elsewhere", entryId: m.entryId });
            break;
          }
          case "conflict": {
            counts.conflicts++;
            await this.resolveConflict(m.entryId, viewBefore, res.current);
            break;
          }
          case "rejected": {
            this.issues.push({ kind: "rejected", mutation: m, reason: res.reason });
            break;
          }
        }
      }
    } catch {
      // Network failure or offline: outbox remains safely queued for next retry
    }

    return counts;
  }

  async pull(): Promise<{ count: number }> {
    const cursor = await this.store.getCursor();
    try {
      const response = await this.config.getChanges(cursor, 50);
      const outbox = await this.store.getOutbox();

      for (const change of response.changes) {
        // Acknowledge our own mutation in feed (F-04)
        if (change.mutationId) {
          const own = outbox.find((o) => o.mutation.mutationId === change.mutationId);
          if (own) {
            await this.store.removeOutboxMutation(change.mutationId);
          }
        }

        if (change.type === "delete") {
          await this.store.removeConfirmedEntry(change.entryId);
        } else {
          await this.store.saveConfirmedEntry(change.entry);
        }
      }

      await this.store.setCursor(response.cursor);
      return { count: response.changes.length };
    } catch {
      return { count: 0 };
    }
  }

  /**
   * P-15 / §5 Forgiving UX: Never silently lose the user's typed words.
   * If local body differed from server's current state, preserve local words in a new private draft.
   */
  private async resolveConflict(
    entryId: string,
    local: EntryDto | null,
    current: EntryDto,
  ): Promise<void> {
    const outbox = await this.store.getOutbox();
    const deletePending = outbox.some(
      (o) => o.mutation.entryId === entryId && o.mutation.kind === "delete",
    );

    await this.store.dropQueuedForEntry(entryId, true);
    await this.store.saveConfirmedEntry(current);

    if (deletePending || !local) return;

    if (local.body !== current.body) {
      const copy = await this.createEntry({
        kind: local.kind,
        text: local.body,
        visibility: "private", // Never auto-shared (§5)
        ...(local.emoji ? { emoji: local.emoji } : {}),
        ...(local.mood ? { mood: local.mood } : {}),
        ...(local.activity ? { activity: local.activity } : {}),
        ...(local.place ? { place: local.place } : {}),
      });
      this.issues.push({ kind: "conflict-copy-created", originalId: entryId, copyId: copy.id });
    }
  }
}
