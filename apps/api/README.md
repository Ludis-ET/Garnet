# Garnet API

NestJS 12 on Fastify, PostgreSQL through Kysely ([backend plan](../../docs/architecture/backend-plan.md), P-76). Local only until U-07. To run it, see [infra/README.md](../../infra/README.md).

## Accounts (B1, P-77)

Better Auth owns sign-up, verification, sign-in, password reset and sessions under `/v1/auth`
(`src/auth`). Those routes speak Better Auth's protocol, not RFC 9457; everything else checks the
session with `SessionGuard` (Better Auth's `getSession`) and runs under RLS. Its tables are only
reachable as `garnet_auth`. Policy values (password length, session lifetime, rate limits, link and
invitation lifetimes) come from the environment with no defaults (ADR-0006 is Proposed).

Hardening (P-78), covered by `test/auth.test.ts` and proven by mutants (`pnpm mutation --only api`):

- **Passwords**: Argon2id (`src/auth/password.ts`), 15 characters or more, and never on the shared
  blocklist (repeats, runs, common words, the person's own name or email; `@garnet/contracts`).
- **Only the routes the app uses**: `AUTH_ROUTES` in `src/auth/bridge.ts`; everything else under
  `/v1/auth` is a 404, so a Better Auth update can't expose a new endpoint by itself.
- **Limits**: per address, the policy's limit on every password and email-link route
  (`CREDENTIAL_PATHS`), 100 a minute on the rest, none on `get-session`; per account, wrong
  passwords and emails back off exponentially (`src/auth/throttle.ts`), never a lockout. Pairing
  tries have their own per-person limit (`AttemptLimiter`).
- **The client address can't be claimed.** Better Auth reads only `x-garnet-client-ip`, which the
  bridge sets from the socket; `X-Forwarded-For` and similar are stripped too. Behind a proxy
  (U-07) this changes, deliberately.
- **No cross-site requests.** Every write, Better Auth's included, needs the
  `x-garnet-client: app` header, which an HTML form or a simple cross-site request can't send; no
  CORS headers are sent at all, and Better Auth trusts only the `garnet://` origin.
- **Sessions**: HttpOnly, SameSite=Lax cookies (Secure over https), HMAC-signed with the secret,
  which is never in the database. They slide while in use but end `GARNET_SESSION_MAX_DAYS` after
  sign-in; a password reset or change ends every other session.
- **Neutral answers**: a wrong password and an unknown email, sign-up with a taken email, and a
  reset request for any address answer the same way. Email links are single use and stored hashed.
- **No telemetry**: Better Auth's is off, and the API won't start if `BETTER_AUTH_TELEMETRY` is set.

Google and Apple (P-79), covered by `test/social.test.ts` and `test/registration.test.ts`:

- **Off until configured** (`GARNET_GOOGLE_*`, `GARNET_APPLE_*`); their routes join the bridge
  allow-list only then, and `GET /v1/sign-in-methods` tells the app which to show.
- **One account per person:** a provider that vouches for the email joins the account that has
  it. Before a verified provider joins an account whose email was never confirmed, everything
  unproven on it (password, links, sessions, registration details) is removed.
- **The hand-off** (`src/auth/handoff.ts`): the browser's session becomes a one-minute,
  single-use code bound to the app's SHA-256 challenge; only the app, which holds the verifier,
  can redeem it. A sign-in can't return to a `garnet://` link, the provider proxy goes only to
  Google's and Apple's own hosts, and Apple's form post is the one write without the app header.
- **Registration:** an email sign-up carries an old-enough birthday and the current
  `TERMS_VERSION`; other accounts can reach only `/v1/me` and `/v1/me/registration` until they
  give them (`registration_required`). A new account under 16 is removed.
- **No raw session token** in any response body; provider tokens are stored encrypted.

Settings and the account (B2, P-80), covered by `test/settings.test.ts` and `test/account.test.ts`:

- **Settings** are one private document per person. `PATCH /v1/me/settings` merges only what it
  names, under a row lock (`forUpdate`): keep it, or concurrent saves silently lose changes. The
  tests run on one PGlite connection and can't see this; check it on real Postgres.
- **Devices** go through `/v1/me/devices`, never Better Auth's session routes, which hand out
  tokens. Answers carry an id and a plain name (`src/account/device-name.ts`).
- **A recent sign-in** (24 hours) is needed to connect or disconnect a provider or change the
  email; the last way in can't be removed.

## Rules for every change

- **Identity comes from the session.** Read the viewer with `@CurrentViewer()`; never take a user or relationship id from the request (ADR-0004).
- **Data goes through `asViewer`.** It opens the transaction as `garnet_app` with the viewer bound, so row-level security applies on top of the code's own checks.
- **Every route is private** unless marked `@Public()`, and every new route gets an entry in `test/probes.test.ts` (stranger and partner). The probe test fails until it has one.
- **Errors are problems.** Throw `ApiProblem(code)` for known outcomes; anything else becomes a bare 500. Never put request content or an error's message in a response or a log line.
- **Logs are allow-listed** (route pattern, method, status, latency, request id, error type and SQLSTATE). Don't log anything else.
- **Dependencies are named**: `@Inject(Token)` on every constructor parameter (no emitted decorator metadata).
- **Contracts first**: shapes live in `@garnet/contracts`, and responses are checked against them in tests.
- **Schema changes are new migrations** in `packages/db/migrations` (`NNNN_name.sql`); applied ones never change.

## Commands

```sh
pnpm --filter @garnet/api test        # on PGlite, no Docker needed (~90 tests)
pnpm --filter @garnet/api dev         # needs GARNET_API_DATABASE_URL (infra/README.md)
pnpm mutation --only api              # guards proven to fail when broken
```
