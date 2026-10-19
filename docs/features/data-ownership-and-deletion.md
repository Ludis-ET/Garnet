# Data ownership, export and deletion

Spec for §11 / D-10, D-11.

## Three separate actions

| Action                 | Who            | What happens                                                                                                                                                                                                     | Status                                                            |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Delete a shared memory | Either partner | Confirmation explains recap/archive effects → entry and media deleted for both → tombstone → media purge queued → partner's devices drop it on next sync.                                                        | D-11; shown in simulation (F-04) + database (F-05), not on device |
| Delete a private draft | Author only    | Same, but the partner never learns it existed.                                                                                                                                                                   | simulation + database only                                        |
| End pairing            | Either partner | Export offered first. Direction **P-37** (proposal): ask during the flow; the remaining partner gets an export opportunity before deletion takes effect; by default the departing partner's entries are removed. | blocked on U-20 edge cases, U-23                                  |
| Delete my account      | Account holder | Export first → explanation (effects, backup retention) → deliberate confirmation → deletion. Sessions revoked immediately (on every device; U-27). Shared memories per P-37.                                     | blocked on U-20 edge cases, U-23, U-07, U-27                      |

## Export

- Contains what the requester is authorized to see: their own drafts, all shared entries, letters they wrote or received (sealed), their signals and responses, Spark milestones.
- **Never** the partner's private drafts (§11). The export query runs under the same row-level security as the app, so this is structural.
- Format: a ZIP with JSON (machine-readable) and HTML (human-readable), plus media files. Delivered via a short-lived link; the export file is deleted after N days.

## Deletion guarantees

1. Propagates to active records **and** media (purge queue with retries).
2. Stale offline or restored devices cannot re-upload or resurrect deleted items: tombstones plus `gone` responses (P-05).
3. Access is revoked immediately even if backup copies expire later. Backup retention is stated to users (U-07).
4. The app states plainly that deletion cannot erase screenshots, downloads, exports or copies outside Garnet.

## Copy (draft)

> **Delete this moment for both of you?** It will be removed from your Day Log, recaps and memories on both phones. This can't be undone. Copies saved outside Garnet, such as screenshots or exports, aren't affected.
