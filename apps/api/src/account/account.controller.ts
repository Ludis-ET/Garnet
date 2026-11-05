import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  isOldEnough,
  updateAccountSchema,
  type AccountMethodsDto,
  type DeviceDto,
} from "@garnet/contracts";
import { sql, type Kysely } from "kysely";
import type { Auth } from "../auth/auth";
import { isRecentSignIn, PROVIDER_HOSTS, type ProviderId } from "../auth/constants";
import { CurrentViewer } from "../auth/session.guard";
import { ageCheckToday } from "../auth/today";
import type { SocialConfig } from "../config";
import { asViewer, AUTH, KYSELY, SOCIAL, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { parseBody } from "../http/body";
import { deviceName } from "./device-name";

const isProvider = (id: string): id is ProviderId => Object.hasOwn(PROVIDER_HOSTS, id);

/**
 * The person's own account (B2, P-80): their birthday, and the ways into their account. Better
 * Auth's own list and unlink routes stay closed; these go through its adapter for this person
 * only, so nothing outside Garnet's rules can reach them.
 */
@Controller("v1/me")
export class AccountController {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(SOCIAL) private readonly social: SocialConfig,
  ) {}

  /** A new birthday, still 16 and over (P-79). An existing account is refused, never removed. */
  @Patch("account")
  @HttpCode(204)
  async update(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const { birthDate } = parseBody(updateAccountSchema, body);
    if (!isOldEnough(birthDate, ageCheckToday()))
      throw new ApiProblem("validation_failed", [{ path: ["birthDate"], code: "too_young" }]);
    await asViewer(this.db, viewer, async (trx) => {
      await sql`select set_my_birth_date(${birthDate})`.execute(trx);
    });
  }

  @Get("sign-in-methods")
  async methods(@CurrentViewer() viewer: Viewer): Promise<AccountMethodsDto> {
    const { internalAdapter } = await this.auth.$context;
    const accounts = await internalAdapter.findAccounts(viewer.userId);
    const has = (id: string) => accounts.some((a) => a.providerId === id);
    return {
      password: accounts.some((a) => a.providerId === "credential" && a.password != null),
      google: { available: this.social.google !== undefined, connected: has("google") },
      apple: { available: this.social.apple !== undefined, connected: has("apple") },
    };
  }

  /** Never the last way in, and only soon after signing in (P-80). */
  @Delete("sign-in-methods/:provider")
  @HttpCode(200)
  async disconnect(
    @CurrentViewer() viewer: Viewer,
    @Param("provider") provider: string,
  ): Promise<{ ok: true } | { ok: false; reason: "last-one" }> {
    if (!isProvider(provider)) throw new ApiProblem("not_found");
    const { internalAdapter } = await this.auth.$context;
    const accounts = await internalAdapter.findAccounts(viewer.userId);
    const target = accounts.find((a) => a.providerId === provider);
    if (target === undefined) throw new ApiProblem("not_found");
    const sessions = await internalAdapter.listSessions(viewer.userId);
    const current = sessions.find((s) => s.id === viewer.sessionId);
    if (current === undefined || !isRecentSignIn(new Date(current.createdAt)))
      throw new ApiProblem("recent_sign_in_required");
    if (accounts.length <= 1) return { ok: false, reason: "last-one" };
    await internalAdapter.deleteAccount(target.id);
    return { ok: true };
  }
}

/**
 * Devices (SET-12, ADR-0006): the person's own live sessions. Answers carry a session's id and
 * a plain device name, never its token, address or user agent. Another person's device looks
 * exactly like one that doesn't exist (ADR-0004). What a signed-out device keeps, and linking
 * push to sessions, stay open (U-27).
 */
@Controller("v1/me/devices")
export class DevicesController {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  @Get()
  async list(@CurrentViewer() viewer: Viewer): Promise<{ devices: DeviceDto[] }> {
    const { internalAdapter } = await this.auth.$context;
    const now = new Date();
    const sessions = await internalAdapter.listSessions(viewer.userId);
    const devices = sessions
      .filter((s) => new Date(s.expiresAt) > now)
      .map((s) => ({
        id: s.id,
        name: deviceName(s.userAgent),
        lastActive: new Date(s.updatedAt).toISOString(),
        current: s.id === viewer.sessionId,
      }))
      .sort(
        (a, b) => Number(b.current) - Number(a.current) || b.lastActive.localeCompare(a.lastActive),
      );
    return { devices };
  }

  @Post("sign-out-others")
  @HttpCode(204)
  async signOutOthers(@CurrentViewer() viewer: Viewer): Promise<void> {
    const { internalAdapter } = await this.auth.$context;
    const sessions = await internalAdapter.listSessions(viewer.userId);
    for (const s of sessions)
      if (s.id !== viewer.sessionId) await internalAdapter.deleteSession(s.token);
  }

  @Delete(":id")
  @HttpCode(204)
  async signOut(@CurrentViewer() viewer: Viewer, @Param("id") id: string): Promise<void> {
    const { internalAdapter } = await this.auth.$context;
    const sessions = await internalAdapter.listSessions(viewer.userId);
    const target = sessions.find((s) => s.id === id);
    // This device signs out with sign-out; here it is simply not one of the others.
    if (target === undefined || target.id === viewer.sessionId) throw new ApiProblem("not_found");
    await internalAdapter.deleteSession(target.token);
  }
}
