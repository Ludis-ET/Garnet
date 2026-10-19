# ADR-0001: TypeScript monorepo with a shared, platform-neutral domain package

- **Status:** **Planning baseline** (owner direction, 2026-10-18): the working direction for Phase 2 planning. **Not Accepted**; implementation not verified (see Consequences for the evidence level).
- **Date:** 2026-10-18
- **Decision IDs:** D-09, P-01

## Context

D-09 proposes React Native + Expo (TypeScript) for the app and NestJS (TypeScript) for the API. Several rules must behave identically on both sides: shared-day assignment (§8, the server is authoritative but the app previews "today ends at 07:00"), Spark derivation (§7), the signal catalog (§5). Two implementations would drift, and timezone/DST bugs are a named risk (§14).

## Decision

- One repository managed by **pnpm workspaces**: `apps/*` (Phase 2: `mobile`, `api`), `packages/*` (shared libraries), `spikes/*` (Phase 1 evidence, never imported by apps).
- **`@garnet/domain`** holds pure business rules only: no I/O, no Node or DOM globals (`"types": []`), deterministic, so it runs in Hermes and Node alike.
- Strict TypeScript everywhere (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint `strictTypeChecked`, Prettier, Vitest; one `pnpm check` gate locally and in CI.
- Shared tool versions via the pnpm **catalog**; `minimumReleaseAge` of 7 days and blocked dependency install scripts for supply-chain hygiene.

## Options considered

| Option                            | Pros                                                         | Cons                                                      |
| --------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Monorepo + shared domain (chosen) | One source of truth for rules; atomic changes across app/API | Workspace tooling; Metro needs monorepo config in Phase 2 |
| Separate repos                    | Independent deploys                                          | Duplicated rules; version skew between app and API        |
| Server-only rules                 | Simplest authority model                                     | No offline preview of shared day/Spark; worse UX offline  |

## Consequences

- Phase 2 must configure Metro for workspace packages (Expo supports monorepos) and decide how NestJS consumes TS sources (build step or `tsx`).
- TypeScript is pinned to 6.0.x because `typescript-eslint` does not yet support 7.x (checked 2026-10-18). Revisit when it does.
- Spikes are evidence, not libraries: anything promoted from a spike is rewritten into `packages/` with its tests.
