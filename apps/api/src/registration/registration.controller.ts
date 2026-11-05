import { Body, Controller, Get, HttpCode, Inject, Post } from "@nestjs/common";
import {
  isOldEnough,
  isRegistrationComplete,
  registrationSchema,
  TERMS_VERSION,
  type RegistrationStateDto,
  type SignInMethodsDto,
} from "@garnet/contracts";
import { sql, type Kysely } from "kysely";
import type { Auth } from "../auth/auth";
import { BeforeRegistration, CurrentViewer, Public } from "../auth/session.guard";
import { ageCheckToday } from "../auth/today";
import type { SocialConfig } from "../config";
import { asViewer, AUTH, KYSELY, SOCIAL, type Database, type Viewer } from "../db/database";
import { parseBody } from "../http/body";

/**
 * Registration details (P-79): a birthday, 16 and over, and the current terms and privacy
 * notice. Email sign-ups give them with the account; after a first Google or Apple sign-in the
 * app asks here before anything else (the guard answers registration_required until then).
 */
@Controller("v1/me/registration")
export class RegistrationController {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(AUTH) private readonly auth: Auth,
  ) {}

  @Get()
  @BeforeRegistration()
  async get(@CurrentViewer() viewer: Viewer): Promise<RegistrationStateDto> {
    const row = await asViewer(
      this.db,
      viewer,
      async (trx) =>
        (
          await sql<{
            birth_date: string | null;
            terms_version: string | null;
          }>`select birth_date, terms_version from my_registration()`.execute(trx)
        ).rows[0],
    );
    const birthDate = row?.birth_date ?? null;
    const termsVersion = row?.terms_version ?? null;
    return {
      complete: isRegistrationComplete(birthDate, termsVersion),
      birthDate,
      termsVersion,
      currentTermsVersion: TERMS_VERSION,
    };
  }

  /**
   * Too young: a new account goes, with everything it had (P-79, data minimisation). Only one
   * that never gave a birthday: an existing account or a relationship's member is only refused.
   */
  @Post()
  @HttpCode(200)
  @BeforeRegistration()
  async complete(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<{ ok: true } | { ok: false; reason: "too-young" }> {
    const { birthDate, termsVersion } = parseBody(registrationSchema, body);
    if (!isOldEnough(birthDate, ageCheckToday())) {
      const { member, registered } = await asViewer(this.db, viewer, async (trx) => ({
        member: await trx
          .selectFrom("relationship_member")
          .select("user_id")
          .where("user_id", "=", viewer.userId)
          .executeTakeFirst(),
        registered:
          (
            await sql<{
              birth_date: string | null;
            }>`select birth_date from my_registration()`.execute(trx)
          ).rows[0]?.birth_date != null,
      }));
      if (member === undefined && !registered)
        await (await this.auth.$context).internalAdapter.deleteUser(viewer.userId);
      return { ok: false, reason: "too-young" };
    }
    await asViewer(this.db, viewer, async (trx) => {
      await sql`select complete_registration(${birthDate}, ${termsVersion})`.execute(trx);
    });
    return { ok: true };
  }
}

/** `GET /v1/sign-in-methods` (public): which ways in are switched on, so the app shows those. */
@Controller("v1/sign-in-methods")
export class SignInMethodsController {
  constructor(@Inject(SOCIAL) private readonly social: SocialConfig) {}

  @Public()
  @Get()
  methods(): SignInMethodsDto {
    return {
      email: true,
      google: this.social.google !== undefined,
      apple: this.social.apple !== undefined,
    };
  }
}
