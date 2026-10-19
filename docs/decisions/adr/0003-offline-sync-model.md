# ADR-0003: Offline sync — client ids, idempotent mutations, tombstones, confirmed state + outbox

- **Status:** **Planning baseline** (owner direction, 2026-10-18): the working direction for Phase 2 planning. **Not Accepted**; implementation not verified (see Consequences for the evidence level).
- **Date:** 2026-10-18
- **Decision IDs:** §10 Offline, §11, §12; P-04, P-05, P-14, P-15, P-16, P-19; open: U-05, U-15, U-19, U-27, U-28 (multiple devices per person planned, P-36)

## Context

§10 asks for local drafts and a pending-action queue with "stable IDs, idempotency, conflict rules, deletion propagation". §12: "Offline writes/retries must be idempotent and conflict-aware; stale queued uploads must not undo deletion." Mobile networks drop requests and responses; phones are restored from backups.

## Decision

| Concern         | Rule                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | Clients generate **UUIDv7** ids for every entity. Ids are random, so a restored device can never reissue one.                             |
| Idempotency     | Every write carries a unique `mutationId`. Same key + same payload → same outcome; same key + different payload → rejected.               |
| Concurrency     | Author writes carry `baseVersion`; a mismatch returns `conflict` with the current entity.                                                 |
| Conflicts       | The losing text becomes a **private conflict copy** (never auto-shared) flagged for review. No silent loss.                               |
| Deletion        | Content-free **tombstone**; delete wins; any later mutation on that id answers `gone`; creates are idempotent by id.                      |
| Device model    | **Confirmed server state + durable ordered outbox**, one request in flight. The UI shows confirmed state with pending mutations replayed. |
| Acknowledgement | Feed items carry the `mutationId` that caused them; seeing your own id acknowledges a mutation whose response was lost.                   |
| Responses       | Results and replays return the entity's **current** state.                                                                                |
| Change feed     | Per-user, ids-only, audience-scoped: private draft activity (including deletion) is visible only to its author.                           |
| Retention       | Tombstones must outlive idempotency records and any restorable backup (U-15).                                                             |

## Options considered

| Option                                                                | Verdict                                                                                                                                                  |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-assigned ids, online-only writes                               | Rejected: breaks offline drafts.                                                                                                                         |
| CRDTs (Automerge/Yjs)                                                 | Rejected for v1: author-only editing means conflicts are rare; CRDTs add weight and make deletion/privacy harder.                                        |
| Last-writer-wins                                                      | Rejected: silently loses words.                                                                                                                          |
| Off-the-shelf sync engines (PowerSync, ElectricSQL, Replicache-style) | Worth evaluating in Phase 2 **only** if they can enforce private-draft audiences and tombstone rules. The F-04 invariants become their acceptance tests. |

## Consequences

- Evidence: [F-04](../../feasibility/F-04-offline-sync.md). Property-based fault injection (dropped requests and responses, duplicates, offline periods, multi-device, backup restores, expired idempotency records) found **three design bugs** in simpler variants. All are fixed and kept as regression tests.
- Phase 2 needs local SQLite (e.g. `expo-sqlite`) for confirmed state and the outbox, plus a sync loop that serializes push and pull.
- Reproducible mutation checks (`pnpm mutation --with-docker --runs 3`, run 2026-10-19): every server guard (tombstones, versions, idempotency, audiences, media purge) and both client bug fixes were killed; one documented equivalent mutant survives. All F-04 evidence comes from an in-memory simulation, not a device.
