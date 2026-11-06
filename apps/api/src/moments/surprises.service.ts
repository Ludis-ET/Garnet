import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  surpriseCancelledViewSchema,
  surpriseOpenedViewSchema,
  surpriseScheduledViewSchema,
  type CreateSurpriseRequest,
  type SurpriseContentDto,
  type SurpriseRevealDto,
  type SurpriseViewDto,
} from "@garnet/contracts";
import { Temporal } from "temporal-polyfill";
import { sql, type Kysely, type Transaction } from "kysely";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

@Injectable()
export class SurprisesService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private async requireRelationshipAndPartner(
    trx: Transaction<Database>,
    userId: string,
  ): Promise<{ relationshipId: string; partnerId: string; partnerName: string }> {
    const member = await trx
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!member) throw new ApiProblem("not_found");

    const partner = await trx
      .selectFrom("relationship_member")
      .select("user_id")
      .where("relationship_id", "=", member.relationship_id)
      .where("user_id", "!=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!partner) throw new ApiProblem("not_found");

    const partnerProfile = (
      await sql<{ name: string }>`select name from partner_profile()`.execute(trx)
    ).rows[0];

    return {
      relationshipId: member.relationship_id,
      partnerId: partner.user_id,
      partnerName: partnerProfile?.name ?? "Partner",
    };
  }

  private async getWithTrx(trx: Transaction<Database>, id: string): Promise<SurpriseViewDto> {
    const row = await trx
      .selectFrom("surprise")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) throw new ApiProblem("not_found");

    const reveal = (
      typeof row.reveal === "string" ? JSON.parse(row.reveal) : row.reveal
    ) as SurpriseRevealDto;

    if (row.state === "scheduled") {
      return surpriseScheduledViewSchema.parse({
        id: row.id,
        state: "scheduled",
        authorId: row.author_id,
        recipientId: row.recipient_id,
        safeTitle: row.safe_title,
        reveal,
        createdAt: row.created_at.toISOString(),
      });
    }

    if (row.state === "opened") {
      const contentRow = await trx
        .selectFrom("surprise_content")
        .selectAll()
        .where("surprise_id", "=", row.id)
        .executeTakeFirst();

      const content = contentRow
        ? ({
            kind: contentRow.kind,
            textContent: contentRow.text_content ?? undefined,
            mediaRef: contentRow.media_ref ?? undefined,
            songInfo: contentRow.song_info ?? undefined,
            paper: contentRow.paper ?? undefined,
          } as SurpriseContentDto)
        : ({ kind: "idea" } as SurpriseContentDto);

      return surpriseOpenedViewSchema.parse({
        id: row.id,
        state: "opened",
        authorId: row.author_id,
        recipientId: row.recipient_id,
        safeTitle: row.safe_title,
        reveal,
        content,
        openedAt: row.opened_at?.toISOString() ?? new Date().toISOString(),
        createdAt: row.created_at.toISOString(),
      });
    }

    return surpriseCancelledViewSchema.parse({
      id: row.id,
      state: "cancelled",
      authorId: row.author_id,
      recipientId: row.recipient_id,
      safeTitle: row.safe_title,
      createdAt: row.created_at.toISOString(),
    });
  }

  async list(viewer: Viewer): Promise<{ partnerName: string; items: SurpriseViewDto[] }> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId, partnerName } = await this.requireRelationshipAndPartner(
        trx,
        viewer.userId,
      );

      const rows = await trx
        .selectFrom("surprise")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("created_at", "desc")
        .execute();

      const items: SurpriseViewDto[] = [];
      for (const row of rows) {
        const reveal = (
          typeof row.reveal === "string" ? JSON.parse(row.reveal) : row.reveal
        ) as SurpriseRevealDto;

        if (row.state === "scheduled") {
          items.push(
            surpriseScheduledViewSchema.parse({
              id: row.id,
              state: "scheduled",
              authorId: row.author_id,
              recipientId: row.recipient_id,
              safeTitle: row.safe_title,
              reveal,
              createdAt: row.created_at.toISOString(),
            }),
          );
        } else if (row.state === "opened") {
          const contentRow = await trx
            .selectFrom("surprise_content")
            .selectAll()
            .where("surprise_id", "=", row.id)
            .executeTakeFirst();

          const content = contentRow
            ? ({
                kind: contentRow.kind,
                textContent: contentRow.text_content ?? undefined,
                mediaRef: contentRow.media_ref ?? undefined,
                songInfo: contentRow.song_info ?? undefined,
                paper: contentRow.paper ?? undefined,
              } as SurpriseContentDto)
            : ({ kind: "idea" } as SurpriseContentDto);

          items.push(
            surpriseOpenedViewSchema.parse({
              id: row.id,
              state: "opened",
              authorId: row.author_id,
              recipientId: row.recipient_id,
              safeTitle: row.safe_title,
              reveal,
              content,
              openedAt: row.opened_at?.toISOString() ?? new Date().toISOString(),
              createdAt: row.created_at.toISOString(),
            }),
          );
        } else {
          // row.state === "cancelled"
          items.push(
            surpriseCancelledViewSchema.parse({
              id: row.id,
              state: "cancelled",
              authorId: row.author_id,
              recipientId: row.recipient_id,
              safeTitle: row.safe_title,
              createdAt: row.created_at.toISOString(),
            }),
          );
        }
      }

      return { partnerName, items };
    });
  }

  async get(id: string, viewer: Viewer): Promise<SurpriseViewDto> {
    return asViewer(this.db, viewer, (trx) => this.getWithTrx(trx, id));
  }

  async create(input: CreateSurpriseRequest, viewer: Viewer): Promise<{ id: string }> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId, partnerId } = await this.requireRelationshipAndPartner(
        trx,
        viewer.userId,
      );
      const surpriseId = randomUUID();

      await trx
        .insertInto("surprise")
        .values({
          id: surpriseId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          recipient_id: partnerId,
          safe_title: input.safeTitle ?? null,
          state: "scheduled",
          reveal: JSON.stringify(input.reveal),
          opened_at: null,
          created_at: new Date(),
        })
        .execute();

      await trx
        .insertInto("surprise_content")
        .values({
          surprise_id: surpriseId,
          kind: input.content.kind,
          text_content: input.content.textContent ?? null,
          media_ref: input.content.mediaRef ? JSON.stringify(input.content.mediaRef) : null,
          song_info: input.content.songInfo ? JSON.stringify(input.content.songInfo) : null,
          paper: input.content.paper ? JSON.stringify(input.content.paper) : null,
        })
        .execute();

      return { id: surpriseId };
    });
  }

  async open(id: string, viewer: Viewer): Promise<SurpriseViewDto> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("surprise")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      if (row.state === "opened") {
        return this.getWithTrx(trx, id);
      }

      if (row.state !== "scheduled") {
        throw new ApiProblem("bad_request");
      }

      if (row.recipient_id !== viewer.userId) {
        throw new ApiProblem("bad_request");
      }

      // Check reveal condition
      const reveal = (
        typeof row.reveal === "string" ? JSON.parse(row.reveal) : row.reveal
      ) as SurpriseRevealDto;
      if (reveal.kind === "date") {
        const today = Temporal.Now.plainDateISO();
        const target = Temporal.PlainDate.from(reveal.date);
        if (Temporal.PlainDate.compare(today, target) < 0) {
          throw new ApiProblem("bad_request");
        }
      }

      const now = new Date();
      await trx
        .updateTable("surprise")
        .set({
          state: "opened",
          opened_at: now,
        })
        .where("id", "=", id)
        .execute();

      return this.getWithTrx(trx, id);
    });
  }

  async retitle(id: string, safeTitle: string | null, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("surprise")
        .selectAll()
        .where("id", "=", id)
        .where("author_id", "=", viewer.userId)
        .where("state", "=", "scheduled")
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      await trx
        .updateTable("surprise")
        .set({ safe_title: safeTitle })
        .where("id", "=", id)
        .execute();
    });
  }

  async cancel(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("surprise")
        .selectAll()
        .where("id", "=", id)
        .where("author_id", "=", viewer.userId)
        .where("state", "=", "scheduled")
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      await trx.updateTable("surprise").set({ state: "cancelled" }).where("id", "=", id).execute();
    });
  }

  async delete(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("surprise")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      if (row.state === "scheduled" && row.author_id !== viewer.userId) {
        throw new ApiProblem("not_found");
      }

      await trx.deleteFrom("surprise").where("id", "=", id).execute();
    });
  }
}
