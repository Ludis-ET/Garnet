import {
  Inject,
  Injectable,
  SetMetadata,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { isRegistrationComplete } from "@garnet/contracts";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import type { AuthPolicy } from "../config";
import { AUTH, POLICY, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { sessionDeadline, type Auth } from "./auth";
import { authHeaders } from "./bridge";
import { CLIENT_HEADER } from "./client-header";

export { CLIENT_HEADER };

declare module "fastify" {
  interface FastifyRequest {
    /** Set by SessionGuard for every non-public route. */
    viewer?: Viewer;
  }
}

const PUBLIC = "garnet:public";
const BEFORE_REGISTRATION = "garnet:before-registration";

const SAFE_METHODS = new Set(["GET", "HEAD"]);
/** Marks a route that needs no session (health only, so far). Everything else is private. */
export const Public = () => SetMetadata(PUBLIC, true);
/**
 * Marks a route a signed-in person may use before registration is complete (P-79): finishing
 * registration itself, and /v1/me. Every other route answers registration_required until then.
 */
export const BeforeRegistration = () => SetMetadata(BEFORE_REGISTRATION, true);

/** The session's viewer in a route handler. Only reachable on routes the guard protected. */
export const CurrentViewer = createParamDecorator((_: unknown, ctx: ExecutionContext): Viewer => {
  const viewer = ctx.switchToHttp().getRequest<FastifyRequest>().viewer;
  if (viewer === undefined) throw new ApiProblem("unauthorized");
  return viewer;
});

/**
 * Every route needs a live, verified session unless marked @Public() (default deny). Better Auth
 * reads the session cookie the app's Expo client sends and checks it against the session table;
 * a missing, forged, expired or revoked session, one older than sessionMaxDays (P-78), or an
 * unverified email, all get the same 401 (ADR-0006). The user is never taken from anything else in the request (ADR-0004). Requests
 * that change something must also carry CLIENT_HEADER (CSRF).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(POLICY) private readonly policy: AuthPolicy,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic === true) return true;
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (
      !SAFE_METHODS.has(request.method) &&
      request.headers[CLIENT_HEADER.name] !== CLIENT_HEADER.value
    )
      throw new ApiProblem("bad_request");
    const found = await this.auth.api
      .getSession({ headers: authHeaders(request) })
      .catch(() => null);
    if (!found?.user.emailVerified) throw new ApiProblem("unauthorized");
    // Better Auth never extends a session past this (auth.ts); checked here too, in depth.
    if (
      sessionDeadline(new Date(found.session.createdAt), this.policy.sessionMaxDays) <= new Date()
    )
      throw new ApiProblem("unauthorized");
    // A birthday and the current terms before anything else (P-79).
    const early = this.reflector.getAllAndOverride<boolean | undefined>(BEFORE_REGISTRATION, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (early !== true && !isRegistrationComplete(found.user.birthDate, found.user.termsVersion))
      throw new ApiProblem("registration_required");
    request.viewer = {
      userId: found.user.id,
      sessionId: found.session.id,
      name: found.user.name,
    };
    return true;
  }
}
