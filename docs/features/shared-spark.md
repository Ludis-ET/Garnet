# Shared Spark

Spec for §7 / D-14 – D-17. Reference implementation (pure, tested): [`spark.ts`](../../packages/domain/src/spark/spark.ts), [`qualifying.ts`](../../packages/domain/src/spark/qualifying.ts).

**Purpose:** celebrate meaningful connection, never app usage or relationship quality.

## Model

Spark is **derived**, not stored as a counter. Each finalized shared day becomes one record:

| Day kind        | Meaning                                           | Who missed?               |
| --------------- | ------------------------------------------------- | ------------------------- |
| `connected`     | Both partners made at least one qualifying action | n/a                       |
| `not-connected` | At least one did not                              | **Never recorded** (P-09) |
| `excused`       | Service outage or other system fault (P-13)       | n/a                       |

Folding the records gives the current streak, best streak, grace availability and earned milestones. Late-sync corrections re-run the fold (policy: U-05).

## Qualifying actions (D-15)

| Counts                                         | Never counts                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Sharing a moment · sending a signal · replying | Opening the app · viewing the widget · receiving a notification · viewing a recap · **saving a private draft** (P-10) |

## Day transitions

| Day kind        | Streak > 0, grace available                  | Streak > 0, no grace   | Streak = 0              |
| --------------- | -------------------------------------------- | ---------------------- | ----------------------- |
| `connected`     | grow +1 (milestone check)                    | grow +1                | grow +1                 |
| `not-connected` | **graced**: preserved, not grown, grace used | U-04: `rest` or `hold` | idle (grace kept, P-08) |
| `excused`       | unchanged                                    | unchanged              | unchanged               |

- Grace activates automatically at finalization, with neutral status and no interruption (D-17).
- Grace never earns a milestone: it cannot grow the count (§7 Safety).
- Milestones: 3, 7, 14, 30, 50, 100, 365 days. Earned once, never lost (§7).

## Unresolved — both options implemented, owner chooses

| ID   | Question                                          | Option A                                                   | Option B                                                     |
| ---- | ------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| U-03 | When is grace available again after use on day D? | `rollingSevenDayWindow`: D + 7 (D-14 read literally)       | `sevenFullDaysAfterUse`: D + 8 (D-18 recommendation)         |
| U-04 | Not connected and no grace?                       | `rest`: streak ends; crystal rests; best + milestones kept | `hold`: streak held, not grown, until the next connected day |
| U-05 | Late-sync corrections                             | Recompute and allow a changed outcome                      | Recompute, but never downgrade an outcome already shown      |
| U-12 | Deleted items and history                         | Day records stand once finalized (natural default)         | Recompute without deleted items                              |

## Controls (§7)

- **Hide Spark:** removes it from Home and the widget for that person only. Nothing is lost. Whether milestones keep accruing invisibly or resume when Spark is shown again is open (**U-24**).
- **Mute Spark prompts:** no Spark notifications or nudges for that person.
- Either partner's choice never reveals itself to the other ("Your partner hid the Spark" is never shown) — P-24.

## Safety and copy

Never sad, angry or abandoned characters; no guilt; no relationship inference; never "X didn't share today". A rested Spark is shown as calm and ready to grow, not broken. Copy bank: [../ux/voice-and-copy.md](../ux/voice-and-copy.md#shared-spark).
