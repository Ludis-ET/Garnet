# Garnet — Phase 1 Scope & Decision Record

> **Source:** faithful Markdown transcription of [`Garnet_Phase_1_Scope_and_Decisions.docx`](./Garnet_Phase_1_Scope_and_Decisions.docx). If the two ever differ, the `.docx` is the original record; fix this file to match.
> Section numbers (§) used across the repo refer to this document.
> Decision IDs (D-xx) and unresolved IDs (U-xx) are tracked in [decisions/decision-log.md](./decisions/decision-log.md).
>
> **Reconciliation notes** are marked below and are **not part of the original record**. They point to later owner directions (P-30 to P-37) and the D-09 clarification, recorded as proposals or Planning baseline in the decision log. **None is Accepted.** The original wording is kept verbatim so the record stays faithful to the `.docx`.

_Product foundation • Design • Architecture • Feasibility_
_Working document — proposed decisions are distinguished from unresolved items_

## Product promise

> "I can't be there with you right now, but I can still be part of your day."

## 1. Phase 1 purpose

Phase 1 defines what Garnet is, the first-release target, core behavior, design direction, architecture, privacy boundaries, and the technical assumptions that must be tested. It is a planning/design/feasibility phase—not a phase to build the entire production app.

**Exit outcome:** product scope and primary journeys are agreed; high-risk assumptions have feasibility results; architecture, privacy, and unresolved decisions are documented; and Phase 2 can begin without guessing.

## 2. Product principles

- Garnet is a private app for exactly two partners, designed to make everyday connection easier across distance.
- Ruby ❤️ + Sapphire 💙 → Garnet 💜 is the visual metaphor. The experience should feel personal, playful, affectionate, and alive.
- The app should encourage meaningful connection without turning the relationship into a performance metric.
- Privacy-first defaults: private drafts stay private, shared content is explicit, and lock-screen previews are generic by default.
- No ads, sale of relationship data, relationship-health scores, rankings, guilt-based streak prompts, or shame-inducing character reactions.
- Fast and forgiving UX: autosave where appropriate, background uploads, retry-safe sync, offline text drafts, accessibility, and reduced-motion support.

## 3. First-release feature target

The user selected the following feature areas for the intended first release. Delivery should be staged by dependency and reliability; this list is a target, not a reason to ship unstable features.

| Feature              | Phase 1 scope intent                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Accounts and pairing | Two individual accounts securely connect to one private relationship.                                                       |
| Daily Log            | Continuous timeline; private drafts and explicitly shared entries; timestamps and media.                                    |
| Connection signals   | I Thought of You, Missing You, I Need You, I Need to Talk, Just Listen, Please Check On Me, I Can't Talk Yet, I'm Okay Now. |
| Widget               | Adaptive Garnet Nudge with privacy-neutral previews; actions: Add a Moment and Open Today's Recap.                          |
| Shared Spark         | Growing crystal, mutual meaningful contribution, grace, milestones, and opt-out behavior.                                   |
| Characters           | Actual Ruby, Sapphire, and Garnet character figures; 3D-first direction with lightweight fallbacks.                         |
| Open When            | Letters with text first; photos/voice attachments subject to feasibility and privacy.                                       |
| Offline              | Private text drafts and retry-safe synchronization.                                                                         |
| Notifications        | Gentle affectionate signals and more noticeable support requests; user-controlled preferences.                              |

## 4. Daily Log, sharing, and recap

- The Day Log is a continuous chronological log, not only an end-of-day form.
- Ordinary entries may be shared immediately. Private drafts remain visible only to their author until explicitly shared.
- Potential entry types include text, photos, video, voice, feeling, activity, food, work, location, and custom content; final media scope and limits remain to be set.
- Store actual event timestamps in UTC and display them in each partner's local time zone.
- Recaps become available when both partners are ready or at a configurable cutoff. Urgent emotional signals do not wait for recap reveal.
- After reveal, entries are read-only. Deletion remains possible under the shared deletion policy.
- Unresolved: recap reveal defaults, late offline entries, editable timestamps, and how deleted items affect an already-revealed recap.

## 5. Emotional support and notifications

- The eight selected signals are: I Thought of You; Missing You; I Need You; I Need to Talk; Just Listen; Please Check On Me; I Can't Talk Yet; I'm Okay Now.
- Use two notification levels: gentle affectionate signals and more noticeable support requests.
- Offer preset responses such as "I'm here ❤️", "Can I call you?", "Give me a little time", and "Tell me what's going on".
- Respect quiet hours by default; don't promise a sound or Do Not Disturb bypass.
- Generic lock-screen previews by default; each partner controls their own notification preferences.
- No read-receipt pressure, automatic escalation for non-response, or claim that an alert was seen unless that state is genuinely known.
- Define retention for emotional signals and delivery metadata before implementation.

## 6. Home and widget

- Home direction: a living shared world; humor is playful and chaotic but remains affectionate.
- Widget mode: adaptive contextual content. Previews remain privacy-first and neutral.
- Widget actions are limited to Add a Moment and Open Today's Recap. Tapping must not create a shared entry without review/confirmation.
- OS-controlled refresh means the widget must remain useful without constant updates; show last-updated information when useful.
- Validate widget interactions and refresh limits separately on iOS and Android before treating the design as technically final.

## 7. Shared Spark — proposed rules

| Topic              | Current proposed rule / status                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose            | Celebrate meaningful connection, not app usage or relationship quality.                                                                                |
| Qualifying action  | Intentional connection: share a moment, send an affectionate/support signal, or reply. App opens, widget views, and notification receipt do not count. |
| Normal day         | Both partners contribute at least one qualifying action.                                                                                               |
| Grace              | One shared grace day per rolling seven-day period; preserves but does not grow the streak.                                                             |
| When grace applies | If either or both partners fail to contribute, one available grace day can preserve the shared streak without assigning blame.                         |
| Activation         | Automatically use available grace when the shared day is finalized; show neutral status without interrupting either partner.                           |
| Replenishment      | Recommendation only: another grace day becomes available seven full days after the previous use. Not yet approved.                                     |
| Visual/milestones  | Growing crystal; milestones at 3, 7, 14, 30, 50, 100, 365 days.                                                                                        |
| Safety             | No sad/angry/abandoned character reactions, guilt, relationship inference, or loss of memories. Grace does not earn a milestone.                       |
| Controls           | Users should be able to hide the streak and mute prompts without losing memories or earned milestones.                                                 |

Unresolved: what happens when grace is exhausted; consecutive missed days; exact rolling-window boundary; late-sync corrections; whether deleted items still count historically. Service outages and valid offline activity must not consume grace.

## 8. Shared day and time zones

- One shared connection day with a configurable cutoff, shown in each partner's local time.
- Proposed reference zone: Europe/London. The exact cutoff hour is intentionally undecided.
- Use named time-zone rules so GMT/BST transitions are handled; do not hard-code a fixed offset.
- The server calculates shared-day assignment. Keep day cutoff, recap reveal, and grace rules independent.
- Unresolved: exact cutoff, late-entry window, behavior after cutoff changes, and corrections for device-clock errors.

## 9. Characters and rights

- 3D characters preferred; selective idle, action, milestone, and loading animations.
- App icon direction: a composition featuring Ruby, Sapphire, and Garnet, readable at small sizes and on light/dark backgrounds.
- Plan 3D physical figures with a 2D-printed fallback; manufacturing is future work, not a Phase 1 deliverable.
- Private use first. Review permissions before public distribution of character assets or physical figures; private use does not automatically resolve every rights question.
- If permissions are impractical, consider original gem-inspired characters rather than close copies.
- Use lazy loading, lightweight/pre-rendered or static fallbacks, reduced-motion support, and performance testing on representative devices.
- Phase 1 deliverables: art brief, pose/expression inventory, icon concepts, animation inventory, feasibility findings, and documented rights path.

> **Reconciliation note (not part of the original record):** owner direction **P-30**: the intended experience uses the actual Ruby, Sapphire and Garnet characters. It is not to be replaced by original characters, and private-only distribution is not assumed. The "consider original gem-inspired characters" fallback above is **not** the current direction. Rights and distribution authorization remain **unresolved (U-10)**, and public distribution stays blocked. The working icon is undecided (U-25).

## 10. Proposed technical architecture

| Layer          | Proposed choice                                                       | Dependencies / risks                                                                |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Mobile         | React Native + Expo + TypeScript                                      | Native/platform-specific integration may be needed for widgets and device features. |
| Backend        | NestJS + TypeScript                                                   | Central API; server is source of truth for authorization.                           |
| Database       | PostgreSQL                                                            | Structured records and consistent business rules.                                   |
| Media          | Private S3-compatible object storage                                  | Short-lived authorized URLs, upload validation, retention and retry rules.          |
| Hosting        | Managed hosting; low recurring cost                                   | Compare total cost, region, bandwidth, backups, restore support.                    |
| Authentication | Email/password, verification, password reset                          | Secure password hashing, sessions/revocation, rate limits.                          |
| Jobs           | Start simple; add Redis queue only if needed                          | Scheduled recaps, notifications, media processing.                                  |
| Offline        | Local drafts and pending-action queue                                 | Stable IDs, idempotency, conflict rules, deletion propagation.                      |
| Updates        | Compatible updates at safe point; preserve drafts; prompt when needed | Native changes may require store updates.                                           |
| Operations     | Staging and production                                                | Monitoring, backups, versioned deployment and restore tests.                        |

> **Reconciliation note (not part of the original record):** the stack and the **authentication method** (email/password with verification and reset) are a **Planning baseline** (D-09, 2026-10-19). ADR-0006's detailed security policies (password rules, Argon2id parameters, session lifetimes, refresh rotation, rate limits, invitation security) remain **Proposed**. Hosting provider and region remain open (U-07; UK residency preferred, EU fallback, P-35).

## 11. Data ownership, privacy, and deletion

- Account/relationship deletion: export first, then deliberate deletion with clear explanation of effects and backup retention.
- Private drafts: only the author can view, export, and delete them.
- Shared-memory deletion: either partner can delete a shared item for both, after confirmation and explanation of recap/archive effects.
- Keep delete my account, end pairing, and delete a specific shared memory as separate actions.
- Deletion must propagate to active records/media; stale offline devices must not re-upload deleted items.
- Explain that deleting from Garnet cannot erase screenshots, downloads, exports, or copies outside Garnet.
- Define backup retention; revoke access promptly even if backup copies expire later.
- Exports include only data the requester is authorized to access and never another person's private drafts.
- No advertising, sale of relationship data, or unrelated use of private content.

## 12. Security and reliability requirements

- Server-side relationship authorization on every request; test IDOR/BOLA and cross-relationship access.
- Short-lived, single-use relationship invitations; secure sessions and password-reset protections.
- Private media storage, short-lived authorized links, upload validation, rate limiting, and secret management.
- Offline writes/retries must be idempotent and conflict-aware; stale queued uploads must not undo deletion.
- Privacy-safe monitoring; logs must not expose private relationship content.
- Document backups and test restoration.
- Accessibility: contrast, screen-reader labels, status not conveyed by color alone, reduced-motion behavior.

## 13. Phase 1 workstreams and deliverables

### A. Product scope

- Product brief and feature priorities.
- Primary journeys: account/pairing, Start Long Distance, log/share a moment, send a signal, recap, Open When, export/deletion.
- MVP checklist, user journeys, decision log.

### B. UX and navigation

- Sitemap and low-fidelity wireframes for onboarding, pairing, Home, Day Log, signals, widget, streak, Open When, Memories, and key states.
- Clickable prototype for the primary journey; component inventory; loading, empty, error, offline, retry, and update states.

> **Reconciliation note (not part of the original record):** owner direction **P-34**: the **clickable prototype is deferred** and is not mandatory for Phase 1 sign-off. Low-fidelity wireframes for all seven core journeys **J1–J7** must be reviewed **before any Phase 2 UI implementation** (backlog gate B-04).

### C. Character design

- 3D-first art brief, pose/asset inventory, icon concepts, 3D/2D feasibility recommendation.
- Rights/permission review and fallback path before production art.

### D. Widget and Shared Spark

- Widget state diagram, privacy rules, action behavior, funny-but-kind copy bank.
- Streak/grace/opt-out specification and iOS/Android capability matrix.

### E. Architecture and data

- Architecture diagram and decision records.
- Draft data model, API boundaries, authorization model, media lifecycle, environment/deployment/update plan.

### F. Feasibility spikes

- Widget capability prototype on target platforms.
- Character performance test; safe-update test preserving drafts; retry-safe media/offline-sync test; Ethiopia/London timezone and DST tests.
- Spike results, limitations, blockers, final architecture recommendation.

> **Reconciliation note (not part of the original record):** owner direction **P-33** defers the widget (F-01) and safe-update (F-03) spikes to Phase 2 item B-11, and character performance (F-02) to B-110. A deferral is not a successful test. The server-side media-retry spike is **F-07** (P-32). Phone background upload is B-43.

## 14. Main risks and mitigations

| Risk                                  | Mitigation / gate                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Widget capability differs by platform | Prototype early on both; don't promise identical refresh/interactions.                                   |
| 3D performance/asset size             | Benchmark early; lazy-load and provide static/lightweight fallbacks.                                     |
| Character rights unclear              | Document permissions; block public distribution/manufacture until reviewed; original-character fallback. |
| Offline conflicts/duplicates          | Stable IDs, idempotency, explicit sync states, conflict and deletion rules.                              |
| Private data leak                     | Server-side authorization, private media, security tests.                                                |
| Streak creates pressure               | Grace, neutral language, opt-out, no blame or relationship scoring.                                      |
| Timezone/DST errors                   | UTC timestamps, Europe/London rules, server-calculated days, transition tests.                           |
| Unexpected costs                      | Estimate storage, bandwidth, backups and media processing; start with simple managed services.           |
| Update loses drafts                   | Safe-point updates, compatibility checks, persistent local drafts, native-store distinction.             |

## 15. Unresolved decisions

- Exact target device coverage: Android, iPhone, or one of each. Mobile app and widget are equally important.
- Exact shared-day cutoff hour in Europe/London.
- Grace replenishment: seven full days after previous use is a recommendation, not an approved decision.
- Streak behavior when grace is exhausted and across consecutive missed days.
- Late offline event window and historical correction policy.
- Recap reveal defaults and how deleted items affect revealed recaps.
- Final hosting/storage provider, deployment region, backup retention, and cost estimate.
- First-release media limits; Open When attachment scope.
- Emotional signal retention and final delivery-state wording.
- Character rights/permissions and final runtime 3D versus pre-rendered implementation.

Unresolved items must remain explicitly labeled; recommendations are not silently treated as approved decisions.

## 16. Phase 1 exit criteria

- Product brief, first-release target, and exclusions documented.
- Primary journeys and key states mapped and reviewed.
- Day Log, recap, emotional signals, widget, streak, and deletion behaviors specified well enough to implement.
- Architecture, draft data model, API boundaries, security model, and environments documented.
- Widget, updates, offline sync, media retry, character performance, and timezone risks have feasibility results or explicit blockers.
- Character-rights path documented; public distribution remains blocked until reviewed.
- Unresolved decisions have clear labels and next steps before dependent implementation.
- Dependency-ordered Phase 2 backlog ready; full production app is not required for Phase 1 completion.

> **Reconciliation note (not part of the original record):** these criteria are unchanged. Current status, evidence and next actions are on the [Phase 1 status board](./README.md#phase-1-status-board).

## 17. Explicitly out of scope for Phase 1

- Full production authentication backend or all application screens.
- Complete production Day Log, memories, events, and Open When systems.
- Full 3D character library or physical-figure manufacturing.
- Every notification type or complete shared-world experience.
- Production app-store release.
- Two fully separate client implementations before platform feasibility is understood.

## Appendix — Numbered decision record

| Decision(s) | Area                         | Current record                                                                                                                             |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–8         | Product scope and experience | Prior proposed decisions captured in sections 3–9; any missing specifics remain unresolved.                                                |
| 9           | Technical architecture       | React Native + Expo; NestJS + TypeScript; managed hosting; email/password verification/reset; safe compatible updates; low recurring cost. |
| 10          | Data ownership               | Export then deliberate deletion; private drafts controlled only by author.                                                                 |
| 11          | Shared deletion              | Either partner can delete a shared item for both, with confirmation and explanation of recap/archive effects.                              |
| 12          | Shared day                   | One configurable shared connection day displayed in both local time zones.                                                                 |
| 13          | Reference zone/cutoff        | Europe/London; exact cutoff time undecided.                                                                                                |
| 14          | Grace policy                 | One grace day per rolling seven-day period; preserve but do not grow streak.                                                               |
| 15          | Qualifying action            | Intentional connection actions qualify; passive app/widget/notification activity does not.                                                 |
| 16          | Grace application            | One shared grace day applies if either or both fail to contribute; no blame.                                                               |
| 17          | Grace activation             | Automatic when day is finalized; neutral status, no interruption.                                                                          |
| 18          | Grace replenishment          | Still open; recommended rule is seven full days after previous use.                                                                        |

_End of Garnet Phase 1 Scope & Decision Record_
