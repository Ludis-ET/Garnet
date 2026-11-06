import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  togetherPlaceSchema,
  togetherPlanSchema,
  togetherSongSchema,
  type PlanThemeDto,
  type PlanWhenDto,
  type SavePlaceRequest,
  type SavePlanRequest,
  type SaveSongRequest,
  type TogetherPlaceDto,
  type TogetherPlanDto,
  type TogetherSongDto,
} from "@garnet/contracts";
import type { Kysely, Transaction } from "kysely";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

@Injectable()
export class TogetherService {
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

  // --- Plans -----------------------------------------------------------------

  async plans(viewer: Viewer): Promise<TogetherPlanDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);

      const rows = await trx
        .selectFrom("together_plan")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("completed_at", "asc")
        .orderBy("created_at", "desc")
        .execute();

      return rows.map((r) =>
        togetherPlanSchema.parse({
          id: r.id,
          authorId: r.author_id,
          title: r.title,
          note: r.note,
          theme: r.theme as PlanThemeDto,
          art: r.art,
          place: r.place,
          when: (typeof r.when_data === "string"
            ? JSON.parse(r.when_data)
            : r.when_data) as PlanWhenDto,
          completedAt: r.completed_at?.toISOString() ?? null,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }),
      );
    });
  }

  async savePlan(input: SavePlanRequest, viewer: Viewer): Promise<{ id: string }> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);
      const planId = input.id ?? randomUUID();
      const now = new Date();

      await trx
        .insertInto("together_plan")
        .values({
          id: planId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          title: input.title,
          note: input.note,
          theme: input.theme,
          art: input.art ?? null,
          place: input.place,
          when_data: JSON.stringify(input.when),
          completed_at: null,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column("id").doUpdateSet({
            title: input.title,
            note: input.note,
            theme: input.theme,
            art: input.art ?? null,
            place: input.place,
            when_data: JSON.stringify(input.when),
            updated_at: now,
          }),
        )
        .execute();

      return { id: planId };
    });
  }

  async completePlan(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const now = new Date();
      await trx
        .updateTable("together_plan")
        .set({ completed_at: now, updated_at: now })
        .where("id", "=", id)
        .execute();
    });
  }

  async deletePlan(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("together_plan").where("id", "=", id).execute();
    });
  }

  // --- Places ----------------------------------------------------------------

  async places(viewer: Viewer): Promise<TogetherPlaceDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);

      const rows = await trx
        .selectFrom("together_place")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("created_at", "desc")
        .execute();

      return rows.map((r) =>
        togetherPlaceSchema.parse({
          id: r.id,
          authorId: r.author_id,
          name: r.name,
          note: r.note,
          art: r.art,
          createdAt: r.created_at.toISOString(),
        }),
      );
    });
  }

  async addPlace(input: SavePlaceRequest, viewer: Viewer): Promise<{ id: string }> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);
      const placeId = randomUUID();
      const now = new Date();

      await trx
        .insertInto("together_place")
        .values({
          id: placeId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          name: input.name,
          note: input.note,
          art: input.art ?? null,
          created_at: now,
        })
        .execute();

      return { id: placeId };
    });
  }

  async deletePlace(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("together_place").where("id", "=", id).execute();
    });
  }

  // --- Songs -----------------------------------------------------------------

  async songs(viewer: Viewer): Promise<TogetherSongDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);

      const rows = await trx
        .selectFrom("together_song")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("created_at", "desc")
        .execute();

      return rows.map((r) =>
        togetherSongSchema.parse({
          id: r.id,
          authorId: r.author_id,
          title: r.title,
          artist: r.artist,
          link: r.link,
          note: r.note,
          createdAt: r.created_at.toISOString(),
        }),
      );
    });
  }

  async addSong(input: SaveSongRequest, viewer: Viewer): Promise<{ id: string }> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationship(trx, viewer.userId);
      const songId = randomUUID();
      const now = new Date();

      await trx
        .insertInto("together_song")
        .values({
          id: songId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          title: input.title,
          artist: input.artist,
          link: input.link,
          note: input.note,
          created_at: now,
        })
        .execute();

      return { id: songId };
    });
  }

  async deleteSong(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("together_song").where("id", "=", id).execute();
    });
  }
}
