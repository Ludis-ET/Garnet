# F-04 — Retry-safe offline sync and deletion propagation

**Result: ✅ Proven in a deterministic in-memory simulation only.** Nothing here has run over real HTTP, against SQLite, or on a device. Code: [`spikes/offline-sync`](../../spikes/offline-sync/). Model: [ADR-0003](../decisions/adr/0003-offline-sync-model.md).

## Question

Can offline writes, retries and deletions be made idempotent and conflict-aware, so that "stale queued uploads must not undo deletion" (§12), without losing anyone's words or leaking private drafts?

## Method

- A reference server (authorization, idempotency, versions, tombstones, audience-scoped feed, media store) and a device (confirmed state + outbox), in memory and deterministic.
- A **fault-injecting network**: dropped requests, dropped responses (applied but unacknowledged), duplicated deliveries.
- 17 scenario tests (including deterministic regressions for the three design bugs), plus **3 property-based tests × 400 random scenarios** (20–150 commands each): random creates, edits, shares, attachments, deletes, sends, pulls, offline toggles, two devices for one partner, **device backup and restore**, and **expiry of idempotency records**.
- Seven invariants checked after every scenario (see [offline-sync.md](../architecture/offline-sync.md#invariants-tested-on-every-ci-run)), including a causal "no silently lost words" check.
- **Mutation testing (reproducible):** [`scripts/mutation-check.mjs`](../../scripts/mutation-check.mjs) copies the suite to a scratch directory, applies one deliberate break, and requires the real tests to fail. It runs an unmutated baseline first.

## Results

Mutation results (`pnpm mutation --with-docker --runs 3`, run 2026-10-19; randomized suites run 3 times per mutant):

| Mutant | Guard removed                                                    | Outcome                                                                    |
| ------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| F04-1  | Tombstone check on create                                        | killed 3/3                                                                 |
| F04-2  | Tombstone check on edit/share/attach                             | killed 3/3                                                                 |
| F04-3  | Optimistic concurrency (`baseVersion`)                           | killed 3/3                                                                 |
| F04-4  | Idempotency keys                                                 | killed 3/3                                                                 |
| F04-5  | Private-draft feed audience                                      | killed 3/3                                                                 |
| F04-6  | Private-delete feed audience                                     | killed 3/3                                                                 |
| F04-7  | Media purge on delete                                            | killed 3/3                                                                 |
| F04-8  | Conflict resolution keeps a queued delete (bug 1 fix)            | killed 3/3                                                                 |
| F04-9  | Feed acknowledgement by `mutationId` (bug 3 fix)                 | killed 3/3                                                                 |
| F04-10 | No skipped server updates while local work is queued (bug 2 fix) | killed 5/5 (`--runs 5`)                                                    |
| F04-E1 | Tombstone check inside replay                                    | survived 0/3: **equivalent** (the client treats a null entry the same way) |

Earlier figures from a one-off manual session are superseded by this table.

## Coverage map (what the tests actually exercise)

| Concern             | Scenario tests (`src/sync.test.ts`)                                                                                                        | Property tests (400 random scenarios each)                           | Mutants that must be killed |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------- |
| Idempotency         | lost response + retry applies once; duplicated request applied once; key reuse with a different payload rejected                           | invariant 1 (each effect at most once) in all three properties       | F04-4                       |
| Deletion tombstones | queued edits/uploads for a deleted entry answer `gone`; pulling first purges queued uploads; re-sent create cannot resurrect; media purged | invariant 2 (no resurrection, server or device)                      | F04-1, F04-2, F04-7         |
| Concurrent updates  | conflicting offline edit kept as a private conflict copy; deterministic bug-1 and bug-2 regressions                                        | "two devices for one partner" + invariant 6 (no silently lost words) | F04-3, F04-8                |
| Stale devices       | restored backup cannot resurrect a deleted entry after idempotency records expire                                                          | "stale devices restored from backups + expired idempotency records"  | F04-1, F04-9, F04-10        |
| Conflict handling   | conflict copy is private, never auto-shared; queued delete survives conflict resolution                                                    | invariants 4 (convergence) and 6                                     | F04-8                       |
| Draft privacy       | partner never receives a draft or its edits; probing is indistinguishable from missing; private deletes not announced                      | invariant 5 (nothing private from the partner arrives)               | F04-5, F04-6                |

These are simulation results. They do **not** prove production synchronization over HTTP, SQLite or real devices.

## Reproduce

```sh
pnpm --filter @garnet/spike-offline-sync test   # 20 tests (also part of pnpm check)
pnpm mutation --only offline-sync --runs 5       # mutants F04-1 … F04-10 and F04-E1
```

## Design bugs found (and fixed) — why this spike mattered

| #   | Bug in the simpler design                                                                                                                                              | Fix (now in ADR-0003)                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Conflict resolution dropped **all** queued mutations for the entry, including a later delete, then re-adopted the server copy, **silently undoing the user's delete**. | Keep queued deletes; never re-adopt a deleted entry.            |
| 2   | The device skipped server updates for entries with queued work and advanced its cursor, so after a **backup restore** it **diverged permanently**.                     | Confirmed state + replayed outbox (rebase).                     |
| 3   | A lost response followed by a pull **double-counted** the mutation (already in server state and still queued), causing **false conflicts**.                            | Feed items carry `mutationId`; seeing your own acknowledges it. |

Also found: the first test generator produced runs averaging **0.46 entities**, which made the property tests vacuous. Fixed with `size: "max"` and weighted commands. A one-off probe, **not kept in the repository**, measured about 7.5 entities per run, with conflicts in about 20% of runs and deletions racing queued work in about 25%. These figures are indicative and not reproducible as-is.

## Findings for decisions

- **U-15:** tombstones must outlive idempotency records and any restorable device backup. Recommendation: keep tombstones (ids only) for the relationship's lifetime.
- **U-19:** multiple devices per person work, at the cost of occasional conflict copies in the UI.
- Idempotency keys are a second line of defence: versions and tombstones already make most replays safe, which is what makes expiring idempotency records acceptable.

## Limitations

In-memory model. Not exercised: real HTTP, SQLite persistence and crash points, background execution limits on iOS and Android, clock skew (U-14), large media. Phase 2 reuses these invariants as acceptance tests against the real API and local database.

**Media upload retry is not covered by this spike.** "Attach" is modelled as a single metadata mutation. Presigned upload, resumable transfer, commit validation and object-storage purge were never exercised. That risk is covered server-side by [F-07](./F-07-media-retry.md) (verified locally against SeaweedFS); phone-level background upload is backlog item B-43 (not verified).
