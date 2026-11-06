# Phase 2 backlog (dependency-ordered)

> **Re-sequenced 2026-10-19 (owner direction P-39).** Phase 2 is now the complete mobile **design and mock prototype** ([docs/design/](../design/README.md)). The backend, auth, sync, storage and notification items below move to **Phase 4–5** of the new roadmap; their order and gates still apply there. For Phase 2, the relevant items are B-04 (UI gate: a page's design exists before it is coded), B-10 (mobile scaffold: **started** — Expo SDK 57 app in `apps/mobile`, device run pending U-01), and the design-review exit (Phase 3 freeze).

Each item lists what it **depends on** (work or decisions) and what "done" means. Items are ordered so nothing starts on a guess (§1). ⛔ = blocked by an unresolved decision.

**UI gate (P-34, owner direction):** no Phase 2 UI implementation starts until **B-04** is done. This applies to the UI parts of B-20, B-21 and B-22 (J1/J2), and to every later item with UI (B-32, B-33, B-51, B-62, B-71, B-80, B-90, B-100, B-101).

## M0 — Decision gate (owner)

| ID   | Item                                                                                                                                                                                                                                                                                                                    | Unblocks                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| B-00 | Review and sign off D-01–D-17 and P-01–P-38 (accept, change or reject each). Planning-baseline items still need this review to become Accepted.                                                                                                                                                                         | Everything                |
| B-01 | **U-01** Name every target device; multiple devices per person are planned (P-36)                                                                                                                                                                                                                                       | M1 device spikes, M8      |
| B-02 | **U-07** Compare two providers (P-35: UK residency preferred; EU only as a fallback). Check the residency of the database, replicas and backups, object storage and replication, CDN/edge, logs and error reporting, and email; include a one-page cost model. The owner reviews; no provider is selected by this item. | M1 environments           |
| B-03 | **U-10** Resolve rights and distribution authorization for the actual characters (P-30), and **U-26** asset sourcing and handling                                                                                                                                                                                       | M11, any distribution     |
| B-04 | **UI gate (P-34):** low-fidelity wireframes for all core journeys J1–J7 (especially J3 and J4) produced and **reviewed by the owner**. Clickable prototype optional.                                                                                                                                                    | All UI work (see UI gate) |

## M1 — Foundations

| ID   | Item                                                                                                                                  | Depends on | Done when                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| B-10 | `apps/mobile`: Expo app, dev builds for both targets, Metro monorepo config, imports `@garnet/domain`                                 | B-01       | A dev build runs on both phones; the F-06 tests pass on Hermes                |
| B-11 | **Run F-01** (widget) and **F-03** (safe updates) on the real devices; deferred here from Phase 1 by P-33. F-02 is deferred to B-110. | B-10       | Measured against P-26 and P-28, or blockers recorded. Not verified until run. |
| B-12 | `apps/api`: NestJS skeleton, config, health, RFC 9457 errors, allow-listed structured logging                                         | —          | `pnpm check` covers it; logs proven to exclude bodies                         |
| B-13 | `packages/db`: port `schema.sql` to migrations; move the F-05 tests; Postgres in CI                                                   | B-12       | Migrations up from empty; RLS suite green in CI                               |
| B-14 | Staging + production environments, secrets, backups, first restore drill                                                              | B-02       | Restore drill documented                                                      |
| B-15 | Error reporting with PII scrubbing; privacy-safe metrics                                                                              | B-12, B-10 | A test event shows no content                                                 |

## M2 — Accounts and pairing

| ID   | Item                                                                                                  | Depends on              | Done when                                              |
| ---- | ----------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| B-20 | Sign-up, verification, login, refresh rotation, reset, sessions (multi-device per P-36; details U-27) | B-13; UI part also B-04 | ADR-0006 rules covered by tests, including token reuse |
| B-21 | Invitations and pairing (J1)                                                                          | B-20, B-04              | F-05 invitation tests pass against the API             |
| B-22 | Start Long Distance setup (J2): time zones, notification permissions                                  | B-21, B-04              | Works with notifications denied                        |
| B-23 | Cross-relationship authorization probe harness (runs for every endpoint)                              | B-20                    | CI fails if any endpoint lacks a probe                 |

## M3 — Sync core and Day Log (text)

| ID      | Item                                                                                  | Depends on       | Done when                                                             |
| ------- | ------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| B-30    | Local SQLite store: confirmed state + outbox; sync loop (multi-device behaviour U-28) | B-10             | Survives force-kill; F-03 scenarios 2–3 pass                          |
| B-31    | `POST /mutations`, `GET /changes` per ADR-0003                                        | B-13, B-20       | **The F-04 invariants pass as acceptance tests against the real API** |
| B-32    | Day Log: compose, autosave draft, share, edit, delete (J3, text only)                 | B-30, B-31, B-04 | All entry states in ux/states.md designed and implemented             |
| B-33    | Conflict copies and "deleted elsewhere" UX                                            | B-32             | Copy from voice-and-copy.md                                           |
| ⛔ B-34 | Timestamp editing                                                                     | U-11             | —                                                                     |

## M4 — Media

| ID      | Item                                                                                                                                       | Depends on       | Done when                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ⛔ B-40 | Media limits per type                                                                                                                      | U-08             | Caps recorded in the decision log                                                                                        |
| B-41    | Presigned upload, commit validation, EXIF strip, thumbnails (server side; builds on the F-07 spike)                                        | B-31, B-14, B-40 | Server-side retry and resume work; invalid files rejected and purged                                                     |
| B-42    | Purge worker and orphan sweeper                                                                                                            | B-41             | Deleted media gone from storage within the SLA                                                                           |
| B-43    | **Phone-level background upload and resume verification** on the real devices (distinct from the server-side F-07 spike; not part of F-03) | B-41, B-10, U-01 | Uploads continue and resume after backgrounding, app kill and network loss on each target device; not verified until run |

## M5 — Signals and notifications

| ID      | Item                                          | Depends on       | Done when                                          |
| ------- | --------------------------------------------- | ---------------- | -------------------------------------------------- |
| B-50    | Push registration; APNs/FCM; generic payloads | B-20             | No content in any payload                          |
| B-51    | Signals and responses (J4); levels per P-23   | B-50, B-31, B-04 | Quiet hours respected; no seen/read state anywhere |
| ⛔ B-52 | Quiet-hours default window; signal retention  | U-21, U-09       | —                                                  |

## M6 — Shared day and recap

| ID      | Item                                        | Depends on       | Done when                                                      |
| ------- | ------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| ⛔ B-60 | Cutoff chosen; late window                  | U-02, U-05, U-13 | Recorded in the decision log                                   |
| B-61    | Day finalization job using `@garnet/domain` | B-60, B-31       | Idempotent; resumes after downtime; outage days marked excused |
| ⛔ B-62 | Recap (J5)                                  | B-61, U-06       | Read-only after reveal; signals never delayed                  |

## M7 — Shared Spark

| ID      | Item                                    | Depends on       | Done when                                        |
| ------- | --------------------------------------- | ---------------- | ------------------------------------------------ |
| ⛔ B-70 | Spark policy chosen                     | U-03, U-04, U-12 | `SparkPolicy` configured from the decision log   |
| B-71    | Spark API and UI; hide/mute; milestones | B-61, B-70       | Copy passes the voice-and-copy banned-word check |

## M8 — Widget

| ID   | Item                                  | Depends on       | Done when                                     |
| ---- | ------------------------------------- | ---------------- | --------------------------------------------- |
| B-80 | Widget per F-01 results, both targets | B-11, B-32, B-62 | Six states; neutral; two actions; a11y labels |

## M9 — Open When

| ID      | Item                                     | Depends on | Done when                                 |
| ------- | ---------------------------------------- | ---------- | ----------------------------------------- |
| B-90    | Letters (text): draft → seal → open (J6) | B-31       | Body served to the recipient only on open |
| ⛔ B-91 | Attachments                              | U-08, B-41 | —                                         |

## M10 — Data ownership

| ID       | Item                                    | Depends on  | Done when                                            |
| -------- | --------------------------------------- | ----------- | ---------------------------------------------------- |
| B-100    | Export (JSON + HTML + media), under RLS | B-41        | Never contains the partner's drafts (tested)         |
| ⛔ B-101 | End pairing; delete account             | U-20, B-100 | Sessions revoked at once; backup retention explained |

## M11 — Characters

| ID       | Item                                                                                                              | Depends on  | Done when                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ⛔ B-110 | Run F-02 (deferred from Phase 1 by P-33); proxy assets allowed per P-31, labelled as proxy                        | B-10, B-03  | Budgets (P-27) measured; approach chosen. Proxy results do not establish performance of the final Ruby, Sapphire and Garnet assets |
| B-111    | Production art for P0 poses and animations of Ruby, Sapphire and Garnet (P-30); working icon per U-25 (undecided) | B-110, B-03 | Reduced-motion fallbacks for every animation; F-02 budgets re-checked with final assets                                            |

## M12 — Hardening and private beta

| ID    | Item                                                                                      | Depends on | Done when                                                                                        |
| ----- | ----------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| B-120 | Security review: IDOR suite, session tests, dependency audit, secrets scan                | M2–M10     | **Done 2026-11-06 (P-88):** IDOR suite green, 0 secrets in git (`scan:secrets`), 0 tracking SDKs |
| B-121 | Accessibility audit: screen readers, contrast, Dynamic Type, reduced motion               | M3–M11     | **Done 2026-11-06 (P-88):** WCAG 2.2 AA contrast verified, 48pt touch targets, reduceMotion safe |
| B-122 | Restore drill on production-like data (synthetic)                                         | B-14       | **Done 2026-11-06 (B9, P-87):** `scripts/drill-restore.mjs` 100% row match parity verified       |
| B-123 | Private beta with the two partners; collect qualitative feedback (no engagement tracking) | all above  |                                                                                                  |
