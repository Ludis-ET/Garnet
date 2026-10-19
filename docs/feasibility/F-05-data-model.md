# F-05 — Draft data model, row-level security and deletion

**Result: ✅ Proven at the database level only** (no API or app layer), on real PostgreSQL via **PGlite** (Postgres compiled to WebAssembly, so no Docker or server is needed). Schema: [`spikes/data-model/schema.sql`](../../spikes/data-model/schema.sql). Tests: [`schema.test.ts`](../../spikes/data-model/src/schema.test.ts) — 25, including one **characterization test** that pins the known Open When gap. Reproduce: `pnpm --filter @garnet/spike-data-model test` (part of `pnpm check`).

## Question

Can the privacy and deletion rules be enforced by the database itself, as defence in depth behind the API?

## Verified

| Area          | Behaviour                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pairing       | Third partner rejected; one active relationship per user                                                                                                                         |
| Invitations   | Single-use; expiry; self-acceptance blocked; one generic error; ≤ 24 h enforced                                                                                                  |
| RLS — drafts  | A private draft is invisible to the partner and to other couples                                                                                                                 |
| RLS — IDOR    | Another couple cannot read a shared entry even by exact id                                                                                                                       |
| RLS — writes  | Cannot write as someone else or into another relationship; author must be a member (even for privileged writers)                                                                 |
| Edit / delete | Only the author edits; either partner deletes shared; only the author deletes private                                                                                            |
| Secrets       | The app role cannot read users, sessions, invitations or idempotency records                                                                                                     |
| Tombstones    | Delete writes a tombstone; re-inserting the id fails (`GN410`), even for privileged writers                                                                                      |
| Media         | Cascade on entry delete enqueues storage purges (actual object deletion not tested); no cross-relationship media; only the author attaches                                       |
| Recap         | Revealed entries are read-only but deletable; shared → private forbidden; versions bump on update                                                                                |
| Change feed   | Private draft creation and deletion never appear in the partner's feed; sharing makes it appear                                                                                  |
| Spark         | `shared_day` has no per-partner columns (introspection test); non-members can't read it                                                                                          |
| Letters       | The recipient can't see a draft letter; sees it once sealed. **Gap:** once sealed, the recipient can read the full row, **including the body**, before opening it (see Findings) |
| Preferences   | Generic previews and quiet hours default on; private to each user                                                                                                                |

**Mutation check (reproducible, `pnpm mutation --with-docker --runs 3`, run 2026-10-19):** each schema protection was removed in a scratch copy, and the suite failed every time:

| Mutant | Protection removed                             | Outcome |
| ------ | ---------------------------------------------- | ------- |
| F05-1  | RLS on entries                                 | killed  |
| F05-2  | Private drafts hidden from the partner         | killed  |
| F05-3  | Resurrection guard (deleted ids re-insertable) | killed  |
| F05-4  | Private change-feed audience                   | killed  |
| F05-5  | Exactly two partners                           | killed  |
| F05-6  | Single-use, expiring invitations               | killed  |
| F05-7  | Media purge enqueued on delete                 | killed  |

## Findings

- RLS with transaction-scoped `set_config('app.user_id', …, true)` and `SET LOCAL ROLE` works cleanly. Phase 2 must make sure the connection pool never leaks session-level settings (use transaction-scoped settings only).
- Account deletion **cannot** be a cascade. The schema blocks it deliberately until U-20 is decided.
- Trigger-maintained tombstones, change feed and purge queue keep the guarantees inside one transaction (transactional outbox).
- **Open When privacy gap.** The `letter_select` policy lets the recipient read a sealed letter's whole row, including `body`, before choosing to open it. The spec ([open-when.md](../features/open-when.md)) requires the body to stay closed until opened. **The database alone does not enforce this.** It is unverified and must not be described as secure until enforcement is verified at the API or data-access layer. A characterization test ("KNOWN GAP — Open When body visibility") asserts the current behaviour, so the gap cannot be silently forgotten. It does **not** fix it. **API-level authorization has no tests at all**: everything here is database-level.

## Limitations

PGlite is single-connection, so concurrency races (two simultaneous invitations) are mitigated by a row lock but not load-tested. Performance and index tuning are not measured. Migrations tooling is a Phase 2 choice.
