# MVP checklist

What the first release must do, per feature, as testable statements. **Status** shows Phase 1 readiness:

- `Specified`: written down and ready for Phase 2.
- `Proven (domain / simulation / database)`: behaviour executed in a Node domain test, the F-04 in-memory simulation, or the F-05 PGlite database tests.
- `Blocked`: needs a U-xx decision, a device spike, or verification.

**No row has been verified in a running app, on an OS, or on a phone.**

## Accounts and pairing

| Requirement                                              | Status            | Ref      |
| -------------------------------------------------------- | ----------------- | -------- |
| Email/password sign-up with verification; password reset | Specified         | ADR-0006 |
| Sessions stored hashed, revocable; refresh rotation      | Specified         | ADR-0006 |
| Single-use invitation, ≤ 24 h, one generic error         | Proven (database) | F-05     |
| Exactly two partners; one active relationship per person | Proven (database) | F-05     |

## Day Log

| Requirement                                                            | Status                                                                                                                                                                     | Ref                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Continuous chronological log, both partners' shared entries            | Specified                                                                                                                                                                  | features/day-log-and-recap.md |
| Private drafts visible only to the author (server + database enforced) | Proven (simulation + database)                                                                                                                                             | F-04, F-05                    |
| Explicit share action; shared entries cannot become private again      | Proven (database)                                                                                                                                                          | F-05 (P-20)                   |
| UTC storage; local display per viewer                                  | Proven (domain, Node only; Hermes unverified)                                                                                                                              | F-06                          |
| Media attach with background, resumable upload                         | Server-side retry, validation and purge **Proven (local storage, F-07)**; phone background upload and resume **not verified** (B-43); provider behaviour unverified (U-07) | ADR-0005, F-07                |
| Media limits per type                                                  | Blocked                                                                                                                                                                    | U-08                          |
| Edit own entries; read-only after recap reveal; delete still allowed   | Proven (database)                                                                                                                                                          | F-05                          |
| Timestamp editing                                                      | Blocked                                                                                                                                                                    | U-11                          |

## Offline and sync

| Requirement                                                        | Status                                                                 | Ref                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------ |
| Text drafts work fully offline and survive app restarts            | Specified                                                              | ADR-0003           |
| Retries never duplicate effects                                    | Proven (simulation)                                                    | F-04               |
| Deleted items never come back, even from stale or restored devices | Proven (simulation + database)                                         | F-04, F-05         |
| Edit conflicts never lose words (private conflict copy)            | Proven (simulation)                                                    | F-04               |
| Late entries count for the right shared day                        | Blocked                                                                | U-05               |
| Multiple devices per person (P-36)                                 | Blocked: U-27, U-28; multi-device sync shown in simulation only (F-04) | ADR-0003, ADR-0006 |

## Signals and notifications

| Requirement                                       | Status                                                          | Ref                                   |
| ------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Eight signals, two levels                         | Specified                                                       | P-07                                  |
| Preset responses and free-text reply              | Specified                                                       | features/signals-and-notifications.md |
| Generic lock-screen previews by default           | Proven (domain only); OS rendering unverified                   | domain tests                          |
| Quiet hours on by default; no DND bypass promised | Specified                                                       | U-21 window                           |
| No read receipts, "seen" claims or escalation     | Specified (by design: the schema has no such state; not a test) | features/signals-and-notifications.md |
| Signal retention                                  | Blocked                                                         | U-09                                  |

## Recap

| Requirement                            | Status    | Ref        |
| -------------------------------------- | --------- | ---------- |
| Available when both ready or at cutoff | Blocked   | U-02, U-06 |
| Signals never wait for reveal          | Specified | §4         |

## Shared Spark

| Requirement                                                             | Status                                                                                          | Ref                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| Only intentional connection qualifies; private drafts never count       | Proven (domain)                                                                                 | domain tests                          |
| Both partners → growth; grace preserves without growth; no blame stored | Proven (domain + database)                                                                      | domain tests, F-05                    |
| Milestones 3, 7, 14, 30, 50, 100, 365; never lost                       | Proven (domain)                                                                                 | domain tests                          |
| Outages don't consume grace                                             | Proven (domain)                                                                                 | domain tests (excused days)           |
| Grace boundary; exhausted-grace behaviour                               | Blocked                                                                                         | U-03, U-04 (both options implemented) |
| Mute Spark prompts without loss                                         | Specified                                                                                       | features/shared-spark.md              |
| Hide Spark without loss                                                 | **Partly open**: hiding is specified, but whether milestones accrue while hidden is open (U-24) | features/shared-spark.md              |

## Widget

| Requirement                                              | Status    | Ref                |
| -------------------------------------------------------- | --------- | ------------------ |
| Privacy-neutral adaptive content; last-updated indicator | Specified | features/widget.md |
| Two actions only; never shares without review            | Specified | features/widget.md |
| Platform refresh and interaction limits verified         | Blocked   | F-01, U-01         |

## Open When

| Requirement                                                       | Status                                                                                                                                                                | Ref                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Text letters; draft → sealed → opened; recipient can't see drafts | Proven (database)                                                                                                                                                     | F-05                        |
| Sealed letter body hidden from the recipient until opened         | **Unverified known gap**: the database alone does not enforce it (pinned by a characterization test); the API/data-access layer must enforce it, and that is untested | F-05, features/open-when.md |
| Attachments                                                       | Blocked                                                                                                                                                               | U-08                        |

## Characters

| Requirement                                                                               | Status                                                                      | Ref                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| Art brief, pose/expression and animation inventory                                        | Specified                                                                   | characters/art-brief.md |
| Actual characters Ruby, Sapphire, Garnet (P-30); rights path; public distribution blocked | Specified as owner direction; rights and distribution **unresolved** (U-10) | characters/rights.md    |
| 3D runtime vs pre-rendered                                                                | Blocked                                                                     | F-02, U-10              |

## Data ownership

| Requirement                                                        | Status                                                    | Ref                                     |
| ------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------- |
| Three separate actions: delete memory, end pairing, delete account | Specified                                                 | features/data-ownership-and-deletion.md |
| Either partner deletes a shared memory for both; media purged      | Proven (database: purge queued; object deletion untested) | F-05                                    |
| Export excludes partner's private drafts                           | Specified                                                 | RLS is the export query's boundary      |
| Shared memories after account deletion                             | Blocked                                                   | U-20                                    |
