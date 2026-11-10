import { Body, Controller, Get, HttpCode, Inject, Patch, Post } from "@nestjs/common";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ageOn,
  chooseSideSchema,
  OPTIONAL_SETUP_STEPS,
  SETUP_STEPS,
  sideSchema,
  togetherSinceSchema,
  updateSetupSchema,
  type SetupStateDto,
} from "@garnet/contracts";
import { sql, type Kysely } from "kysely";
import { CurrentViewer } from "../auth/session.guard";
import { ageCheckToday } from "../auth/today";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { parseBody } from "../http/body";
import { OBJECT_STORAGE, type ObjectStorage } from "../media/storage/object-storage";
import { avatarOf, fetchAccountPicture, saveAvatar } from "./avatar";
import { ensureProfile, readProfile, toProfileDto } from "./profiles";

/** People whose Google picture was already tried in this process (once is enough, P-98). */
const triedAccountPicture = new Set<string>();

type Missing = (typeof SETUP_STEPS)[number];

/**
 * Setup (SETUP-01 to SETUP-08): the person's own answers, saved as they go. The side goes only
 * through the side choice (P-51: the two never match) and completion only through complete.
 * Everything runs under RLS as the viewer; the partner's answers come from partner_profile().
 */
@Controller("v1/me/setup")
export class SetupController {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async get(@CurrentViewer() viewer: Viewer): Promise<SetupStateDto> {
    await this.#importAccountPicture(viewer);
    return asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const profile = toProfileDto(await readProfile(trx, viewer));
      const partner = (
        await sql<{
          name: string;
          side: string | null;
          time_zone: string | null;
          home_city: string | null;
          birth_date: string | null;
          ready: boolean;
          avatar: unknown;
        }>`select name, side, time_zone, home_city, birth_date, ready, partner_avatar() as avatar
             from partner_profile()`.execute(trx)
      ).rows[0];
      const together = (
        await sql<{ d: string | null }>`select our_together_since() as d`.execute(trx)
      ).rows[0]?.d;
      const side = sideSchema.safeParse(partner?.side);
      return {
        profile,
        partner:
          partner === undefined
            ? null
            : {
                name: partner.name,
                side: side.success ? side.data : null,
                timeZone: partner.time_zone,
                homeCity: partner.home_city,
                birthDate: partner.birth_date,
                ready: partner.ready,
                avatar: avatarOf(partner.avatar),
              },
        togetherSince: together ?? null,
      };
    });
  }

  @Patch()
  @HttpCode(204)
  async save(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const patch = parseBody(updateSetupSchema, body);
    await asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      await trx
        .updateTable("profile")
        .set({
          ...(patch.displayName === undefined ? {} : { display_name: patch.displayName }),
          ...(patch.nickname === undefined ? {} : { nickname: patch.nickname }),
          ...(patch.avatar === undefined ? {} : { avatar: JSON.stringify(patch.avatar) }),
          ...(patch.timeZone === undefined ? {} : { time_zone: patch.timeZone }),
          ...(patch.homeCity === undefined ? {} : { home_city: patch.homeCity }),
          ...(patch.appearance === undefined ? {} : { appearance: patch.appearance }),
          ...(patch.accent === undefined ? {} : { accent: patch.accent }),
          ...(patch.notifications === undefined
            ? {}
            : { notifications: JSON.stringify(patch.notifications) }),
          // Steps only ever accumulate, as the person goes.
          ...(patch.done === undefined
            ? {}
            : {
                done: sql<
                  string[]
                >`(select array(select distinct unnest(done || ${patch.done}::text[])))`,
              }),
          updated_at: sql<Date>`now()`,
        })
        .where("user_id", "=", viewer.userId)
        .execute();
    });
  }

  /**
   * The first time someone with a Google picture opens setup, before they chose a picture, it
   * becomes theirs (P-98). They can change it or go back to initials in the picture step.
   */
  async #importAccountPicture(viewer: Viewer): Promise<void> {
    if (triedAccountPicture.has(viewer.userId)) return;
    triedAccountPicture.add(viewer.userId);
    const state = await asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const profile = await readProfile(trx, viewer);
      const image = (
        await sql<{ image: string | null }>`select my_account_image() as image`.execute(trx)
      ).rows[0]?.image;
      return { avatar: avatarOf(profile.avatar), chosen: profile.done.includes("photo"), image };
    });
    if (state.chosen || state.avatar.kind !== "initials" || state.avatar.swatch !== 0) return;
    if (state.image == null) return;
    const picture = await fetchAccountPicture(state.image);
    if (picture === null) return;
    await saveAvatar(
      this.storage,
      viewer,
      picture.bytes,
      picture.type,
      (fn) => asViewer(this.db, viewer, fn),
      false,
    ).catch(() => undefined);
  }

  @Post("side")
  @HttpCode(200)
  async chooseSide(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<{ ok: true } | { ok: false; reason: "taken"; partnerSide: "ruby" | "sapphire" }> {
    const { side } = parseBody(chooseSideSchema, body);
    const taken = await asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const r = await sql<{ taken: string | null }>`select choose_side(${side}) as taken`.execute(
        trx,
      );
      return r.rows[0]?.taken ?? null;
    });
    const partnerSide = sideSchema.safeParse(taken);
    return partnerSide.success
      ? { ok: false, reason: "taken", partnerSide: partnerSide.data }
      : { ok: true };
  }

  /**
   * When the two got together (P-79): one answer for the pair, set or changed by either, never
   * in the future. Only once paired (400 before), and it marks the step done for the caller.
   */
  @Post("together-since")
  @HttpCode(204)
  async togetherSince(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const { togetherSince } = parseBody(togetherSinceSchema, body);
    if (togetherSince !== null && ageOn(togetherSince, ageCheckToday()) < 0)
      throw new ApiProblem("validation_failed", [{ path: ["togetherSince"], code: "future" }]);
    await asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      await sql`select set_together_since(${togetherSince}::date)`.execute(trx);
      await trx
        .updateTable("profile")
        .set({
          done: sql<string[]>`(select array(select distinct unnest(done || array['together'])))`,
          updated_at: sql<Date>`now()`,
        })
        .where("user_id", "=", viewer.userId)
        .execute();
    }).catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "GN409")
        throw new ApiProblem("bad_request");
      throw error;
    });
  }

  @Post("complete")
  @HttpCode(200)
  async complete(
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: true } | { ok: false; missing: Missing[] }> {
    const result = await this.#complete(viewer);
    // P-99, P-102: the partner who was waiting hears that their space is open.
    if (result.ok && result.waiting !== null)
      await this.notifications
        .sendNotification({
          relationshipId: result.waiting.rel,
          recipientUserId: result.waiting.partner,
          senderUserId: viewer.userId,
          category: "partner-joined",
          group: "account",
          href: "/",
          context: { senderName: viewer.name },
        })
        .catch(() => undefined);
    return result.ok ? { ok: true } : { ok: false, missing: result.missing };
  }

  async #complete(
    viewer: Viewer,
  ): Promise<
    | { ok: true; waiting: { rel: string; partner: string } | null }
    | { ok: false; missing: Missing[] }
  > {
    return asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const profile = toProfileDto(await readProfile(trx, viewer));
      const missing = SETUP_STEPS.filter(
        (step) => !OPTIONAL_SETUP_STEPS.includes(step) && !profile.done.includes(step),
      );
      if (profile.side === null && !missing.includes("side")) missing.push("side");
      if (missing.length > 0) return { ok: false as const, missing };
      await trx
        .updateTable("profile")
        .set({ complete: true, updated_at: sql<Date>`now()` })
        .where("user_id", "=", viewer.userId)
        .execute();
      const partner = (
        await sql<{ rel: string | null; partner: string | null; ready: boolean | null }>`
          select my_relationship() as rel, my_partner() as partner,
                 (select ready from partner_profile()) as ready`.execute(trx)
      ).rows[0];
      const waiting =
        !profile.complete &&
        partner?.rel != null &&
        partner.partner != null &&
        partner.ready === true
          ? { rel: partner.rel, partner: partner.partner }
          : null;
      return { ok: true as const, waiting };
    });
  }
}
