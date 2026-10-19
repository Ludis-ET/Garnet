# Key states and component inventory

§13B requires loading, empty, error, offline, retry and update states. Every screen designs all applicable states; reviewers check this table.

## Global states

| State              | Treatment                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading            | Skeletons, not spinners, for lists; local data shows first (offline-first), then refreshes in place.                                                                                       |
| Empty              | Warm and inviting, never a guilt prompt. "Your Day Log is ready for today's first moment."                                                                                                 |
| Offline            | A small persistent banner: "Offline — your moments are saved and will send when you're back." Composing keeps working.                                                                     |
| Sending / pending  | Per-item subtle indicator (clock icon + label for screen readers). Never blocks further input.                                                                                             |
| Retry (automatic)  | Silent background retry with back-off. Surface it only if it persists: "Still trying to send 1 moment."                                                                                    |
| Failed (needs you) | Only for real decisions: a conflict copy ("We kept both versions"), a rejected upload (size or type), sign-in expired.                                                                     |
| Deleted elsewhere  | "This moment was removed." Shown once, then gone. No blame, no names.                                                                                                                      |
| Update available   | Over-the-air update applied at a safe point (app start or background) without losing drafts. Store update needed: a gentle, dismissible card. ([F-03](../feasibility/F-03-safe-update.md)) |
| Permission denied  | Explain value once; link to settings; the app remains fully usable.                                                                                                                        |
| Error (server)     | Plain language plus a retry action. Never raw error codes, never private content in messages.                                                                                              |

## Per-feature states

| Feature   | Must design                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pairing   | Invite created · copied · expired/used ("isn't valid anymore") · already paired · waiting for partner                      |
| Day Log   | Empty day · draft (private badge) · shared · uploading media · upload failed · read-only (revealed) · conflict copy        |
| Signals   | Composing · sent · queued offline · reply received · quiet hours active (on the recipient's side, invisible to the sender) |
| Recap     | Not yet available · you're ready / waiting for your person (neutral) · ready · empty day                                   |
| Spark     | Growing · graced ("Grace kept your Spark glowing") · resting · milestone · hidden                                          |
| Widget    | SignedOut · NotPaired · Calm · SomethingNew · RecapReady · Stale (see [widget.md](../features/widget.md))                  |
| Open When | No letters · draft · sealed (unopened) · opened                                                                            |
| Export    | Requested · preparing · ready (expires) · expired                                                                          |
| Deletion  | Confirm (with effects) · in progress · done · "can't erase copies outside Garnet" notice                                   |

## Component inventory

| Component            | Purpose / variants                                                                     | Accessibility notes                                               |
| -------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `MomentComposer`     | Text, feeling, activity, media; autosave; private/share toggle                         | Labels on every control; draft state announced                    |
| `EntryCard`          | Draft / shared / pending / failed / read-only / conflict-copy                          | Status as text + icon, never colour alone                         |
| `PrivacyBadge`       | "Only you" (draft) marker                                                              | Announced as "Private draft, only you can see this"               |
| `SyncStatus`         | Per-item pending/failed; global offline banner                                         | Live-region announcements, rate-limited                           |
| `SignalPicker`       | 8 signals grouped by level                                                             | Large touch targets; grouping announced                           |
| `SignalCard`         | Received signal + preset replies                                                       | No "seen" indicators                                              |
| `RecapView`          | Both partners' shared moments for a day, in viewer time                                | Chronological reading order                                       |
| `SparkCrystal`       | Growth stages, graced, resting, milestone                                              | Text description of state; static under reduced motion            |
| `Character`          | Ruby / Sapphire / Garnet: idle, action, milestone, loading; 3D / pre-rendered / static | Decorative unless meaningful; reduced-motion static frame         |
| `TimeLabel`          | Instant in viewer's zone; optional partner's time                                      | Full date/time in the accessibility label                         |
| `ConfirmDestructive` | Delete memory / end pairing / delete account                                           | Explicit effects text; no default focus on the destructive button |
| `EmptyState`         | Per-surface kind copy + one action                                                     | —                                                                 |
| `Banner`             | Offline, update available, permission explanation                                      | Dismissible where non-critical                                    |
