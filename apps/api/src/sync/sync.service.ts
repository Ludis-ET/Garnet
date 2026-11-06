import { Inject, Injectable } from "@nestjs/common";
import {
  createSharedDayConfig,
  PROPOSED_REFERENCE_TIME_ZONE,
  sharedDayOf,
  type SharedDayConfig,
} from "@garnet/domain";
import {
  type BatchMutationsRequest,
  type BatchMutationsResponse,
  type ChangeDto,
  type ChangeFeedResponse,
  type EntryDto,
  type EntryKind,
  type Mutation,
  type MutationResult,
  type Visibility,
} from "@garnet/contracts";
import { createHash } from "node:crypto";
import { sql, type Kysely, type SqlBool, type Transaction } from "kysely";
import { Temporal } from "temporal-polyfill";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

/** Provisional shared-day cutoff: 04:00 Europe/London (D-13, U-02). */
const SHARED_DAY_CONFIG: SharedDayConfig = createSharedDayConfig({
  referenceTimeZone: PROPOSED_REFERENCE_TIME_ZONE,
  cutoff: { hour: 4, minute: 0 },
});

function formatSharedDay(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "string") {
    return val.slice(0, 10);
  }
  return null;
}

export function toEntryDto(row: {
  id: string;
  author_id: string;
  kind: string;
  body: string | null;
  emoji?: string | null;
  mood?: string | null;
  activity?: string | null;
  place?: string | null;
  visibility: string;
  occurred_at: Date;
  occurred_time_zone: string;
  shared_at: Date | null;
  shared_day: string | null | Date;
  version: number;
  revealed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): EntryDto {
  const vis: Visibility =
    row.visibility === "after_reveal" ? "afterReveal" : (row.visibility as Visibility);
  return {
    id: row.id,
    authorId: row.author_id,
    kind: row.kind as EntryKind,
    body: row.body ?? "",
    emoji: row.emoji ?? null,
    mood: row.mood ?? null,
    activity: row.activity ?? null,
    place: row.place ?? null,
    visibility: vis,
    occurredAt: (row.occurred_at instanceof Date
      ? row.occurred_at
      : new Date(row.occurred_at)
    ).toISOString(),
    occurredTimeZone: row.occurred_time_zone,
    sharedAt: row.shared_at
      ? (row.shared_at instanceof Date ? row.shared_at : new Date(row.shared_at)).toISOString()
      : null,
    sharedDay: formatSharedDay(row.shared_day),
    version: row.version,
    revealedAt: row.revealed_at
      ? (row.revealed_at instanceof Date
          ? row.revealed_at
          : new Date(row.revealed_at)
        ).toISOString()
      : null,
    createdAt: (row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at)
    ).toISOString(),
    updatedAt: (row.updated_at instanceof Date
      ? row.updated_at
      : new Date(row.updated_at)
    ).toISOString(),
  };
}

function mutationFingerprint(m: Mutation): Buffer {
  return createHash("sha256").update(JSON.stringify(m), "utf8").digest();
}

@Injectable()
export class SyncService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async applyMutations(
    viewer: Viewer,
    request: BatchMutationsRequest,
  ): Promise<BatchMutationsResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const results: MutationResult[] = [];

      for (const m of request.mutations) {
        const result = await this.applySingleMutation(trx, viewer, relationshipId, m);
        results.push(result);
      }

      return { results };
    });
  }

  async getChanges(viewer: Viewer, since: string, limit: number): Promise<ChangeFeedResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      await this.requireRelationshipId(trx, viewer.userId);

      const sinceSeq = BigInt(since || "0");
      const rows = await trx
        .selectFrom("change_log")
        .selectAll()
        .where(sql<SqlBool>`seq > ${sinceSeq}`)
        .orderBy("seq", "asc")
        .limit(limit + 1)
        .execute();

      const hasMore = rows.length > limit;
      const slice = hasMore ? rows.slice(0, limit) : rows;
      const changes: ChangeDto[] = [];

      for (const row of slice) {
        if (row.op === "delete") {
          changes.push({
            type: "delete",
            entryId: row.entity_id,
            mutationId: row.mutation_id,
            seq: String(row.seq),
          });
        } else {
          const entry = await trx
            .selectFrom("entry")
            .selectAll()
            .where("id", "=", row.entity_id)
            .executeTakeFirst();
          if (entry) {
            changes.push({
              type: "upsert",
              entry: toEntryDto(entry),
              mutationId: row.mutation_id,
              seq: String(row.seq),
            });
          }
        }
      }

      const last = slice[slice.length - 1];
      const cursor = last !== undefined ? String(last.seq) : since;
      return { changes, cursor, hasMore };
    });
  }

  private async requireRelationshipId(trx: Transaction<Database>, userId: string): Promise<string> {
    const member = await trx
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!member) {
      throw new ApiProblem("not_found");
    }
    return member.relationship_id;
  }

  private async applySingleMutation(
    trx: Transaction<Database>,
    viewer: Viewer,
    relationshipId: string,
    m: Mutation,
  ): Promise<MutationResult> {
    const fingerprint = mutationFingerprint(m);

    // 1. Check idempotency record
    const previous = await trx
      .selectFrom("processed_mutation")
      .select(["request_fingerprint", "outcome"])
      .where("mutation_id", "=", m.mutationId)
      .where("user_id", "=", viewer.userId)
      .executeTakeFirst();

    if (previous !== undefined) {
      if (Buffer.compare(previous.request_fingerprint, fingerprint) !== 0) {
        return { status: "rejected", reason: "idempotency-key-reuse" };
      }
      return this.replayMutation(trx, m);
    }

    // 2. Set transaction app.mutation_id for change_log trigger
    await sql`select set_config('app.mutation_id', ${m.mutationId}, true)`.execute(trx);

    // 3. Dispatch mutation
    let result: MutationResult;
    switch (m.kind) {
      case "create":
        result = await this.handleCreate(trx, viewer, relationshipId, m);
        break;
      case "edit":
        result = await this.handleEdit(trx, viewer, m);
        break;
      case "share":
        result = await this.handleShare(trx, viewer, m);
        break;
      case "delete":
        result = await this.handleDelete(trx, viewer, relationshipId, m);
        break;
    }

    // 4. Record idempotency
    await trx
      .insertInto("processed_mutation")
      .values({
        mutation_id: m.mutationId,
        user_id: viewer.userId,
        request_fingerprint: fingerprint,
        outcome: result.status,
        created_at: new Date(),
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    return result;
  }

  private async replayMutation(trx: Transaction<Database>, m: Mutation): Promise<MutationResult> {
    const tombstone = await trx
      .selectFrom("tombstone")
      .select("entity_id")
      .where("entity_type", "=", "entry")
      .where("entity_id", "=", m.entryId)
      .executeTakeFirst();
    if (tombstone) return { status: "gone" };
    if (m.kind === "delete") return { status: "applied", entry: null };

    const entry = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirst();
    return { status: "applied", entry: entry ? toEntryDto(entry) : null };
  }

  private async handleCreate(
    trx: Transaction<Database>,
    viewer: Viewer,
    relationshipId: string,
    m: Extract<Mutation, { kind: "create" }>,
  ): Promise<MutationResult> {
    const tombstone = await trx
      .selectFrom("tombstone")
      .select("entity_id")
      .where("entity_type", "=", "entry")
      .where("entity_id", "=", m.entryId)
      .executeTakeFirst();
    if (tombstone) return { status: "gone" };

    const existing = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirst();
    if (existing) {
      if (existing.author_id === viewer.userId) {
        return { status: "applied", entry: toEntryDto(existing) };
      }
      return { status: "rejected", reason: "duplicate-id" };
    }

    const now = new Date();
    let occurredAt = new Date(m.occurredAt);
    // U-14: Future clock skew tolerance clamp to now (max 5 minutes)
    if (occurredAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      occurredAt = now;
    }

    const isShared = m.visibility === "shared" || m.visibility === "afterReveal";
    const sharedDay = isShared
      ? sharedDayOf(Temporal.Instant.from(now.toISOString()), SHARED_DAY_CONFIG).toString()
      : null;
    const sharedAt = isShared ? now : null;
    const sqlVisibility = m.visibility === "afterReveal" ? "after_reveal" : m.visibility;

    await trx
      .insertInto("entry")
      .values({
        id: m.entryId,
        relationship_id: relationshipId,
        author_id: viewer.userId,
        kind: m.entryKind,
        body: m.body,
        emoji: m.emoji ?? null,
        mood: m.mood ?? null,
        activity: m.activity ?? null,
        place: m.place ?? null,
        visibility: sqlVisibility,
        occurred_at: occurredAt,
        occurred_time_zone: m.occurredTimeZone,
        received_at: now,
        shared_at: sharedAt,
        shared_day: sharedDay,
        version: 1,
        revealed_at: null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const created = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirstOrThrow();
    return { status: "applied", entry: toEntryDto(created) };
  }

  private async handleEdit(
    trx: Transaction<Database>,
    viewer: Viewer,
    m: Extract<Mutation, { kind: "edit" }>,
  ): Promise<MutationResult> {
    const tombstone = await trx
      .selectFrom("tombstone")
      .select("entity_id")
      .where("entity_type", "=", "entry")
      .where("entity_id", "=", m.entryId)
      .executeTakeFirst();
    if (tombstone) return { status: "gone" };

    const entry = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirst();
    if (entry?.author_id !== viewer.userId) {
      return { status: "rejected", reason: "not-found" };
    }
    if (entry.revealed_at !== null) {
      return { status: "rejected", reason: "read-only" };
    }
    if (entry.version !== m.baseVersion) {
      return { status: "conflict", current: toEntryDto(entry) };
    }

    let occurredAt = entry.occurred_at;
    if (m.occurredAt) {
      const parsed = new Date(m.occurredAt);
      const now = new Date();
      occurredAt = parsed.getTime() > now.getTime() + 5 * 60 * 1000 ? now : parsed;
    }

    await trx
      .updateTable("entry")
      .set({
        body: m.body,
        emoji: m.emoji ?? entry.emoji,
        mood: m.mood ?? entry.mood,
        activity: m.activity ?? entry.activity,
        place: m.place ?? entry.place,
        occurred_at: occurredAt,
      })
      .where("id", "=", m.entryId)
      .execute();

    const updated = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirstOrThrow();
    return { status: "applied", entry: toEntryDto(updated) };
  }

  private async handleShare(
    trx: Transaction<Database>,
    viewer: Viewer,
    m: Extract<Mutation, { kind: "share" }>,
  ): Promise<MutationResult> {
    const tombstone = await trx
      .selectFrom("tombstone")
      .select("entity_id")
      .where("entity_type", "=", "entry")
      .where("entity_id", "=", m.entryId)
      .executeTakeFirst();
    if (tombstone) return { status: "gone" };

    const entry = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirst();
    if (entry?.author_id !== viewer.userId) {
      return { status: "rejected", reason: "not-found" };
    }
    if (entry.revealed_at !== null) {
      return { status: "rejected", reason: "read-only" };
    }
    if (entry.version !== m.baseVersion) {
      return { status: "conflict", current: toEntryDto(entry) };
    }

    const targetVisibility = m.visibility === "afterReveal" ? "after_reveal" : "shared";
    if (entry.visibility === targetVisibility) {
      return { status: "applied", entry: toEntryDto(entry) };
    }

    const now = new Date();
    const sharedDay = sharedDayOf(
      Temporal.Instant.from(now.toISOString()),
      SHARED_DAY_CONFIG,
    ).toString();

    await trx
      .updateTable("entry")
      .set({
        visibility: targetVisibility,
        shared_at: now,
        shared_day: sharedDay,
      })
      .where("id", "=", m.entryId)
      .execute();

    const updated = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirstOrThrow();
    return { status: "applied", entry: toEntryDto(updated) };
  }

  private async handleDelete(
    trx: Transaction<Database>,
    viewer: Viewer,
    relationshipId: string,
    m: Extract<Mutation, { kind: "delete" }>,
  ): Promise<MutationResult> {
    const tombstone = await trx
      .selectFrom("tombstone")
      .select("entity_id")
      .where("entity_type", "=", "entry")
      .where("entity_id", "=", m.entryId)
      .executeTakeFirst();
    if (tombstone) return { status: "applied", entry: null };

    const entry = await trx
      .selectFrom("entry")
      .selectAll()
      .where("id", "=", m.entryId)
      .executeTakeFirst();
    if (entry) {
      if (entry.visibility === "private" && entry.author_id !== viewer.userId) {
        return { status: "rejected", reason: "not-found" };
      }
      // Trigger entry_write_tombstone writes tombstone and change_log automatically
      await trx.deleteFrom("entry").where("id", "=", m.entryId).execute();
    } else {
      // Pre-emptive deletion (P-05)
      await trx
        .insertInto("tombstone")
        .values({
          entity_type: "entry",
          entity_id: m.entryId,
          relationship_id: relationshipId,
          deleted_at: new Date(),
        })
        .onConflict((oc) => oc.doNothing())
        .execute();

      await trx
        .insertInto("change_log")
        .values({
          seq: sql`default`,
          relationship_id: relationshipId,
          entity_type: "entry",
          entity_id: m.entryId,
          op: "delete",
          mutation_id: m.mutationId,
          visible_to: viewer.userId,
          created_at: new Date(),
        })
        .execute();
    }

    return { status: "applied", entry: null };
  }
}
