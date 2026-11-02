# Phase 2 design

Phase 2 is the **complete mobile design and mock prototype**: every screen and state, on local mock data only, with no backend, real auth, push, email or sync (owner direction **P-39**, from the two owner specifications below).

| Document                                                                                | What it is                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [phase-2-plan.md](./phase-2-plan.md)                                                    | Transcription of `Garnet_Master_Mobile_Design_Specification.docx`: the Phase 2 plan (scope, architecture, mock contract, test strategy, definition of done)                      |
| [master-mobile-design-specification.md](./master-mobile-design-specification.md)        | Transcription of `Garnet_Master_Mobile_Design_Specification (1).docx`: the full product and screen specification (§1–73, appendices A1–A15) — **the page-level source of truth** |
| [prompts/](./prompts/README.md)                                                         | Design prompts for every page, state, overlay, notification, email and widget, with the master style and 3D/figure art direction                                                 |
| [figures.md](./figures.md) · [gemini-character-prompt.md](./gemini-character-prompt.md) | How the app shows Ruby, Sapphire and Garnet (P-45), and the prompt for generating every character image                                                                          |

## Workflow: design → approve → implement, one page at a time

1. **Design** a page in your tool using its prompt (`prompts/…`), covering every listed state.
2. **Approve** it and share the frames with its page ID (e.g. `HOME-01`).
3. **Implement** it in [`apps/mobile`](../../apps/mobile/) exactly as designed, with tests, through mock repositories. Backlog gate **B-04** means no page is coded before its design exists.
4. **Review** the running prototype on a device; record changes by page ID and state.
5. When every page is implemented and both partners approve, Phase 3 (design freeze) begins.

## Route map (planned)

| Group              | Routes                                                                          | Prompts                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `(auth)`           | welcome, create-account, sign-in, verify-email, forgot-password, reset-password | [01](./prompts/01-welcome-and-account.md)                                                                                    |
| `(onboarding)`     | pair, pair/invite, pair/join, pair/review, pair/connected, pair/already, setup  | [02](./prompts/02-pairing.md), [03](./prompts/03-identity-and-setup.md)                                                      |
| `(tabs)/home`      | home                                                                            | [05](./prompts/05-home.md)                                                                                                   |
| `(tabs)/days`      | days, days/[date], days/entry/[id], days/new                                    | [06](./prompts/06-days-and-logging.md)                                                                                       |
| `(tabs)/us`        | us, us/history, us/chat, us/chat-details                                        | [07](./prompts/07-us-emotional.md), [08](./prompts/08-chat.md)                                                               |
| `(tabs)/moments`   | moments, moments/event/[id], moments/event-new, moments/open-when/*             | [09](./prompts/09-open-when.md), [11](./prompts/11-events-and-chapters.md), [12](./prompts/12-surprises.md)                  |
| `(tabs)/our-world` | our-world, memory/[id], memory-new, collection/[id], chapters, chapter/[month]  | [10](./prompts/10-memories.md), [13](./prompts/13-future-and-our-world.md)                                                   |
| root               | search, settings/_, notifications, preview-lab/_                                | [14](./prompts/14-search.md), [15](./prompts/15-settings-and-account.md), [17](./prompts/17-notifications-emails-widgets.md) |

Chat lives under **Us**: the spec's five tabs are Home, Days, Us, Moments and Our World, and its A1 inventory includes chat. This placement is a design proposal; confirm it when designing US-01.

## Reconciliation notes

- **Mutation evidence.** The Phase 2 plan says "one of 30 deliberate mutation breaks was missed". That was observed mid-session on 2026-10-19 and then fixed with deterministic regression tests: the final runs show **30 of 30 mutants behaving as expected** ([F-04](../feasibility/F-04-offline-sync.md)).
- **Read receipts (U-35).** Phase 1 rules (§5) say "no read-receipt pressure", and `AGENTS.md` lists read receipts among things never to build. The spec (A1, A13) asks for read-receipt settings with "flexible per-person controls agreed". The prompts design receipts **off by default** with both setting states; the final rule is open.
- **Characters.** The spec allows original characters only as a fallback if licensing is unavailable; the current owner direction is the actual characters (**P-30**), with rights unresolved (**U-10**) and the prototype internal only.
- **Calls.** The spec lists Call / Video call actions on "I Need You" but says not to promise calls in the mock (A13). The prompts omit working call buttons.
