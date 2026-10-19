# ADR-0004: Authorization — relationship-scoped checks in the API, row-level security beneath

- **Status:** **Planning baseline** (owner direction, 2026-10-18): the working direction for Phase 2 planning. **Not Accepted**; implementation not verified (see Consequences for the evidence level).
- **Date:** 2026-10-18
- **Decision IDs:** §12, D-11, P-06, P-19

## Context

§12: "Server-side relationship authorization on every request; test IDOR/BOLA and cross-relationship access." The most damaging failure Garnet can have is one partner seeing the other's private draft, or anyone seeing either partner's content.

## Decision

Two independent layers. Either alone should be sufficient; both are required.

1. **API (primary).** NestJS guards resolve `(userId, relationshipId)` from the session — never from the request body or path. Every resource lookup is scoped by relationship (`where relationship_id = :mine`), and resource ids from clients are treated as untrusted. Policy rules live in one place (see [authorization.md](../../architecture/authorization.md)).
2. **Database (defence in depth).** Each request runs in a transaction as the unprivileged `garnet_app` role with `app.user_id` set via `set_config(..., true)`. Postgres RLS policies enforce membership, private-draft visibility and author-only writes. Credentials, sessions and invitations are not readable by `garnet_app` at all.

Errors never distinguish "doesn't exist" from "not yours" (`not-found` for both).

## Options considered

| Option          | Pros                              | Cons                                                            |
| --------------- | --------------------------------- | --------------------------------------------------------------- |
| API checks only | Simple                            | One forgotten check leaks data                                  |
| RLS only        | Hard to bypass                    | Business errors become opaque; hard to express all rules        |
| Both (chosen)   | Layered; RLS catches API mistakes | Must pass user context per transaction; connection pooling care |

## Consequences

- Evidence: [F-05](../../feasibility/F-05-data-model.md). 25 tests on real Postgres (PGlite), including IDOR probes, cross-relationship writes and credential isolation. Reproducible mutation checks (`pnpm mutation --with-docker --runs 3`, run 2026-10-19) show each tested policy is load-bearing. This is database-level evidence only; API-level authorization is untested. Known gap: RLS does not hide a sealed Open When letter's body from its recipient before opening (F-05).
- Use transaction-scoped settings only (`set local`, `set_config(..., true)`), so a pooled connection never carries another user's context.
- Phase 2 adds an API-level authorization test suite with a cross-relationship probe for **every** endpoint. Being in the planning baseline does not mean API authorization or Open When body enforcement is verified.
