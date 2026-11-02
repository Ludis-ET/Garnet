import {
  Inject,
  Injectable,
  SetMetadata,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hashToken, TOKEN_PATTERN } from "@garnet/db";
import type { FastifyRequest } from "fastify";
import { sql, type Kysely } from "kysely";
import { KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by SessionGuard for every non-public route. */
    viewer?: Viewer;
  }
}

const PUBLIC = "garnet:public";
/** Marks a route that needs no session (health only, so far). Everything else is private. */
export const Public = () => SetMetadata(PUBLIC, true);

/** The session's viewer in a route handler. Only reachable on routes the guard protected. */
export const CurrentViewer = createParamDecorator((_: unknown, ctx: ExecutionContext): Viewer => {
  const viewer = ctx.switchToHttp().getRequest<FastifyRequest>().viewer;
  if (viewer === undefined) throw new ApiProblem("unauthorized");
  return viewer;
});

const BEARER = /^Bearer (\S+)$/;

/**
 * Every route needs a live session unless marked @Public() (default deny). The token comes from
 * `Authorization: Bearer …`; only its SHA-256 goes to the database, through auth_session(). A
 * missing, malformed, unknown, revoked or expired token all get the same 401 (ADR-0006).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(KYSELY) private readonly db: Kysely<Database>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic === true) return true;
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const token = BEARER.exec(request.headers.authorization ?? "")?.[1];
    if (token === undefined || !TOKEN_PATTERN.test(token)) throw new ApiProblem("unauthorized");
    const rows = await this.db.transaction().execute(async (trx) => {
      await sql`set local role garnet_app`.execute(trx);
      const result = await sql<{
        session_id: string;
        user_id: string;
      }>`select session_id, user_id from auth_session(${hashToken(token)})`.execute(trx);
      return result.rows;
    });
    const row = rows[0];
    if (row === undefined) throw new ApiProblem("unauthorized");
    request.viewer = { userId: row.user_id, sessionId: row.session_id };
    return true;
  }
}
