> **Source:** generated Markdown transcription of [`Garnet_Master_Mobile_Design_Specification.docx`](../Garnet_Master_Mobile_Design_Specification.docx) (owner-provided, 2026-10-19). If they ever differ, the `.docx` is the original; regenerate rather than hand-edit.

❤️ 💙 💜

# GARNET

Phase 2 — Complete Mobile UI Implementation

Mock data only • No backend • Production-minded mobile engineering

Updated 19 October 2026“I can't be there with you right now, but I can still be part of your day.”

## 1. Executive decision

Change Phase 2 from “Secure Foundation” to “Complete Mobile UI Implementation with Mock Data.” Do not start backend, real authentication, database, real push notifications, email delivery, cloud media, or cross-device sync yet. Build a complete, navigable iOS/Android app prototype that feels like a real app. Only the services behind it are simulated.

| Decision        | Rule                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Stack direction | React Native + Expo + TypeScript; inspect the existing repository and preserve compatible conventions first.        |
| Data            | Typed local fixtures and mock repositories/services; no network calls.                                              |
| Persistence     | Local demo persistence only where useful; include an obvious Reset Demo Data action.                                |
| Scope           | Every screen, interaction, popup, notification preview and email preview in the Master Mobile Design Specification. |
| Security        | Model privacy-aware UI states, but never claim client-side hiding provides authorization.                           |
| Exit            | Both users review the running prototype and approve a design freeze before backend implementation.                  |
| Distribution    | Internal prototype only; Steven Universe public-distribution rights remain unresolved.                              |

## 2. Phase 1 closeout review

This review uses Garnet_Phase_1_Scope_and_Decisions.docx, the current design specification, and Phase 1 closeout details available in project context. The repository itself was not directly inspected in this chat, so verify the actual working tree before coding.

| Finding                                                      | Implication for UI phase                                                                                         | Limit                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Reported `pnpm check`: 100 tests passed                      | Rerun baseline commands before edits; add mobile UI tests.                                                       | Not proof the new UI is tested.                                  |
| Reported `pnpm spike:media`: 22/22 passed                    | Use findings for mock upload/progress/retry states.                                                              | Does not prove device/background uploads.                        |
| One of 30 deliberate mutation breaks was missed              | Identify the missed behavior and add a targeted regression test.                                                 | Do not claim full mutation coverage.                             |
| Open When sealed-body authorization gap                      | Model sealed/open states and test every UI entry point for leaks.                                                | UI hiding is not server authorization; backend fix is a blocker. |
| ADR-0006 auth security policies is Proposed                  | Keep authentication as mock flows; retain proposed status until reviewed.                                        | No real session/auth security exists.                            |
| No remote, no commits, 96 untracked files reported           | Inspect branch/status, preserve existing work, check secrets and establish reviewable commits where appropriate. | Do not assume tree is clean or backed up.                        |
| Remote CI not run                                            | Document repeatable local checks and later CI verification.                                                      | Do not claim remote CI passed.                                   |
| Storage provider, UK residency, backup guarantees unresolved | Keep data local/mock; avoid provider-specific coupling.                                                          | No hosting/compliance decision.                                  |
| Device/background upload and widgets unresolved              | Prototype only; track real-device validation for later.                                                          | OS behavior is not proven.                                       |
| Steven Universe rights unresolved                            | Keep art replaceable and licensing visible.                                                                      | Public release blocked until rights are cleared.                 |

## 3. Updated six-phase roadmap

| Phase | Name                                | Exit outcome                                                                                                                        |
| ----- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Product definition and feasibility  | Requirements, journeys, spikes, decisions and risks documented; unresolved items remain visible.                                    |
| 2     | Complete mobile UI + mock prototype | Every planned screen/state works on local mock data; no backend or external delivery.                                               |
| 3     | Prototype review and design freeze  | Actual journeys reviewed; visuals, copy, interactions and accessibility baseline approved.                                          |
| 4     | Secure backend foundation           | Identity, pairing, ownership, authorization, privacy lifecycle, storage, API contracts and security tests.                          |
| 5     | Connect real features               | Replace mock adapters incrementally for daily connection, chat, memories, Open When, notifications, email, media, widgets and sync. |
| 6     | Release hardening and maintenance   | Real-device QA, security/privacy, accessibility, performance, backups, monitoring, licensing and release gates.                     |

This supersedes the earlier plan that put backend and authentication in Phase 2. Phase numbering does not mean the full product is ready after Phase 2.

## 4. Scope boundary

### In scope

- Every screen in the Master Mobile Design Specification: onboarding/account/pairing, Home, Days, emotional actions, chat, Open When, Memories, Events, Surprises, Future Plans, Our World, profile/settings and account screens.
- Reusable navigation, design tokens, typography, spacing, icons, shared components, platform behavior and animation rules.
- Mock form submissions, auth/pairing states, simulated sends/uploads, notification settings, email previews, local success/failure feedback.
- Loading, empty, populated, offline, retry, validation, permission-denied, locked/deleted content and confirmation states.
- Mock notification center and email previews; no real push or email delivery.
- Typed fixtures, mock repositories, deterministic demo state, reset/reseed, automated tests and developer documentation.

### Out of scope

- Production auth, password hashing, verification tokens, OAuth, API, database, migrations, jobs or cloud functions.
- Real push/email, external invitation links, media uploads/transcoding, cloud storage and cross-device sync.
- Claims of encryption, server authorization, secure private storage, data residency or production compliance.
- Public app-store distribution with copyrighted Steven Universe assets without required rights.
- Unapproved features or heavy dependencies added merely to make the prototype appear complete.

## 5. Recommended architecture and code standards

| Layer           | Responsibility                                                                       | Rule                                                                      |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| App shell       | Startup, providers, navigation, theme, safe areas, error boundary.                   | No business logic buried in navigation declarations.                      |
| Feature screens | Page composition and journeys.                                                       | Use typed hooks/use-cases; do not import fixture arrays directly into UI. |
| Shared UI       | Buttons, fields, cards, sheets, dialogs, banners, skeletons, empty/error states.     | Consistent variants and accessible behavior.                              |
| Domain          | Types, schemas, state transitions, date/time formatters and rules.                   | Keep pure logic independent of React Native where practical.              |
| Repositories    | Typed interfaces for profiles, days, chat, memories, Open When, events and settings. | Screens depend on interfaces, not storage implementations.                |
| Mock services   | Deterministic simulated latency/errors and local state.                              | No network calls; no fake security claims.                                |
| Fixtures/tests  | Fictional stable demo data; unit, component and journey tests.                       | No real private data; test observable behavior.                           |

### Suggested folder shape

src/ app/ (navigation, providers, config, error-boundary) features/ (onboarding, authentication, pairing, home, days, emotional-support, chat, open-when, memories, events, surprises, future-plans, shared-world, settings, notifications, email-previews) components/ (ui, feedback, forms, media, character-scenes) domain/ (models, schemas, rules, formatters) data/ (fixtures, repositories, mock, persistence) hooks/ theme/ assets/ test/

- Use one routing approach compatible with the current repository; do not mix navigation libraries without a documented reason.
- Use strict TypeScript; avoid `any`, unchecked casts, non-null assertions and duplicated domain shapes.
- Keep components small and purposeful; centralize tokens and validation; handle caught errors as `unknown`.
- Use stable IDs and deterministic fixtures; never generate random demo entities during every render.
- Hide persistence behind an adapter and support reset/reseed. Never store real passwords or tokens in demo storage.
- Check Expo SDK and lockfile compatibility before adding dependencies; avoid unnecessary packages.
- Preserve unknown work; inspect git status, secrets, scripts, dependency versions and current tests before editing.

## 6. Mock behavior contract

| Feature        | Required simulation                                                               | Boundary                                              |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Account flows  | Validation; pending, success, invalid input, expired link, failure and retry.     | No real credentials/email.                            |
| Pairing        | Create/copy preview; pending, accepted, expired, revoked and already-paired.      | No working external invite link.                      |
| Chat           | Local sends, timestamps, failures/retry and approved edit/delete/reaction states. | No false delivery/read claims.                        |
| Days           | Create/edit/delete entries, day reveal, timeline filters and media placeholders.  | No upload/sync.                                       |
| Open When      | Envelope/prompt, sealed/open states, reveal animation and demo notice.            | No hidden body/attachment in previews before opening. |
| Memories/media | Mock picker, progress, preview, failure/retry, collection and delete.             | No real upload.                                       |
| Notifications  | In-app previews; preferences affect previews immediately.                         | No OS push.                                           |
| Emails         | Mobile/desktop, plain-text, images-blocked and expired-link previews.             | No sending or real tokens.                            |
| Widgets        | In-app sizes/states and confirmation previews.                                    | Not a real widget.                                    |
| Offline        | Developer toggle; cached demo, pending state and retry.                           | No claim of real sync.                                |
| Delete/unpair  | Explanation, confirmation and local UI update.                                    | No claim of server/partner-device deletion.           |

## 7. Security-minded UI requirements

- Define visibility rules for private drafts, shared items, envelope metadata, sealed body/attachments, deleted content and account-only settings.
- Model Open When with explicit `sealed → opening → opened` state. Only opened state may render body/attachments.
- Test every alternate entry point—search, notification preview, recent list, route params and accessibility labels—for sealed-content leaks.
- Never put hidden letter bodies in notifications, logs, analytics-like events, route parameters or accessibility labels while sealed.
- Use fictional fixture identities. Logged-out/unpaired states must not display paired-space content.
- Destructive actions need clear scope, cancel and accurately named confirmation. Default notification previews to generic text.
- Do not describe frontend hiding as authorization, encryption or secure storage. Later backend must enforce access and pass negative tests.

## 8. Complete screen inventory

### Onboarding & account

Welcome; create account; sign in; verify email; forgot/reset password; create/join relationship; pairing confirmation; relationship setup; identity/theme; character preview; important dates; prepare Open When; add memories; configure reveal/notifications; start long-distance confirmation.

### Home & emotional actions

Home; quick log; I Thought of You; Missing You; I Need You; mode selector; I Need to Talk; Please Check On Me; I Can’t Talk Yet; I’m Okay Now; emotional event detail.

### Days

Days overview; My Day; Partner’s Day; day reveal; entry detail; add/edit entry; timeline and filtering.

### Chat

Conversation list/detail; composer; media mock sheet; approved reply/reaction/edit/delete states; send failure/retry; planned search state if specified.

### Open When

Library; create; envelope/detail; locked state; reveal/opening; opened letter and attachments; unavailable/empty states.

### Memories

Library; detail; create/edit; collection/chapter; timeline/chapter detail; delete/move confirmations.

### Events & surprises

Calendar/list; event detail; birthday; anniversary; monthly chapter; custom event create/edit; surprise library; create; scheduled/locked surprise; reveal.

### Future plans & Our World

When We Meet Again; add/detail/complete plan; Our World; shared crystal/world; soundtrack; places.

### Settings & cross-cutting

Profile; identity/theme; privacy; notification settings/preview; quiet hours; preview privacy; reminder intensity; account/security; export/delete/unpair explanations; help/about; demo reset; dialogs; sheets; menus; toasts; banners; loading/empty/error/offline; permission denied; notification center; email previews in every specified format.

The Master Mobile Design Specification remains the page-level source of truth for layouts, copy, interactions, popups, notifications and email templates. Reconcile this list with its numbered inventory before declaring coverage complete; anything in that document remains in scope.

## 9. Required state coverage

| State                    | Expected behavior                                                   |
| ------------------------ | ------------------------------------------------------------------- |
| Loading                  | Skeleton or lightweight progress; no indefinite spinner.            |
| Success/populated        | Correct hierarchy, safe areas and working actions.                  |
| Empty                    | Explain what belongs here and offer a next action without guilt.    |
| Validation error         | Specific accessible inline errors; retain valid input.              |
| Operation failure        | Plain language, preserved input and retry/safe exit.                |
| Offline                  | Explicit simulated status; no false delivery/sync claim.            |
| Locked/sealed            | Only allowed envelope metadata; no hidden body preview.             |
| Permission denied        | Explain alternatives and how to enable later; no silent OS changes. |
| Destructive confirmation | Explain scope; cancel and precise confirm action.                   |
| Keyboard/small screen    | Scrollable and keyboard-safe forms; safe areas.                     |
| Reduced motion           | No essential meaning depends on animation.                          |

## 10. Mobile-quality requirements

- Build shared primitives for Screen, Header, TabBar, Button, IconButton, TextField, TextArea, Toggle, Select, Card, Avatar, CharacterScene, MediaTile, ListRow, Dialog, BottomSheet, Toast, Banner, Skeleton, EmptyState, ErrorState and ConfirmAction.
- Support safe areas, system bars, keyboard appearance, scroll-to-focused-input, Android hardware back, iOS dismissal conventions and clear modal dismissal rules.
- Use virtualized lists for long timelines/chat; avoid unnecessary nested virtualized lists.
- Respect font scaling, screen readers, touch targets, focus order and visible pressed/disabled states; important actions cannot rely on emoji alone.
- Keep animation purposeful and short, honor reduced motion and never delay essential actions for decoration.
- Use image aspect ratios and loading/error fallbacks; keep character art replaceable. Validate on real Android/iOS devices during later hardening.

## 11. Test strategy and gates

| Test level         | Coverage / pass condition                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Baseline           | Rerun actual repository checks before edits; record commands/results and separate pre-existing failures.             |
| Unit               | Date/time formatting, mock transitions, schemas, sealed/open rules, deletion confirmation and boundaries.            |
| Component          | Forms, buttons, sheets, dialogs, feedback, accessibility labels and disabled states.                                 |
| Journey            | Sign-in mock → pairing → setup → Home; day entry; emotional signal; letter; memory; event/surprise; settings; reset. |
| Privacy regression | Sealed body absent from list/detail/search/notification/route/log/accessibility surfaces until opened.               |
| Platform           | Android back, iOS modal/back, safe areas, keyboard, scrolling, text scaling, reduced motion.                         |
| Static/build       | Type check, lint/format, tests, dependency audit where available, supported builds.                                  |
| Manual             | Small/large screens; populated/empty/error/offline; slow mock operations; restart/reset demo.                        |

The 100 reported tests and 22/22 media spike checks are Phase 1 evidence only. Inspect package scripts rather than inventing commands. Investigate the one missed mutation before claiming mutation coverage is complete.

## 12. Implementation order

1. Audit branch/status/untracked files, package manager, Expo SDK, scripts, dependencies, tests, secrets and entry points. Preserve unknown work.
1. Verify app starts on iOS/Android targets; configure type/lint/test commands, navigation, providers, error boundary, safe areas and demo mode.
1. Implement design tokens and shared UI primitives.
1. Implement domain types, deterministic fixtures, repository interfaces, mock adapters, optional persistence and reset/reseed.
1. Build onboarding/account/pairing and all success/failure/expired/unpaired states.
1. Build Home, Days, entries, reveal and timeline.
1. Build emotional actions and simulated feedback/notification previews.
1. Build chat with local state and failure/retry.
1. Build Open When early and add privacy regression tests across all surfaces.
1. Build Memories, Events, Surprises, Future Plans and Our World.
1. Build settings, notification/email previews and global dialogs/sheets/error/empty/offline states.
1. Run all journeys on iOS and Android; fix consistency and accessibility defects.
1. Review with both users, record changes, approve full inventory and freeze design before backend planning.

## 13. Definition of done

- Every screen and cross-cutting surface in the Master Mobile Design Specification is accounted for and implemented.
- Every primary button, menu, sheet, dialog and form performs a local/mock action; no inert controls masquerade as functional.
- Applicable loading, empty, success, error, offline, locked, permission-denied and confirmation states are covered.
- All data comes through mock repositories/fixtures; no backend/API requests are made.
- Demo state is deterministic, persistence is intentional, and Reset Demo Data works.
- Open When body/attachments stay hidden until reveal; regression tests cover alternate routes/previews.
- No real push or email is sent. iOS/Android navigation, keyboard, safe areas and back behavior are checked.
- Type checks, lint/format and tests pass or exceptions are documented with reason and owner.
- Shared design tokens/components are used; no blocking accessibility defects remain.
- Known limitations and unresolved decisions are documented. Both users review and approve the running prototype.

## 14. Open decisions and blockers to preserve

| Item                                                    | Handling in UI phase                                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Europe/London reference zone; shared day in local zones | Preserve direction; exact cutoff unresolved. Make configurable in demo or label provisional.                                                         |
| Grace day                                               | One shared grace day per rolling seven-day period was recorded; replenishment/edge cases remain open. Avoid guilt and unapproved final calculations. |
| Steven Universe characters                              | Keep assets modular and rights visible; public distribution blocked pending clearance.                                                               |
| Hosting/storage/residency/backups                       | Do not choose or imply completion during UI work.                                                                                                    |
| Open When authorization                                 | Real backend blocker; UI tests do not replace server authorization and negative tests.                                                               |
| Deletion/unpair/account lifecycle                       | Prototype explanations only; backend retention/export/deletion semantics need approval.                                                              |
| Emotional signals/notifications                         | Simulate only; independent controls, generic previews, quiet hours and no automatic escalation.                                                      |
| Widgets/background behavior                             | In-app preview only until native feasibility is tested.                                                                                              |
| Calls/AI search                                         | Not implemented in this phase except clearly labelled future states already specified.                                                               |

## 15. Design review and freeze

1. Review complete journeys on a running device, not screenshots alone.
1. Record feedback with screen, state, expected/actual behavior, priority and acceptance condition.
1. Separate required fixes from new features; scope additions require explicit approval.
1. Review confirmations and sensitive previews for privacy implications.
1. Ensure empty states/reminders never shame either partner or infer meaning from non-response.
1. Approve copy, navigation, inventory, interactions, accessibility baseline and character-art placement.
1. Publish versioned design freeze and Phase 3 backend/security-contract backlog.

## 16. Final recommendation

Proceed with Phase 2 as a complete mobile UI implementation using React Native + Expo + TypeScript and a strictly local mock repository layer. Build it as if the real product will grow from this codebase: strong types, reusable components, clean state boundaries, predictable navigation, meaningful tests and security-aware UI rules. Do not begin backend until the prototype is complete, reviewed and frozen.

Success is a polished, coherent mobile prototype usable end-to-end, where controls behave plausibly, edge states are designed, simulated actions are clearly simulated, and UI-only behavior is never mistaken for real security.

## Source documents used

- Garnet_Phase_1_Scope_and_Decisions.docx — product decisions, unresolved items and exit criteria.
- Garnet_Phase_2_Detailed_Plan.docx — earlier secure-foundation plan being superseded.
- Garnet_Master_Mobile_Design_Specification.docx — screen inventory, layouts, interactions, notifications, email previews and mock behavior.
- Phase 1 closeout details available in project context: reported local checks, media spike, mutation gap, Open When finding, ADR status and repository/CI limitations.
