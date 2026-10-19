# F-03 — Safe updates that preserve drafts

**Result: ⛔ Blocked on U-01** (needs a development or preview build on a target device). **Deferred to Phase 2 backlog item B-11 (M1)** by owner direction P-33, which is not Accepted. The deferral is not evidence of success. The draft-persistence design is ready to test. Scope is unchanged: safe updates and drafts. Phone background upload is a separate item, B-43.

## Hypotheses

1. An over-the-air update (EAS Update) applied at a safe point never loses a draft or a queued outbox item.
2. A native change is detected via `runtimeVersion`, and the app prompts for a store or internal update instead of loading incompatible JS.
3. The local database migrates forward across versions without data loss.
4. The Temporal polyfill and `Intl` behave on Hermes as in Node (carry-over from F-06).

## Test script

Proposed pass conditions: **P-28** (not approved).

| #   | Scenario                                                        | Pass condition                                     |
| --- | --------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Type a draft, background the app, publish an OTA update, reopen | Draft intact; update applied on next cold start    |
| 2   | Type mid-sentence and force-kill the app                        | Draft intact to the last autosave (≤ 1 s debounce) |
| 3   | Queue 3 offline mutations, apply an update, go online           | All 3 sent exactly once                            |
| 4   | Ship an update with a local schema migration (add a column)     | Drafts and outbox preserved; migration idempotent  |
| 5   | Publish JS needing a newer native runtime                       | Not loaded; gentle "update from the store" card    |
| 6   | Roll back an OTA update                                         | Drafts intact                                      |
| 7   | Run the F-06 time tests on Hermes (in-app test screen)          | Same results as Node                               |

## Design under test

Drafts and the outbox are written to SQLite on every change (debounced ≤ 1 s for typing). They are never held only in memory. Updates are fetched in the background and applied on the next cold start (`checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`), never mid-session.
