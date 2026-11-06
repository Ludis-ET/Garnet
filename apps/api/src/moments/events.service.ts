import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  calendarEventSchema,
  chapterReflectionSchema,
  chapterSummarySchema,
  type CalendarEventDto,
  type ChapterReflectionDto,
  type ChapterSummaryDto,
  type EventKindDto,
  type RepeatDto,
  type SaveEventRequest,
} from "@garnet/contracts";
import { formatDualTime, nextDate } from "@garnet/domain";
import { sql, type Kysely, type Transaction } from "kysely";
import { Temporal } from "temporal-polyfill";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

@Injectable()
export class EventsService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private async requireRelationshipAndPartner(
    trx: Transaction<Database>,
    userId: string,
  ): Promise<{
    relationshipId: string;
    partnerId: string;
    viewerZone: string;
    partnerZone: string;
  }> {
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

    const viewerProfile = await trx
      .selectFrom("profile")
      .select("time_zone")
      .where("user_id", "=", userId)
      .executeTakeFirst();
    const partnerRaw = (
      await sql<{ time_zone: string | null }>`select time_zone from partner_profile()`.execute(trx)
    ).rows[0];

    return {
      relationshipId: member.relationship_id,
      partnerId: partner.user_id,
      viewerZone: viewerProfile?.time_zone ?? "Europe/London",
      partnerZone: partnerRaw?.time_zone ?? "Africa/Addis_Ababa",
    };
  }

  async list(viewer: Viewer): Promise<{
    today: string;
    events: (CalendarEventDto & {
      nextOccurrence: string | null;
      times: { me: string; partner: string } | null;
    })[];
  }> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId, viewerZone, partnerZone } = await this.requireRelationshipAndPartner(
        trx,
        viewer.userId,
      );

      const rows = await trx
        .selectFrom("calendar_event")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("first_date", "asc")
        .execute();

      const today = Temporal.Now.plainDateISO().toString();
      const events = rows.map((row) => {
        const dto = calendarEventSchema.parse({
          id: row.id,
          authorId: row.author_id,
          title: row.title,
          kind: row.kind as EventKindDto,
          firstDate: row.first_date,
          eventTime: row.event_time,
          timeZone: row.time_zone,
          repeats: row.repeats as RepeatDto,
          whose: row.whose as "me" | "partner" | null | undefined,
          description: row.description,
          reminders: (row.reminders as string[] | null) ?? undefined,
          art: row.art,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        });

        const nextOccurrence = nextDate(dto.firstDate, dto.repeats, today);
        const times = dto.eventTime
          ? formatDualTime(
              nextOccurrence ?? dto.firstDate,
              dto.eventTime,
              dto.timeZone ?? null,
              viewerZone,
              partnerZone,
            )
          : null;

        return { ...dto, nextOccurrence, times };
      });

      return { today, events };
    });
  }

  async get(id: string, viewer: Viewer): Promise<CalendarEventDto | null> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("calendar_event")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) return null;

      return calendarEventSchema.parse({
        id: row.id,
        authorId: row.author_id,
        title: row.title,
        kind: row.kind as EventKindDto,
        firstDate: row.first_date,
        eventTime: row.event_time,
        timeZone: row.time_zone,
        repeats: row.repeats as RepeatDto,
        whose: row.whose as "me" | "partner" | null | undefined,
        description: row.description,
        reminders: (row.reminders as string[] | null) ?? undefined,
        art: row.art,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      });
    });
  }

  async save(input: SaveEventRequest, viewer: Viewer): Promise<{ id: string }> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId } = await this.requireRelationshipAndPartner(trx, viewer.userId);
      const eventId = input.id ?? randomUUID();
      const now = new Date();

      await trx
        .insertInto("calendar_event")
        .values({
          id: eventId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          title: input.title,
          kind: input.kind,
          first_date: input.firstDate,
          event_time: input.eventTime ?? null,
          time_zone: input.timeZone ?? null,
          repeats: input.repeats,
          whose: input.whose ?? null,
          description: input.description ?? null,
          reminders: input.reminders ? JSON.stringify(input.reminders) : null,
          art: input.art ?? null,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column("id").doUpdateSet({
            title: input.title,
            kind: input.kind,
            first_date: input.firstDate,
            event_time: input.eventTime ?? null,
            time_zone: input.timeZone ?? null,
            repeats: input.repeats,
            whose: input.whose ?? null,
            description: input.description ?? null,
            reminders: input.reminders ? JSON.stringify(input.reminders) : null,
            art: input.art ?? null,
            updated_at: now,
          }),
        )
        .execute();

      return { id: eventId };
    });
  }

  async remove(id: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("calendar_event").where("id", "=", id).execute();
    });
  }

  async chapters(viewer: Viewer): Promise<ChapterSummaryDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId } = await this.requireRelationshipAndPartner(trx, viewer.userId);

      // Group reflections by month
      const counts = await trx
        .selectFrom("chapter_reflection")
        .select(["month", sql<number>`count(*)::int`.as("count")])
        .where("relationship_id", "=", relationshipId)
        .groupBy("month")
        .execute();

      const titles = await trx
        .selectFrom("chapter_title")
        .select(["month", "title"])
        .where("relationship_id", "=", relationshipId)
        .execute();

      const titleMap = new Map(titles.map((t) => [t.month, t.title]));
      const countMap = new Map(counts.map((c) => [c.month, c.count]));

      // Collect all distinct months
      const allMonths = Array.from(new Set([...countMap.keys(), ...titleMap.keys()]));
      allMonths.sort().reverse();

      return allMonths.map((m) =>
        chapterSummarySchema.parse({
          month: m,
          title: titleMap.get(m) ?? `Chapter ${m}`,
          reflectionCount: countMap.get(m) ?? 0,
        }),
      );
    });
  }

  async chapterReflections(
    month: string,
    viewer: Viewer,
  ): Promise<{ title: string; reflections: ChapterReflectionDto[] }> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId } = await this.requireRelationshipAndPartner(trx, viewer.userId);

      const titleRow = await trx
        .selectFrom("chapter_title")
        .select("title")
        .where("relationship_id", "=", relationshipId)
        .where("month", "=", month)
        .executeTakeFirst();

      const rows = await trx
        .selectFrom("chapter_reflection")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .where("month", "=", month)
        .execute();

      const reflections = rows.map((r) =>
        chapterReflectionSchema.parse({
          relationshipId: r.relationship_id,
          userId: r.user_id,
          month: r.month,
          promptId: r.prompt_id,
          reflection: r.reflection,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }),
      );

      return {
        title: titleRow?.title ?? `Chapter ${month}`,
        reflections,
      };
    });
  }

  async reflect(
    month: string,
    promptId: string,
    reflection: string,
    viewer: Viewer,
  ): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const { relationshipId } = await this.requireRelationshipAndPartner(trx, viewer.userId);
      const now = new Date();

      await trx
        .insertInto("chapter_reflection")
        .values({
          relationship_id: relationshipId,
          user_id: viewer.userId,
          month,
          prompt_id: promptId,
          reflection,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.columns(["relationship_id", "user_id", "month", "prompt_id"]).doUpdateSet({
            reflection,
            updated_at: now,
          }),
        )
        .execute();
    });
  }

  async renameChapter(month: string, title: string, viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const { relationshipId } = await this.requireRelationshipAndPartner(trx, viewer.userId);
      const now = new Date();

      await trx
        .insertInto("chapter_title")
        .values({
          relationship_id: relationshipId,
          month,
          title,
          renamed_by: viewer.userId,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.columns(["relationship_id", "month"]).doUpdateSet({
            title,
            renamed_by: viewer.userId,
            updated_at: now,
          }),
        )
        .execute();
    });
  }
}
