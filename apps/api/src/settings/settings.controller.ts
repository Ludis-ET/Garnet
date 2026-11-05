import { Body, Controller, Get, HttpCode, Inject, Patch } from "@nestjs/common";
import {
  defaultSettingsDoc,
  mergeSettings,
  readSettings,
  SETTINGS_SCHEMA_VERSION,
  settingsPatchSchema,
  sideSchema,
  type SettingsViewDto,
} from "@garnet/contracts";
import { sql, type Kysely } from "kysely";
import { CurrentViewer } from "../auth/session.guard";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { parseBody } from "../http/body";
import { ensureProfile, readProfile, toProfileDto } from "../setup/profiles";

/**
 * Each person's own settings (B2, SET-01 to SET-17): one document, read and written only by
 * them, under RLS. A patch names only what changed and is merged under a row lock, so two
 * devices changing different settings never undo each other. Nothing here reaches the partner,
 * and nothing the partner does reaches here (§5).
 */
@Controller("v1/me/settings")
export class SettingsController {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  @Get()
  async get(@CurrentViewer() viewer: Viewer): Promise<SettingsViewDto> {
    return asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const profile = toProfileDto(await readProfile(trx, viewer));
      const row = await trx
        .selectFrom("user_settings")
        .select("doc")
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();
      const account = (
        await sql<{
          email: string;
          birth_date: string | null;
          terms_version: string | null;
          terms_accepted_at: Date | null;
        }>`select email, birth_date, terms_version, terms_accepted_at from my_account()`.execute(
          trx,
        )
      ).rows[0];
      const partner = (
        await sql<{
          name: string;
          side: string | null;
          time_zone: string | null;
        }>`select name, side, time_zone from partner_profile()`.execute(trx)
      ).rows[0];
      const partnerSide = sideSchema.safeParse(partner?.side);
      const zone = profile.timeZone ?? "UTC";
      return {
        settings: readSettings(row?.doc),
        account: {
          email: account?.email ?? "",
          birthDate: account?.birth_date ?? null,
          termsVersion: account?.terms_version ?? null,
          termsAcceptedAt: account?.terms_accepted_at?.toISOString() ?? null,
        },
        me: {
          name: profile.nickname.trim() || profile.displayName,
          side: profile.side,
          zone,
          avatar: profile.avatar,
        },
        partner:
          partner === undefined
            ? null
            : {
                name: partner.name,
                side: partnerSide.success ? partnerSide.data : null,
                zone: partner.time_zone ?? zone,
              },
      };
    });
  }

  @Patch()
  @HttpCode(204)
  async update(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const patch = parseBody(settingsPatchSchema, body);
    await asViewer(this.db, viewer, async (trx) => {
      // The row exists before it is locked, so a first save from two devices can't race.
      await trx
        .insertInto("user_settings")
        .values({
          user_id: viewer.userId,
          schema_version: SETTINGS_SCHEMA_VERSION,
          doc: JSON.stringify(defaultSettingsDoc()),
          updated_at: sql<Date>`now()`,
        })
        .onConflict((c) => c.column("user_id").doNothing())
        .execute();
      const row = await trx
        .selectFrom("user_settings")
        .select("doc")
        .where("user_id", "=", viewer.userId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      await trx
        .updateTable("user_settings")
        .set({
          doc: JSON.stringify(mergeSettings(readSettings(row.doc), patch)),
          schema_version: SETTINGS_SCHEMA_VERSION,
          updated_at: sql<Date>`now()`,
        })
        .where("user_id", "=", viewer.userId)
        .execute();
    });
  }
}
