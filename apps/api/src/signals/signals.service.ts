import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { coarsen, distanceKm, zonePoint, type Point } from "@garnet/domain";
import {
  readSettings,
  sideSchema,
  type DistanceDto,
  type HomePersonDto,
  type RespondSignalRequest,
  type SaveLocationRequest,
  type SendSignalRequest,
  type SendSignalResponse,
  type SignalHistoryResponse,
  type SignalItemDto,
  type SignalResponseKind,
  type SignalType,
  type UsOverviewResponse,
} from "@garnet/contracts";
import { sql, type Kysely, type Transaction } from "kysely";
import { Temporal } from "temporal-polyfill";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { ensureProfile, readProfile, toProfileDto } from "../setup/profiles";
import { NotificationsService } from "../notifications/notifications.service";

const SUPPORT_SIGNALS: readonly SignalType[] = [
  "need-you",
  "need-to-talk",
  "just-listen",
  "check-on-me",
];

const SIGNAL_CATEGORY: Readonly<Record<string, string>> = {
  "thought-of-you": "thought",
  "missing-you": "missing-you",
  "need-you": "need-you",
  "need-to-talk": "need-talk",
  "just-listen": "need-talk",
  "check-on-me": "check-on-me",
  "cant-talk-yet": "cant-talk",
  "okay-now": "okay-now",
};

@Injectable()
export class SignalsService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private async requireRelationshipId(trx: Transaction<Database>, userId: string): Promise<string> {
    const member = await trx
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!member) throw new ApiProblem("not_found");
    return member.relationship_id;
  }

  async getOverview(viewer: Viewer): Promise<UsOverviewResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      await ensureProfile(trx, viewer);
      const myProfile = toProfileDto(await readProfile(trx, viewer));

      // Partner profile from DB function
      const partnerRaw = (
        await sql<{
          name: string;
          side: string | null;
          time_zone: string | null;
          home_city: string | null;
          birth_date: string | null;
          ready: boolean;
        }>`select name, side, time_zone, home_city, birth_date, ready from partner_profile()`.execute(
          trx,
        )
      ).rows[0];

      // Partner user ID for coarse location lookup
      const partnerMember = await trx
        .selectFrom("relationship_member")
        .select("user_id")
        .where("relationship_id", "=", relationshipId)
        .where("user_id", "!=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst();

      // Read viewer's settings (checks if location sharing is turned on)
      const settingsRow = await trx
        .selectFrom("user_settings")
        .select("doc")
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();
      const settings = readSettings(settingsRow?.doc);

      // Distance calculation (P-66)
      let distance: DistanceDto | null = null;
      if (settings.location.share && partnerRaw !== undefined && partnerMember !== undefined) {
        const myLoc = await trx
          .selectFrom("user_coarse_location")
          .select(["lat", "lon"])
          .where("user_id", "=", viewer.userId)
          .executeTakeFirst();

        const partnerLoc = await trx
          .selectFrom("user_coarse_location")
          .select(["lat", "lon"])
          .where("user_id", "=", partnerMember.user_id)
          .executeTakeFirst();

        const myPoint: Point | null =
          myLoc !== undefined
            ? { lat: myLoc.lat, lon: myLoc.lon }
            : zonePoint(myProfile.timeZone ?? "UTC");

        const partnerPoint: Point | null =
          partnerLoc !== undefined
            ? { lat: partnerLoc.lat, lon: partnerLoc.lon }
            : zonePoint(partnerRaw.time_zone ?? "UTC");

        if (myPoint !== null && partnerPoint !== null) {
          distance = {
            km: distanceKm(myPoint, partnerPoint),
            approximate: myLoc === undefined || partnerLoc === undefined,
          };
        }
      }

      // Fetch signals for relationship
      const signalRows = await trx
        .selectFrom("signal")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("sent_at", "desc")
        .limit(50)
        .execute();

      let items: SignalItemDto[] = [];
      if (signalRows.length > 0) {
        const signalIds = signalRows.map((s) => s.id);
        const responseRows = await trx
          .selectFrom("signal_response")
          .selectAll()
          .where("signal_id", "in", signalIds)
          .orderBy("sent_at", "asc")
          .execute();

        const responseMap = new Map<string, SignalResponseKind[]>();
        for (const r of responseRows) {
          if (r.preset !== null) {
            const list = responseMap.get(r.signal_id) ?? [];
            list.push(r.preset as SignalResponseKind);
            responseMap.set(r.signal_id, list);
          }
        }

        items = signalRows.map((s) => ({
          id: s.id,
          signal: s.signal_type as SignalType,
          mine: s.sender_id === viewer.userId,
          at: s.sent_at.toISOString(),
          payload: (typeof s.payload === "string"
            ? JSON.parse(s.payload)
            : (s.payload ?? {})) as SignalItemDto["payload"],
          responses: responseMap.get(s.id) ?? [],
        }));
      }

      // Latest support signal not yet answered, unless superseded by a later "okay-now"
      const latestOkay = items.find((i) => !i.mine && i.signal === "okay-now");
      const openSupport =
        items.find(
          (i) =>
            !i.mine &&
            SUPPORT_SIGNALS.includes(i.signal) &&
            i.responses.length === 0 &&
            (latestOkay === undefined ||
              Temporal.Instant.compare(
                Temporal.Instant.from(i.at),
                Temporal.Instant.from(latestOkay.at),
              ) > 0),
        ) ?? null;

      const partnerSide = sideSchema.safeParse(partnerRaw?.side);
      const me: HomePersonDto = {
        name: myProfile.displayName,
        side: myProfile.side,
        zone: myProfile.timeZone ?? "UTC",
        avatar: myProfile.avatar,
      };

      const partner: HomePersonDto = {
        name: partnerRaw?.name ?? "Partner",
        side: partnerSide.success ? partnerSide.data : null,
        zone: partnerRaw?.time_zone ?? "UTC",
      };

      return {
        me,
        partner,
        distance,
        openSupport,
        recent: items.slice(0, 3),
      };
    });
  }

  async getHistory(viewer: Viewer): Promise<SignalHistoryResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const signalRows = await trx
        .selectFrom("signal")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("sent_at", "desc")
        .limit(100)
        .execute();

      if (signalRows.length === 0) {
        return { signals: [] };
      }

      const signalIds = signalRows.map((s) => s.id);
      const responseRows = await trx
        .selectFrom("signal_response")
        .selectAll()
        .where("signal_id", "in", signalIds)
        .orderBy("sent_at", "asc")
        .execute();

      const responseMap = new Map<string, SignalResponseKind[]>();
      for (const r of responseRows) {
        if (r.preset !== null) {
          const list = responseMap.get(r.signal_id) ?? [];
          list.push(r.preset as SignalResponseKind);
          responseMap.set(r.signal_id, list);
        }
      }

      const signals: SignalItemDto[] = signalRows.map((s) => ({
        id: s.id,
        signal: s.signal_type as SignalType,
        mine: s.sender_id === viewer.userId,
        at: s.sent_at.toISOString(),
        payload: (typeof s.payload === "string"
          ? JSON.parse(s.payload)
          : (s.payload ?? {})) as SignalItemDto["payload"],
        responses: responseMap.get(s.id) ?? [],
      }));

      return { signals };
    });
  }

  async send(viewer: Viewer, req: SendSignalRequest): Promise<SendSignalResponse> {
    const { relationshipId, partnerId, res } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const partnerMember = await trx
        .selectFrom("relationship_member")
        .select("user_id")
        .where("relationship_id", "=", relationshipId)
        .where("user_id", "!=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst();
      const id = randomUUID();
      const level = SUPPORT_SIGNALS.includes(req.signal) ? "support" : "gentle";
      const sentAt = new Date();

      await trx
        .insertInto("signal")
        .values({
          id,
          relationship_id: relationshipId,
          sender_id: viewer.userId,
          signal_type: req.signal,
          level,
          payload: JSON.stringify(req.payload),
          sent_at: sentAt,
          expires_at: null,
          created_at: sentAt,
        })
        .execute();

      return {
        relationshipId,
        partnerId: partnerMember?.user_id ?? null,
        res: {
          id,
          signal: req.signal,
          sentAt: sentAt.toISOString(),
        },
      };
    });

    if (partnerId) {
      await this.notifications.sendNotification({
        relationshipId,
        recipientUserId: partnerId,
        senderUserId: viewer.userId,
        category: SIGNAL_CATEGORY[req.signal] ?? "thought",
        group: "signals",
        href: "/us",
        context: { senderName: viewer.name },
      });
    }

    return res;
  }

  async respond(viewer: Viewer, signalId: string, req: RespondSignalRequest): Promise<void> {
    const { relationshipId, recipientUserId } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const signal = await trx
        .selectFrom("signal")
        .select(["id", "relationship_id", "sender_id"])
        .where("id", "=", signalId)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();

      if (!signal) throw new ApiProblem("not_found");

      const id = randomUUID();
      await trx
        .insertInto("signal_response")
        .values({
          id,
          signal_id: signalId,
          responder_id: viewer.userId,
          preset: req.response,
          body: req.body ?? null,
          sent_at: new Date(),
        })
        .execute();

      return { relationshipId, recipientUserId: signal.sender_id };
    });

    if (recipientUserId && recipientUserId !== viewer.userId) {
      await this.notifications.sendNotification({
        relationshipId,
        recipientUserId,
        senderUserId: viewer.userId,
        category: "reply-reaction",
        group: "signals",
        href: "/us",
        context: { senderName: viewer.name },
      });
    }
  }

  async saveLocation(viewer: Viewer, req: SaveLocationRequest): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      if (req.lat === null || req.lon === null) {
        await trx.deleteFrom("user_coarse_location").where("user_id", "=", viewer.userId).execute();
        return;
      }

      const coarse = coarsen(req.lat, req.lon);
      const now = new Date();

      await trx
        .insertInto("user_coarse_location")
        .values({
          user_id: viewer.userId,
          lat: coarse.lat,
          lon: coarse.lon,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column("user_id").doUpdateSet({
            lat: coarse.lat,
            lon: coarse.lon,
            updated_at: now,
          }),
        )
        .execute();
    });
  }
}
