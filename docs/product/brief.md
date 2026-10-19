# Product brief

> "I can't be there with you right now, but I can still be part of your day."

## What Garnet is

A private mobile app for **exactly two partners** living apart, here one in Ethiopia and one in the UK. It makes everyday connection easier: sharing small moments as they happen, asking for support when it matters, and celebrating connection without turning the relationship into a score.

The visual metaphor is **Ruby ❤️ + Sapphire 💙 → Garnet 💜**: two people who make something together. The experience should feel personal, playful, affectionate and alive.

## Who it is for

| Person              | Context                            | What they need                                              |
| ------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Partner in Ethiopia | Africa/Addis_Ababa, UTC+3 all year | Feel present in the other's day despite a 2–3 h difference. |
| Partner in the UK   | Europe/London, GMT/BST             | Share quickly; ask for support without pressure or guilt.   |

Both are equal owners of the relationship space. Neither is an "admin".

## Principles (§2) as product rules

| Principle               | What it means in practice                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Exactly two             | One private relationship per account; invitations are single-use and short-lived.                                           |
| Connection, not metrics | No relationship-health scores, rankings, response-time stats or read receipts. Spark celebrates; it never measures.         |
| Privacy first           | Drafts are private until shared. Lock-screen previews are generic by default. Each person controls their own notifications. |
| Kind by design          | No guilt prompts, no sad or angry characters, no blame when a day is missed.                                                |
| Forgiving               | Autosave, offline drafts, retry-safe sync, background uploads. Nothing typed is ever silently lost.                         |
| Accessible              | Contrast, screen-reader labels, status never conveyed by colour alone, reduced motion respected.                            |
| No exploitation         | No ads, no sale of data, no unrelated use of private content.                                                               |

## First-release target (§3)

Ordered by dependency. This is a target; stage delivery by reliability and do not ship unstable features (§3).

| #   | Feature            | Release intent                                                           | Depends on                   |
| --- | ------------------ | ------------------------------------------------------------------------ | ---------------------------- |
| 1   | Accounts & pairing | Two accounts, one private relationship                                   | —                            |
| 2   | Day Log            | Continuous timeline; private drafts; explicit sharing; timestamps; media | 1, sync, media               |
| 3   | Offline            | Private text drafts; retry-safe sync                                     | 1                            |
| 4   | Connection signals | 8 signals, 2 notification levels, preset responses                       | 1, notifications             |
| 5   | Notifications      | Gentle vs support; quiet hours; generic previews; per-person preferences | 1                            |
| 6   | Recap              | Today's shared moments, revealed when both are ready or at cutoff        | 2, shared day (U-02, U-06)   |
| 7   | Shared Spark       | Growing crystal; grace; milestones; hide/mute                            | 2, 4, shared day (U-02–U-05) |
| 8   | Widget             | Adaptive Garnet Nudge; Add a Moment; Open Today's Recap                  | 2, 6, F-01 results, U-01     |
| 9   | Open When          | Letters, text first                                                      | 1                            |
| 10  | Characters         | Ruby, Sapphire, Garnet; 3D-first with lightweight fallbacks              | U-10 rights, F-02            |

## Explicit exclusions

**Not in Phase 1 (§17):** production auth backend or all screens; complete Day Log, memories, events or Open When systems; a full 3D library or figure manufacturing; every notification type or the complete shared world; app-store release; two separate native clients before platform feasibility is known.

**Not in the product at all (§2, §5, §7):** ads; data sales; health scores; rankings; streak guilt; read receipts or "seen" pressure; automatic escalation when someone doesn't reply; any claim that an alert was seen unless that is genuinely known; character reactions that are sad, angry or abandoned.

## Success looks like

Qualitative, never surveillance: both partners say Garnet makes them feel part of each other's day, and neither feels pressured by it. Product analytics must not collect relationship content, and must not compute per-partner engagement comparisons.

## Open questions that shape the product

U-01 (devices), U-02 (shared-day cutoff), U-03/U-04 (Spark grace), U-06 (recap reveal), U-10 (character rights), U-20 (memories after account deletion). Full list: [decision-log.md](../decisions/decision-log.md).
