# Feasibility spikes

§13F requires feasibility results or explicit blockers for every high-risk assumption. Spikes are **evidence, not production code**: anything promoted to Phase 2 is rewritten into `packages/` or `apps/` with its tests.

| ID   | Risk (§14)                                                                 | Result                                                                                                                                    | Evidence                                          | Run                                                                   |
| ---- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| F-01 | Widget capability differs by platform                                      | ⏸ **Deferred to B-11 (M1)** by owner direction P-33 — blocked on U-01; **not verified**                                                   | [Plan + capability matrix](./F-01-widget.md)      | needs target devices                                                  |
| F-02 | 3D performance / asset size                                                | ⏸ **Deferred to B-110 (M11)** by owner direction P-33 — blocked on U-01, U-26; **not verified**                                           | [Plan + budgets](./F-02-character-performance.md) | needs devices; proxy assets allowed with the stated limitation (P-31) |
| F-03 | Update loses drafts                                                        | ⏸ **Deferred to B-11 (M1)** by owner direction P-33 — blocked on U-01; **not verified**                                                   | [Plan + test script](./F-03-safe-update.md)       | needs a development build on a device                                 |
| F-04 | Offline conflicts / duplicates; stale uploads undo deletion                | ✅ **Proven — simulation only** (in-memory; no real HTTP, SQLite or device)                                                               | [Results](./F-04-offline-sync.md)                 | `pnpm --filter @garnet/spike-offline-sync test`                       |
| F-05 | Private data leak; draft data model                                        | ✅ **Proven — database only** (PGlite; no API layer)                                                                                      | [Results](./F-05-data-model.md)                   | `pnpm --filter @garnet/spike-data-model test`                         |
| F-06 | Timezone / DST errors (Ethiopia ↔ London)                                  | ✅ **Proven — domain, Node only** (Hermes unverified)                                                                                     | [Results](./F-06-timezone-dst.md)                 | `pnpm --filter @garnet/domain test`                                   |
| F-07 | Media upload retry, server side (§13F "retry-safe media", §16 criterion 5) | ✅ **Verified server-side, locally** (SeaweedFS in Docker; 22 tests; 6 mutants killed). **Not** phone-level, **not** the chosen provider. | [Results](./F-07-media-retry.md)                  | `pnpm spike:media` (needs Docker; not in `pnpm check`)                |
| B-43 | Phone background upload and resume                                         | ⏸ Later — Phase 2 M4; **not verified**                                                                                                    | [backlog](../phase-2/backlog.md)                  | needs real devices                                                    |

The F-04, F-05 and F-06 suites run with `pnpm check`. F-07 runs with `pnpm spike:media` (needs Docker). `pnpm mutation --with-docker` reproduces the mutation evidence for F-04 to F-07 and the domain rules (30 mutants: 29 killed as required, 1 documented equivalent; final run 2026-10-19). CI is configured in `.github/workflows/ci.yml` but **has never run**: the repository has no commits and no remote. None of these results has been verified in an app, on an OS, or on a device.

## Final architecture recommendation

**Proceed with D-09 as proposed** (React Native + Expo + TypeScript, NestJS + TypeScript, PostgreSQL, private S3-compatible storage, managed hosting), with these Phase 1 refinements:

1. A shared, platform-neutral `@garnet/domain` package for time and Spark rules (ADR-0001).
2. The Temporal API for all time logic (ADR-0002).
3. The F-04 sync model: client ids, idempotent mutations, tombstones, confirmed state + outbox, feed acknowledgements (ADR-0003).
4. RLS as defence in depth (ADR-0004).
5. Pre-rendered character animation first; runtime 3D only if F-02 passes (art brief).

**Before dependent Phase 2 work starts:** decide U-01 (devices), then run F-01 and F-03 in the first Phase 2 sprint, because the app shell and widget designs depend on them.

> **Deferral (owner direction P-33, not Accepted):** F-01 and F-03 move to B-11; F-02 moves to B-110. §13F lists them as Phase 1 deliverables, and §16 criterion 5 allows explicit blockers. A deferral is **not evidence of success**: their blockers and proposed criteria (P-26 to P-28) remain. Media upload retry was **not** deferred: the server-side spike F-07 ran in Phase 1 (P-32). Phone-level background upload is B-43.
