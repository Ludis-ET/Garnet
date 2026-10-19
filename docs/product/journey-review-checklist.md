# Journey review checklist (owner)

For the owner's final review of the seven core journeys ([journeys.md](./journeys.md)), required by §16 criterion 2. **Nothing here is ticked on the owner's behalf.** Tick a box only when you agree. If you disagree, note the change and the decision ID it affects.

Each journey lists what to confirm, where the behaviour is specified, and the open questions that stay open by design. The decision owner for every open question is the product owner; the milestone is the backlog item it blocks.

## Owner review record

| Journey                    | Owner review                                               |
| -------------------------- | ---------------------------------------------------------- |
| J1 — Account and pairing   | [x] Approved as the current product direction (2026-10-19) |
| J2 — Start Long Distance   | [x] Approved as the current product direction (2026-10-19) |
| J3 — Log or share a moment | [x] Approved as the current product direction (2026-10-19) |
| J4 — Send a signal         | [x] Approved as the current product direction (2026-10-19) |
| J5 — Recap                 | [x] Approved as the current product direction (2026-10-19) |
| J6 — Open When             | [x] Approved as the current product direction (2026-10-19) |
| J7 — Export and deletion   | [x] Approved as the current product direction (2026-10-19) |

**Scope of this approval.** The owner stated that they reviewed and approved J1–J7, as written in [journeys.md](./journeys.md), as the current product direction. This records **journey-level** approval only:

- No screens, wireframes or prototype were reviewed; none exist yet. Wireframes are the Phase 2 UI gate B-04.
- No specific feedback was given or recorded.
- It does **not** accept any D- or P- item referenced below; each keeps its status in the [decision log](../decisions/decision-log.md).
- It does **not** close any open question (U-xx), and the known gaps below (e.g. Open When body enforcement) remain.

The item-level boxes below were not individually confirmed, and are left unticked rather than ticked on the owner's behalf.

## J1 — Account and pairing

- [ ] Sign-up → verify email → invite → partner accepts → paired, as drawn. ([journeys.md](./journeys.md), D-09 method: email/password with verification and reset)
- [ ] Invitations are single-use and short-lived, and every invalid case shows the same message. (P-18, Proposed)
- [ ] A person already in an active relationship cannot accept another invitation. (Database-level evidence, F-05)
- Open: invitation delivery and lifecycle **U-33** (B-21) · re-pairing **U-32** (B-21/B-101) · ADR-0006 policies (Proposed).

## J2 — Start Long Distance

- [ ] Each partner confirms their own time zone; the shared-day boundary is shown in each person's own time. ([shared-day-and-time.md](../features/shared-day-and-time.md))
- [ ] Notification permission denied still leaves a usable app. ([states.md](../ux/states.md))
- [ ] Spark is visible by default and can be hidden at any time without loss. (P-24)
- Open: cutoff hour **U-02** (B-60) · quiet-hours default **U-21** (B-52) · Ethiopian calendar/clock **U-17** · which device's zone sets quiet hours **U-28**.

## J3 — Log or share a moment

- [ ] New entries autosave as **private drafts**; sharing is always explicit; the widget never shares without review. (§2, §6, P-19)
- [ ] Offline writing works; sending retries automatically; deletions by the partner remove the item ("This moment was removed"). (Simulation evidence, F-04)
- [ ] A shared entry cannot be made private again; deletion is the way to withdraw it. (P-20)
- [ ] Conflicting edits on two devices keep both texts, the losing one as a private copy. (P-15; multiple devices planned, P-36)
- [ ] Media uploads run in the background and resume. (Server side: F-07; phone side: **B-43, not verified**)
- Open: timestamp editing **U-11** (B-34) · who edits shared entries before reveal **U-18** · media limits **U-08** (B-40) · multi-device details **U-27/U-28**.

## J4 — Send a signal

- [ ] Eight signals; levels gentle/support as proposed. (P-07)
- [ ] The recipient's quiet hours and preview settings apply; no Do Not Disturb bypass is promised. (§5, P-23)
- [ ] No "seen", read receipts, reminders or escalation for non-response; the sender sees "Sent". (§5)
- [ ] Lock-screen previews are generic and identical for both levels. (P-17; domain-level evidence only, OS rendering unverified)
- Open: late-delivered offline signals **U-30** (B-51) · retention and delivery wording **U-09** (B-52).

## J5 — Recap

- [ ] Shared moments appear during the day; the recap becomes available when both are ready or at the cutoff. (§4)
- [ ] Waiting for the other partner is shown neutrally, without nagging. (§2)
- [ ] Revealed entries are read-only; deletion is still possible. (Database-level evidence, F-05)
- Open: reveal defaults and deleted items **U-06** (B-62) · withdrawing "ready" **U-29** (B-62) · late offline entries **U-05** (B-60).

## J6 — Open When

- [ ] Draft (author only) → sealed → opened; opening is private unless the recipient opts in to tell the author. (P-22)
- [ ] **Known gap:** the database alone lets the recipient read a sealed letter's body before opening. Enforcement at the API or data-access layer is **not verified**; a characterization test pins the gap (F-05).
- Open: attachments **U-08** · who may delete letters **U-31** (B-90).

## J7 — Export and deletion

- [ ] Three separate actions: delete a shared memory (either partner, D-11), end pairing, delete my account.
- [ ] Export never contains the partner's private drafts. (§11; enforced by running export under RLS, specified)
- [ ] Direction for ending a relationship or deleting an account: ask during the flow; the remaining partner may export first; by default the departing partner's entries are removed. (P-37, proposal)
- [ ] Deletion cannot erase copies outside Garnet, and the app says so. (§11)
- Open: export window and edge cases **U-20** · deletion grace period **U-23** · revocation on every device **U-27** · who deleted, shown or not **U-16**.

## Across all journeys

- [ ] Privacy-first defaults hold everywhere: drafts private, sharing explicit, generic previews, neutral widget. (§2)
- [ ] No guilt, blame, scores or "seen" language. ([voice-and-copy.md](../ux/voice-and-copy.md))
- [ ] Accessibility and reduced motion in every state, including widget and characters. ([states.md](../ux/states.md), [art-brief.md](../characters/art-brief.md))
- [ ] Shared Spark: grace preserves, never grows, never blames; outages don't consume grace. (D-14 to D-17, P-13). Open: **U-03** (grace timing), **U-04**, **U-12**, **U-24**.
- [ ] Widget: two actions only, neutral content, "Updated <time>" when stale. ([widget.md](../features/widget.md)). Platform limits unverified (F-01 deferred to B-11).
- [ ] Characters: the actual Ruby, Sapphire and Garnet (P-30). Rights and distribution **unresolved (U-10)**; working icon undecided (U-25).

**Sign-off:** J1–J7 approved by the owner as the current product direction on 2026-10-19 (journey level; see the owner review record above). Changes requested: none recorded.
