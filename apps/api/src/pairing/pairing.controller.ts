import { Body, Controller, Delete, Get, HttpCode, Inject, Post } from "@nestjs/common";
import { hashToken } from "@garnet/db";
import {
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteCodeBodySchema,
  type PairingStatusDto,
} from "@garnet/contracts";
import { randomInt } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { CurrentViewer } from "../auth/session.guard";
import type { AuthPolicy } from "../config";
import { asViewer, KYSELY, POLICY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { AttemptLimiter } from "../http/attempts";
import { parseBody } from "../http/body";
import { ensureProfile, readProfile } from "../setup/profiles";

/** Guesses at codes per person: 10 every 10 minutes (P-18 leaves the exact limit open). */
const CODE_ATTEMPTS = { max: 10, windowMs: 10 * 60 * 1000 };

/** A code from the CSPRNG, in the no-look-alike alphabet (P-50). */
function newInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++)
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)] ?? "A";
  return code;
}

/** True when a database error is the one indistinguishable "not valid" answer. */
function isInvalidInvitation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "GN403";
}

/**
 * Pairing (PAIR-01 to PAIR-07, P-18): invitations are single-use, expire (at most 24 hours,
 * enforced by the database), are stored only as hashes, and every unusable code gets the same
 * answer. The code is returned once, when created. All of it runs through the database's
 * pairing functions, which take the person from the session context, never from the request.
 */
@Controller()
export class PairingController {
  readonly #attempts = new AttemptLimiter(CODE_ATTEMPTS.max, CODE_ATTEMPTS.windowMs);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(POLICY) private readonly policy: AuthPolicy,
  ) {}

  @Get("v1/pairing")
  async status(@CurrentViewer() viewer: Viewer): Promise<PairingStatusDto> {
    return asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const me = (await readProfile(trx, viewer)).display_name;
      const row = (
        await sql<{
          partner_name: string | null;
          invite_expires_at: Date | null;
          invite_expired: boolean | null;
        }>`select partner_name, invite_expires_at, invite_expires_at <= now() as invite_expired
           from pairing_status()`.execute(trx)
      ).rows[0];
      const partnerName = row?.partner_name ?? null;
      return {
        me,
        partnerName,
        invite:
          partnerName !== null || row?.invite_expires_at == null
            ? null
            : {
                expiresAt: row.invite_expires_at.toISOString(),
                expired: row.invite_expired === true,
              },
      };
    });
  }

  @Post("v1/invitations")
  @HttpCode(200)
  async create(@CurrentViewer() viewer: Viewer): Promise<{ code: string; expiresAt: string }> {
    const code = newInviteCode();
    const expiresAt = await asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const r = await sql<{
        expires_at: Date;
      }>`select create_invitation(${hashToken(code)}, ${this.policy.inviteTtlHours}) as expires_at`.execute(
        trx,
      );
      return r.rows[0]?.expires_at;
    }).catch((error: unknown) => {
      // Already paired: nothing to invite into.
      if (typeof error === "object" && error !== null && "code" in error && error.code === "GN409")
        throw new ApiProblem("bad_request");
      throw error;
    });
    if (expiresAt === undefined) throw new ApiProblem("bad_request");
    return { code, expiresAt: expiresAt.toISOString() };
  }

  @Delete("v1/invitations")
  @HttpCode(204)
  async revoke(@CurrentViewer() viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await sql`select revoke_my_invitations()`.execute(trx);
    });
  }

  @Post("v1/invitations/check")
  @HttpCode(200)
  async check(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<{ ok: true; inviterName: string } | { ok: false }> {
    const { code } = parseBody(inviteCodeBodySchema, body);
    if (!this.#attempts.take(viewer.userId)) throw new ApiProblem("rate_limited");
    const name = await asViewer(this.db, viewer, async (trx) => {
      const r = await sql<{
        name: string | null;
      }>`select check_invitation(${hashToken(code)}) as name`.execute(trx);
      return r.rows[0]?.name ?? null;
    });
    return name === null ? { ok: false } : { ok: true, inviterName: name };
  }

  @Post("v1/invitations/accept")
  @HttpCode(200)
  async accept(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<{ ok: true; partnerName: string } | { ok: false }> {
    const { code } = parseBody(inviteCodeBodySchema, body);
    if (!this.#attempts.take(viewer.userId)) throw new ApiProblem("rate_limited");
    try {
      const partnerName = await asViewer(this.db, viewer, async (trx) => {
        await ensureProfile(trx, viewer);
        const r = await sql<{
          name: string | null;
        }>`select join_with_invitation(${hashToken(code)}) as name`.execute(trx);
        return r.rows[0]?.name ?? "";
      });
      return { ok: true, partnerName };
    } catch (error) {
      if (isInvalidInvitation(error)) return { ok: false };
      throw error;
    }
  }
}
