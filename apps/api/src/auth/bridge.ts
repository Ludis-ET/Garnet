import {
  isGuessablePassword,
  isOldEnough,
  isValidIsoDate,
  passwordContext,
  PROBLEMS,
  TERMS_VERSION,
  type ProblemCode,
} from "@garnet/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { IncomingHttpHeaders } from "node:http";
import { problemBody, type Issue } from "../errors/problem";
import type { Auth } from "./auth";
import { CLIENT_HEADER } from "./client-header";
import {
  AUTH_BASE,
  CLIENT_IP_HEADER,
  isRecentSignIn,
  PROVIDER_HOSTS,
  type ProviderId,
} from "./constants";
import { Backoff, emailKey, MAIL_BACKOFF, SIGN_IN_BACKOFF } from "./throttle";
import { ageCheckToday } from "./today";

export { AUTH_BASE, CLIENT_IP_HEADER };

/** Headers a caller could set to claim another address; never passed on. */
const SPOOFABLE = [
  "x-forwarded-for",
  "x-real-ip",
  "x-client-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "forwarded",
  CLIENT_IP_HEADER,
];

/** Fastify's (Node's) headers as web Headers, for Better Auth. */
export function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const out = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    for (const v of [value].flat()) out.append(name, v);
  }
  return out;
}

/**
 * A request's headers as Better Auth may see them: no claimed client address, only the one the
 * API saw. Used for every hand-over to Better Auth (its routes and the session check).
 */
export function authHeaders(request: FastifyRequest): Headers {
  const headers = toWebHeaders(request.headers);
  for (const name of SPOOFABLE) headers.delete(name);
  headers.set(CLIENT_IP_HEADER, request.ip);
  return headers;
}

type Method = "GET" | "POST";

/**
 * The Better Auth routes the app uses, and their methods: everything else under /v1/auth is a
 * 404, so a Better Auth update can't quietly expose a new endpoint (P-78). Seeing and signing out
 * devices goes through the API's own /v1/me/devices, which never hands out a session token
 * (P-80). Google and Apple add theirs only when configured (socialRoutes).
 */
export const AUTH_ROUTES: Readonly<Record<string, readonly Method[]>> = {
  "/ok": ["GET"],
  "/get-session": ["GET"],
  "/sign-up/email": ["POST"],
  "/sign-in/email": ["POST"],
  "/sign-out": ["POST"],
  "/verify-email": ["GET"],
  "/send-verification-email": ["POST"],
  "/request-password-reset": ["POST"],
  "/reset-password": ["POST"],
  "/change-password": ["POST"],
  "/change-email": ["POST"],
};

/**
 * Google's and Apple's routes (P-79): starting a sign-in, the provider's return, the proxy that
 * opens the provider's page in the phone's browser, and the hand-off back to the app. Apple
 * answers with a form post from its own site, so its return also takes POST.
 */
export function socialRoutes(providers: readonly ProviderId[]): Record<string, readonly Method[]> {
  if (providers.length === 0) return {};
  return {
    "/sign-in/social": ["POST"],
    "/link-social": ["POST"],
    "/expo-authorization-proxy": ["GET"],
    "/app-handoff/start": ["GET"],
    "/app-handoff/linked": ["GET"],
    "/app-handoff/failed": ["GET"],
    "/app-handoff/redeem": ["POST"],
    ...Object.fromEntries(
      providers.map((id) => [`/callback/${id}`, id === "apple" ? ["GET", "POST"] : ["GET"]]),
    ),
  };
}

/** Routes that send an email, and the body field naming the address (limited per address). */
const MAIL_ROUTES: Readonly<Record<string, string>> = {
  "/sign-up/email": "email",
  "/send-verification-email": "email",
  "/request-password-reset": "email",
  "/change-email": "newEmail",
};

/** Routes that change how someone gets in: they need a recent sign-in (P-80). */
const RECENT_SIGN_IN_ROUTES = new Set(["/link-social", "/change-email"]);

/** All a Google or Apple request may carry: nothing else reaches Better Auth (P-79). */
const SOCIAL_FIELDS = new Set([
  "provider",
  "callbackURL",
  "errorCallbackURL",
  "disableRedirect",
  "idToken",
]);

/** Where each route carries a new password, checked against the blocklist (P-78). */
const NEW_PASSWORD_FIELD: Readonly<Record<string, string>> = {
  "/sign-up/email": "password",
  "/reset-password": "newPassword",
  "/change-password": "newPassword",
};

/**
 * Answers that carry the raw session token in their body. The app never needs it (its session
 * is the signed cookie), so it is taken out before the answer leaves the API.
 */
const TOKEN_BEARING = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/sign-in/social",
  "/get-session",
  "/verify-email",
  "/change-password",
  "/app-handoff/redeem",
]);

type Body = Record<string, unknown>;
const text = (body: Body, field: string) => (typeof body[field] === "string" ? body[field] : "");

function problem(
  reply: FastifyReply,
  request: FastifyRequest,
  code: ProblemCode,
  issues?: Issue[],
) {
  return reply
    .status(PROBLEMS[code].status)
    .type("application/problem+json")
    .send(problemBody(code, request.id, issues));
}

/** Email sign-ups give a birthday (16 and over) and accept the current terms (P-79). */
function registrationIssues(body: Body): Issue[] {
  const issues: Issue[] = [];
  const birthDate = text(body, "birthDate");
  if (!isValidIsoDate(birthDate)) issues.push({ path: ["birthDate"], code: "invalid_date" });
  else if (!isOldEnough(birthDate, ageCheckToday()))
    issues.push({ path: ["birthDate"], code: "too_young" });
  if (body["termsVersion"] !== TERMS_VERSION)
    issues.push({ path: ["termsVersion"], code: "terms" });
  return issues;
}

/**
 * The proxy opens a provider's sign-in page in the phone's browser. Left open it would send the
 * browser anywhere (an open redirect), so it may only go to a configured provider's own host.
 */
function proxyAllowed(params: URLSearchParams, providers: readonly ProviderId[]): boolean {
  if ([...params.keys()].some((k) => k !== "authorizationURL")) return false;
  const target = params.get("authorizationURL") ?? "";
  try {
    const url = new URL(target);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      providers.some((id) => PROVIDER_HOSTS[id] === url.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * A Google or Apple sign-in may only come back through the hand-off (./handoff.ts): never to a
 * garnet:// link, where Better Auth's Expo plugin would put the session cookie itself. An ID
 * token from the phone's own Apple sign-in needs no way back at all.
 */
function socialAllowed(body: Body, providers: readonly ProviderId[], handoff: string): boolean {
  if (!providers.some((id) => id === body["provider"])) return false;
  if (Object.keys(body).some((k) => !SOCIAL_FIELDS.has(k))) return false;
  const error = body["errorCallbackURL"];
  if (error !== undefined && error !== `${handoff}/failed`) return false;
  const callback = body["callbackURL"];
  if (body["idToken"] !== undefined) return callback === undefined;
  return (
    typeof callback === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(callback.slice(`${handoff}/start?challenge=`.length)) &&
    callback.startsWith(`${handoff}/start?challenge=`)
  );
}

/** Connecting a provider to a signed-in account returns to the app with no session to hand on. */
function linkAllowed(body: Body, providers: readonly ProviderId[], handoff: string): boolean {
  if (!providers.some((id) => id === body["provider"])) return false;
  if (Object.keys(body).some((k) => !SOCIAL_FIELDS.has(k))) return false;
  const error = body["errorCallbackURL"];
  if (error !== undefined && error !== `${handoff}/failed`) return false;
  if (body["idToken"] !== undefined) return body["callbackURL"] === undefined;
  return body["callbackURL"] === `${handoff}/linked`;
}

/** Takes the raw session token out of a JSON answer (see TOKEN_BEARING). */
function withoutToken(json: string): string {
  try {
    const data = JSON.parse(json) as unknown;
    if (typeof data !== "object" || data === null) return json;
    const copy = { ...(data as Body) };
    delete copy["token"];
    const session = copy["session"];
    if (typeof session === "object" && session !== null) {
      const s = { ...(session as Body) };
      delete s["token"];
      copy["session"] = s;
    }
    return JSON.stringify(copy);
  } catch {
    return json;
  }
}

/**
 * Better Auth's routes, under /v1/auth (sign-up, sign-in, verify, reset, sessions, sign-out, and
 * Google and Apple when configured). Each request is handed over as a web Request and the answer
 * copied back, every Set-Cookie header kept separate. They are public by nature (signing in
 * needs no session), rate limited by Better Auth per address, and logged like every request:
 * route pattern, status and latency.
 *
 * On the way in (P-78, P-79): only allow-listed routes pass; writes need the app's header (CSRF,
 * as on every route) except Apple's own form post; new passwords are checked against the
 * blocklist; email sign-ups carry an old-enough birthday and the current terms; a password change
 * always ends every other session; Google and Apple sign-ins can only return through the
 * hand-off; and per account, wrong passwords and emails sent back off exponentially, with the
 * same answer whether or not the address has an account. On the way out, no raw session token.
 */
export function registerAuthRoutes(fastify: FastifyInstance, auth: Auth): void {
  const signIns = new Backoff(SIGN_IN_BACKOFF);
  const mails = new Backoff(MAIL_BACKOFF);
  const providers = (Object.keys(PROVIDER_HOSTS) as ProviderId[]).filter(
    (id) => auth.options.socialProviders[id] !== undefined,
  );
  const routes: Readonly<Record<string, readonly Method[]>> = {
    ...AUTH_ROUTES,
    ...socialRoutes(providers),
  };
  const handoff = `${auth.options.baseURL}${AUTH_BASE}/app-handoff`;

  fastify.route({
    method: ["GET", "POST"],
    url: "/v1/auth/*",
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
      const path = url.pathname.slice(AUTH_BASE.length);
      const method = request.method === "POST" ? "POST" : "GET";
      if (routes[path]?.includes(method) !== true) return problem(reply, request, "not_found");
      const appleFormPost = path === "/callback/apple" && method === "POST";
      let parsed: Body = {};
      let raw: string | undefined;
      if (appleFormPost) {
        // Nest's form parser has read it; it goes on to Better Auth as the same form.
        const form = request.body;
        if (typeof form !== "object" || form === null || Array.isArray(form))
          return problem(reply, request, "bad_request");
        raw = new URLSearchParams(
          Object.entries(form as Body).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
        ).toString();
      } else if (method === "POST") {
        if (request.headers[CLIENT_HEADER.name] !== CLIENT_HEADER.value)
          return problem(reply, request, "bad_request");
        if (
          typeof request.body !== "object" ||
          request.body === null ||
          Array.isArray(request.body)
        )
          return problem(reply, request, "bad_request");
        parsed = { ...(request.body as Body) };
      }

      if (path === "/expo-authorization-proxy" && !proxyAllowed(url.searchParams, providers))
        return problem(reply, request, "bad_request");
      if (path === "/sign-in/social" && !socialAllowed(parsed, providers, handoff))
        return problem(reply, request, "bad_request");
      if (path === "/link-social" && !linkAllowed(parsed, providers, handoff))
        return problem(reply, request, "bad_request");
      if (RECENT_SIGN_IN_ROUTES.has(path)) {
        const found = await auth.api
          .getSession({ headers: authHeaders(request) })
          .catch(() => null);
        if (found === null) return problem(reply, request, "unauthorized");
        if (!isRecentSignIn(new Date(found.session.createdAt)))
          return problem(reply, request, "recent_sign_in_required");
      }
      if (path === "/sign-up/email") {
        const issues = registrationIssues(parsed);
        if (issues.length > 0) return problem(reply, request, "validation_failed", issues);
      }

      const field = NEW_PASSWORD_FIELD[path];
      if (field !== undefined) {
        const context =
          path === "/sign-up/email"
            ? passwordContext(text(parsed, "name"), text(parsed, "email"))
            : [];
        if (isGuessablePassword(text(parsed, field), context))
          return problem(reply, request, "validation_failed", [
            { path: [field], code: "guessable" },
          ]);
      }
      // Changing the password ends every other session, whatever the request asked (ADR-0006).
      if (path === "/change-password") parsed["revokeOtherSessions"] = true;

      const mailField = MAIL_ROUTES[path];
      const key = emailKey(text(parsed, mailField ?? "email"));
      const limiter = path === "/sign-in/email" ? signIns : mailField === undefined ? null : mails;
      const wait = limiter === null ? 0 : limiter.waitMs(key);
      if (wait > 0) {
        void reply.header("retry-after", String(Math.ceil(wait / 1000)));
        return problem(reply, request, "rate_limited");
      }

      const body = method === "GET" ? undefined : (raw ?? JSON.stringify(parsed));
      // Rate limits key on the address: only the one the API saw counts, never a claimed one.
      const headers = authHeaders(request);
      // The body was parsed and is re-serialised here, so its original length no longer applies.
      headers.delete("content-length");
      headers.delete("transfer-encoding");
      const response = await auth.handler(
        new Request(url, {
          method,
          headers,
          ...(body === undefined ? {} : { body }),
        }),
      );
      // A wrong password counts against the email; a right one (verified or not) clears it. Every
      // accepted request to an email route counts, so nobody can flood an inbox.
      if (path === "/sign-in/email") {
        if (response.status === 401) signIns.record(key);
        else if (response.status < 400 || response.status === 403) signIns.clear(key);
      } else if (mailField !== undefined && response.status < 400) mails.record(key);

      void reply.status(response.status);
      for (const [name, value] of response.headers) {
        const lower = name.toLowerCase();
        if (lower !== "set-cookie" && lower !== "content-length") void reply.header(name, value);
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) void reply.header("set-cookie", cookies);
      if (response.body === null) return reply.send(null);
      const answer = await response.text();
      const json = response.headers.get("content-type")?.includes("application/json") === true;
      return reply.send(TOKEN_BEARING.has(path) && json ? withoutToken(answer) : answer);
    },
  });
}
