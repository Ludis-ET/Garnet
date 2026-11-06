import { Inject, Injectable } from "@nestjs/common";
import {
  createSharedDayConfig,
  PROPOSED_REFERENCE_TIME_ZONE,
  sharedDayOf,
  sharedDayWindow,
  type SharedDayConfig,
} from "@garnet/domain";
import {
  type DayDetailResponse,
  type DaysOverviewResponse,
  type DaySummaryDto,
  type EntryDto,
  type RevealState,
} from "@garnet/contracts";
import { sql, type Kysely, type SqlBool, type Transaction } from "kysely";
import { Temporal } from "temporal-polyfill";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { toEntryDto } from "../sync/sync.service";
import { NotificationsService } from "../notifications/notifications.service";

/** Provisional shared-day cutoff: 04:00 Europe/London (D-13, U-02). */
const SHARED_DAY_CONFIG: SharedDayConfig = createSharedDayConfig({
  referenceTimeZone: PROPOSED_REFERENCE_TIME_ZONE,
  cutoff: { hour: 4, minute: 0 },
});

const OVERVIEW_DAYS = 10;

@Injectable()
export class DaysService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async getOverview(viewer: Viewer): Promise<DaysOverviewResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const now = Temporal.Now.instant();
      const today = sharedDayOf(now, SHARED_DAY_CONFIG);

      const days: DaySummaryDto[] = [];

      for (let i = 0; i < OVERVIEW_DAYS; i++) {
        const d = today.subtract({ days: i });
        const dateStr = d.toString();
        const window = sharedDayWindow(d, SHARED_DAY_CONFIG);
        const windowStart = new Date(window.start.toString());
        const windowEnd = new Date(window.end.toString());

        // Select entries for day d
        const entries = await trx
          .selectFrom("entry")
          .selectAll()
          .where(
            sql<SqlBool>`(
            (shared_day = ${dateStr} and (visibility = 'shared' or (visibility = 'after_reveal' and revealed_at is not null) or author_id = ${viewer.userId}))
            or
            (visibility = 'private' and author_id = ${viewer.userId} and occurred_at >= ${windowStart} and occurred_at < ${windowEnd})
          )`,
          )
          .orderBy("occurred_at", "asc")
          .execute();

        const readiness = await trx
          .selectFrom("day_readiness")
          .select("user_id")
          .where("relationship_id", "=", relationshipId)
          .where("day", "=", dateStr)
          .execute();

        const meReady = readiness.some((r) => r.user_id === viewer.userId);
        const partnerReady = readiness.some((r) => r.user_id !== viewer.userId);
        const state = this.computeRevealState(meReady, partnerReady);

        const preview: string[] = [];
        for (const e of entries) {
          if (e.emoji && preview.length < 4) {
            preview.push(e.emoji);
          }
        }

        const meHas = entries.some((e) => e.author_id === viewer.userId);
        const partnerHas = entries.some((e) => e.author_id !== viewer.userId);
        const isToday = i === 0;

        if (isToday || meHas || partnerHas) {
          days.push({
            date: dateStr,
            isToday,
            preview,
            me: meHas,
            partner: partnerHas,
            state,
          });
        }
      }

      return {
        today: today.toString(),
        days,
      };
    });
  }

  async getDayDetail(viewer: Viewer, date: string): Promise<DayDetailResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      return this.getDayDetailTrx(trx, viewer, relationshipId, date);
    });
  }

  private async getDayDetailTrx(
    trx: Transaction<Database>,
    viewer: Viewer,
    relationshipId: string,
    date: string,
  ): Promise<DayDetailResponse> {
    const now = Temporal.Now.instant();
    const today = sharedDayOf(now, SHARED_DAY_CONFIG).toString();
    const isToday = date === today;

    const plainDate = Temporal.PlainDate.from(date);
    const window = sharedDayWindow(plainDate, SHARED_DAY_CONFIG);
    const windowStart = new Date(window.start.toString());
    const windowEnd = new Date(window.end.toString());

    const entries = await trx
      .selectFrom("entry")
      .selectAll()
      .where(
        sql<SqlBool>`(
        (shared_day = ${date} and (visibility = 'shared' or (visibility = 'after_reveal' and revealed_at is not null) or author_id = ${viewer.userId}))
        or
        (visibility = 'private' and author_id = ${viewer.userId} and occurred_at >= ${windowStart} and occurred_at < ${windowEnd})
      )`,
      )
      .orderBy("occurred_at", "asc")
      .execute();

    const readiness = await trx
      .selectFrom("day_readiness")
      .select("user_id")
      .where("relationship_id", "=", relationshipId)
      .where("day", "=", date)
      .execute();

    const meReady = readiness.some((r) => r.user_id === viewer.userId);
    const partnerReady = readiness.some((r) => r.user_id !== viewer.userId);
    const state = this.computeRevealState(meReady, partnerReady);

    const mine: EntryDto[] = [];
    const partner: EntryDto[] = [];

    for (const e of entries) {
      if (e.author_id === viewer.userId) {
        mine.push(toEntryDto(e));
      } else {
        partner.push(toEntryDto(e));
      }
    }

    return {
      date,
      isToday,
      mine,
      partner,
      state,
      meReady,
      partnerReady,
    };
  }

  async getEntry(viewer: Viewer, id: string): Promise<EntryDto> {
    return asViewer(this.db, viewer, async (trx) => {
      await this.requireRelationshipId(trx, viewer.userId);
      const entry = await trx
        .selectFrom("entry")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      if (!entry) {
        throw new ApiProblem("not_found");
      }
      return toEntryDto(entry);
    });
  }

  async finishDay(viewer: Viewer, date: string): Promise<DayDetailResponse> {
    const { detail, relationshipId, partnerUserId } = await asViewer(
      this.db,
      viewer,
      async (trx) => {
        const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

        // Record ready for viewer
        await trx
          .insertInto("day_readiness")
          .values({
            relationship_id: relationshipId,
            user_id: viewer.userId,
            day: date,
            ready_at: new Date(),
          })
          .onConflict((oc) => oc.doNothing())
          .execute();

        // Check partner readiness
        const partnerReady = await trx
          .selectFrom("day_readiness")
          .select("user_id")
          .where("relationship_id", "=", relationshipId)
          .where("day", "=", date)
          .where("user_id", "<>", viewer.userId)
          .executeTakeFirst();

        if (partnerReady) {
          // Both finished! Reveal day entries (DAYS-10, P-81)
          await trx
            .updateTable("entry")
            .set({ revealed_at: new Date() })
            .where("relationship_id", "=", relationshipId)
            .where("shared_day", "=", date)
            .where("revealed_at", "is", null)
            .where("visibility", "in", ["shared", "after_reveal"])
            .execute();
        }

        const detail = await this.getDayDetailTrx(trx, viewer, relationshipId, date);
        return { detail, relationshipId, partnerUserId: partnerReady?.user_id ?? null };
      },
    );

    if (partnerUserId) {
      await this.notifications.sendNotification({
        relationshipId,
        recipientUserId: partnerUserId,
        senderUserId: viewer.userId,
        category: "day-reveal",
        group: "days",
        href: `/days/${date}`,
        context: { senderName: viewer.name },
      });
    }

    return detail;
  }

  private computeRevealState(meReady: boolean, partnerReady: boolean): RevealState {
    if (meReady && partnerReady) return "ready";
    if (meReady) return "waiting";
    return "open";
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
}
