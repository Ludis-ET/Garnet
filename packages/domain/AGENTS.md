# AGENTS.md — `@garnet/domain`

Stricter rules for this package, in addition to the root [AGENTS.md](../../AGENTS.md).

## Purpose

Pure business rules shared by the API (authoritative), background jobs and the mobile app (preview only): shared day (§8), Shared Spark (§7), signals (§5).

## Hard rules

1. **Pure and deterministic.** No I/O, network, storage, environment variables, timers, randomness or `Temporal.Now`. Pass time and data in as arguments.
2. **Platform-neutral.** Must run on Hermes and Node. No Node built-ins (`node:*`), no DOM, no React Native imports. `tsconfig.json` sets `"types": []` to enforce this; do not add types to it.
3. **Time via Temporal only** (`temporal-polyfill`). No `Date`, no offset arithmetic, no fixed-offset zones.
4. **No defaults for unresolved decisions.** U-02 (cutoff), U-03 (grace cooldown) and U-04 (exhausted grace) are required inputs. Candidate options are exported constants (`GRACE_COOLDOWN_OPTIONS`); none is a default.
5. **No blame data.** Spark APIs take and return only relationship-level facts. A function must never accept or return which partner did or didn't contribute (P-09); `bothPartnersContributed` returns a boolean by design.
6. **Immutable outputs.** Return new objects; freeze exported constants.
7. Every rule cites its source (§n, D-xx, P-xx, U-xx) in a comment.

## Tests

- Every exported function has example tests; time and Spark logic also have **property tests** (`fast-check`).
- Time changes: cover both London transitions, a cutoff inside the gap and inside the overlap, and Addis Ababa display.
- Spark changes: cover both options of every unresolved policy.
- After writing a test that passes first time, break the implementation once to confirm the test can fail.

## Public API

Everything is exported from `src/index.ts`. Changing an export's behaviour is a cross-app change: update the relevant spec in `docs/features/` in the same change.
