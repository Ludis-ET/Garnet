import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, getSessionFromCtx } from "better-auth/api";
import { deleteSessionCookie, setSessionCookie } from "better-auth/cookies";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Hands a Google or Apple sign-in from the browser back to the app (P-79), bound to the app
 * that started it, like PKCE (RFC 7636, RFC 8252).
 *
 * The provider's sign-in runs in the phone's browser and ends there with a session. Better
 * Auth's Expo plugin would then put the session cookie itself in a garnet:// link, which any
 * other app that claims the same scheme could catch. Instead:
 *
 * 1. the app makes a secret `verifier` and sends only its SHA-256 (`challenge`) when it starts;
 * 2. the browser comes back to /app-handoff/start, which swaps the browser's session for a
 *    single-use code that lasts a minute, clears the browser's cookie, and opens
 *    garnet://auth-callback?code=…;
 * 3. the app sends the code with its verifier to /app-handoff/redeem and receives the session
 *    cookie in the response, as for any sign-in.
 *
 * A caught link is useless without the verifier, which never leaves the app.
 */
export const APP_CALLBACK = "garnet://auth-callback";
/** How long a hand-off code lives. */
export const HANDOFF_TTL_MS = 60_000;
const B64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/;

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest();
const identifier = (code: string) => `app-handoff:${sha256(code).toString("base64url")}`;

const storedSchema = z.object({ token: z.string().min(1), challenge: z.string() });

/**
 * Where a hand-off may land (production-fix-plan S14). The web build is local development only
 * (P-79; CORS allows only localhost), so `redirect_to` may name nothing but
 * http://localhost:<port>/auth-callback or the 127.0.0.1 equivalent; anything else goes to the
 * app. Without this, a crafted link could turn a browser session into a code delivered to
 * another site, where the attacker's own verifier would redeem it.
 */
export function handoffTarget(redirectTo: string | undefined): string {
  if (redirectTo === undefined) return APP_CALLBACK;
  let url: URL;
  try {
    url = new URL(redirectTo);
  } catch {
    return APP_CALLBACK;
  }
  const local =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
    url.username === "" &&
    url.password === "" &&
    url.pathname === "/auth-callback" &&
    url.search === "" &&
    url.hash === "";
  return local ? `${url.origin}/auth-callback` : APP_CALLBACK;
}

export const appHandoff = () =>
  ({
    id: "garnet-app-handoff",
    endpoints: {
      appHandoffStart: createAuthEndpoint(
        "/app-handoff/start",
        {
          method: "GET",
          query: z.object({
            challenge: z.string().regex(B64URL_32_BYTES),
            redirect_to: z.string().optional(),
          }),
        },
        async (ctx) => {
          const found = await getSessionFromCtx(ctx);
          const target = handoffTarget(ctx.query.redirect_to);
          if (found === null) throw ctx.redirect(`${target}?error=failed`);
          const code = randomBytes(32).toString("base64url");
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: identifier(code),
            value: JSON.stringify({ token: found.session.token, challenge: ctx.query.challenge }),
            expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
          });
          // The browser keeps nothing: the session belongs to the app from here on.
          deleteSessionCookie(ctx);
          throw ctx.redirect(`${target}?code=${code}`);
        },
      ),

      /** Where connecting Google or Apple to a signed-in account lands: no session changes. */
      appHandoffLinked: createAuthEndpoint("/app-handoff/linked", { method: "GET" }, (ctx) => {
        throw ctx.redirect(`${APP_CALLBACK}?linked=1`);
      }),

      /** Where a failed or cancelled provider sign-in lands: a reason, never the details. */
      appHandoffFailed: createAuthEndpoint(
        "/app-handoff/failed",
        {
          method: "GET",
          query: z.object({
            error: z.string().max(200).optional(),
            redirect_to: z.string().optional(),
          }),
        },
        (ctx) => {
          const reason =
            ctx.query.error === "access_denied"
              ? "cancelled"
              : ctx.query.error === "account_already_linked_to_different_user"
                ? "taken"
                : "failed";
          const target = handoffTarget(ctx.query.redirect_to);
          throw ctx.redirect(`${target}?error=${reason}`);
        },
      ),

      appHandoffRedeem: createAuthEndpoint(
        "/app-handoff/redeem",
        {
          method: "POST",
          body: z
            .object({
              code: z.string().regex(B64URL_32_BYTES),
              verifier: z.string().regex(B64URL_32_BYTES),
            })
            .strict(),
        },
        async (ctx) => {
          const refuse = () =>
            APIError.from("BAD_REQUEST", { code: "INVALID_HANDOFF", message: "Invalid code" });
          // Taken and deleted in one step: a code works once, even if two tries race.
          const row = await ctx.context.internalAdapter.consumeVerificationValue(
            identifier(ctx.body.code),
          );
          if (row === null || row.expiresAt < new Date()) throw refuse();
          const stored = storedSchema.safeParse(JSON.parse(row.value));
          if (!stored.success) throw refuse();
          const expected = Buffer.from(stored.data.challenge, "base64url");
          const actual = sha256(ctx.body.verifier);
          if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
            throw refuse();
          const found = await ctx.context.internalAdapter.findSession(stored.data.token);
          if (found === null || found.session.expiresAt < new Date()) throw refuse();
          await setSessionCookie(ctx, found);
          return ctx.json({ ok: true });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
