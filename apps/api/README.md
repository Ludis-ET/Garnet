# Garnet API

NestJS 12 on Fastify, PostgreSQL through Kysely ([backend plan](../../docs/architecture/backend-plan.md), P-76). Local only until U-07. To run it, see [infra/README.md](../../infra/README.md).

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
pnpm --filter @garnet/api test        # on PGlite, no Docker needed
pnpm --filter @garnet/api dev         # needs GARNET_API_DATABASE_URL (infra/README.md)
pnpm mutation --only api              # guards proven to fail when broken
```
