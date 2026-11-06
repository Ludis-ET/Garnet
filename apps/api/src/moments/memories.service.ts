import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  memoryCollectionSchema,
  memorySchema,
  type MemoryCollectionDto,
  type MemoryDto,
  type MemoryKindDto,
  type SaveCollectionRequest,
  type SaveMemoryRequest,
} from "@garnet/contracts";
import { matchesMemory } from "@garnet/domain";
import { sql, type Kysely, type Transaction } from "kysely";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

@Injectable()
export class MemoriesService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private async requireRelationship(trx: Transaction<Database>, userId: string): Promise<string> {
    const member = await trx
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!member) throw new ApiProblem("not_found");
    return member.relationship_id;
  }

  private async getWithTrx(trx: Transaction<Database>, id: string): Promise<MemoryDto | null> {
    const row = await trx.selectFrom("memory").selectAll().where("id", "=", id).executeTakeFirst();

    if (!row) return null;

    const itemLinks = await trx
      .selectFrom("memory_collection_item")
      .innerJoin(
        "memory_collection",
        "memory_collection.id",
        "memory_collection_item.collection_id",
      )
      .select([
        "memory_collection_item.collection_id as collection_id",
        "memory_collection.title as title",
      ])
      .where("memory_collection_item.memory_id", "=", id)
      .execute();

    return memorySchema.parse({
      id: row.id,
      authorId: row.author_id,
      title: row.title,
      story: row.story,
      date: row.memory_date,
      place: row.place,
      kind: row.kind as MemoryKindDto,
      media: row.media_ref,
      tags: row.tags,
      collections: itemLinks.map((l) => ({ id: l.collection_id, title: l.title })),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    });
  }

  async list(
    viewer: Viewer,
    filter?: { search?: string; tag?: string; month?: string },
  ): Promise<MemoryDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);

      const rows = await trx
        .selectFrom("memory")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("memory_date", "desc")
        .orderBy("created_at", "desc")
        .execute();

      const memoryIds = rows.map((r) => r.id);
      let itemLinks: { memory_id: string; collection_id: string; title: string }[] = [];
      if (memoryIds.length > 0) {
        itemLinks = await trx
          .selectFrom("memory_collection_item")
          .innerJoin(
            "memory_collection",
            "memory_collection.id",
            "memory_collection_item.collection_id",
          )
          .select([
            "memory_collection_item.memory_id as memory_id",
            "memory_collection_item.collection_id as collection_id",
            "memory_collection.title as title",
          ])
          .where("memory_collection_item.memory_id", "in", memoryIds)
          .execute();
      }

      const collectionsByMemory = new Map<string, { id: string; title: string }[]>();
      for (const link of itemLinks) {
        const list = collectionsByMemory.get(link.memory_id) ?? [];
        list.push({ id: link.collection_id, title: link.title });
        collectionsByMemory.set(link.memory_id, list);
      }

      const dtos: MemoryDto[] = rows.map((r) =>
        memorySchema.parse({
          id: r.id,
          authorId: r.author_id,
          title: r.title,
          story: r.story,
          date: r.memory_date,
          place: r.place,
          kind: r.kind as MemoryKindDto,
          media: r.media_ref,
          tags: r.tags,
          collections: collectionsByMemory.get(r.id) ?? [],
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }),
      );

      if (!filter) return dtos;
      return dtos.filter((m) =>
        matchesMemory(
          {
            id: m.id,
            title: m.title,
            story: m.story,
            date: m.date,
            place: m.place,
            tags: m.tags,
          },
          filter,
        ),
      );
    });
  }

  async get(id: string, viewer: Viewer): Promise<MemoryDto | null> {
    return asViewer(this.db, viewer, (trx) => this.getWithTrx(trx, id));
  }

  async save(input: SaveMemoryRequest, viewer: Viewer): Promise<MemoryDto> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);
      const memoryId = input.id ?? randomUUID();
      const now = new Date();

      await trx
        .insertInto("memory")
        .values({
          id: memoryId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          title: input.title,
          story: input.story,
          memory_date: input.date,
          place: input.place,
          kind: input.kind,
          media_ref: input.media ? JSON.stringify(input.media) : null,
          tags: input.tags,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column("id").doUpdateSet({
            title: input.title,
            story: input.story,
            memory_date: input.date,
            place: input.place,
            kind: input.kind,
            media_ref: input.media ? JSON.stringify(input.media) : null,
            tags: input.tags,
            updated_at: now,
          }),
        )
        .execute();

      // Sync collections
      await trx.deleteFrom("memory_collection_item").where("memory_id", "=", memoryId).execute();

      if (input.collectionIds.length > 0) {
        for (const colId of input.collectionIds) {
          await trx
            .insertInto("memory_collection_item")
            .values({
              memory_id: memoryId,
              collection_id: colId,
            })
            .execute();
        }
      }

      const saved = await this.getWithTrx(trx, memoryId);
      if (!saved) throw new ApiProblem("internal");
      return saved;
    });
  }

  async remove(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("memory").where("id", "=", id).execute();
    });
  }

  async collections(viewer: Viewer): Promise<MemoryCollectionDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);

      const rows = await trx
        .selectFrom("memory_collection")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("created_at", "asc")
        .execute();

      const counts = await trx
        .selectFrom("memory_collection_item")
        .select(["collection_id", sql<number>`count(*)::int`.as("count")])
        .groupBy("collection_id")
        .execute();

      const countMap = new Map(counts.map((c) => [c.collection_id, c.count]));

      return rows.map((r) =>
        memoryCollectionSchema.parse({
          id: r.id,
          authorId: r.author_id,
          title: r.title,
          description: r.description,
          art: r.art,
          count: countMap.get(r.id) ?? 0,
          createdAt: r.created_at.toISOString(),
        }),
      );
    });
  }

  async createCollection(
    input: SaveCollectionRequest,
    viewer: Viewer,
  ): Promise<MemoryCollectionDto> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);
      const colId = randomUUID();
      const now = new Date();

      await trx
        .insertInto("memory_collection")
        .values({
          id: colId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          title: input.title,
          description: input.description,
          art: input.art,
          created_at: now,
        })
        .execute();

      return memoryCollectionSchema.parse({
        id: colId,
        authorId: viewer.userId,
        title: input.title,
        description: input.description,
        art: input.art,
        count: 0,
        createdAt: now.toISOString(),
      });
    });
  }

  async deleteCollection(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("memory_collection").where("id", "=", id).execute();
    });
  }

  async setInCollection(
    memoryId: string,
    collectionId: string,
    inIt: boolean,
    viewer: Viewer,
  ): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);
      const mem = await trx
        .selectFrom("memory")
        .select("id")
        .where("id", "=", memoryId)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();
      if (!mem) throw new ApiProblem("not_found");

      if (inIt) {
        await trx
          .insertInto("memory_collection_item")
          .values({ memory_id: memoryId, collection_id: collectionId })
          .onConflict((oc) => oc.columns(["memory_id", "collection_id"]).doNothing())
          .execute();
      } else {
        await trx
          .deleteFrom("memory_collection_item")
          .where("memory_id", "=", memoryId)
          .where("collection_id", "=", collectionId)
          .execute();
      }
    });
  }
}
