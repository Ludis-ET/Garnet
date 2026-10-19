# Shared day and time

Spec for §8 / D-12, D-13. Implementation: [`packages/domain/src/time/shared-day.ts`](../../packages/domain/src/time/shared-day.ts). Evidence: [F-06](../feasibility/F-06-timezone-dst.md). Rationale: [ADR-0002](../decisions/adr/0002-time-handling.md).

## Rules

| #   | Rule                                                                                                                   | Status          |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | All event times are stored as UTC instants; each viewer sees them in their own zone.                                   | §4              |
| 2   | One shared connection day per relationship, defined in a **reference zone** with a **cutoff** wall-clock time.         | D-12            |
| 3   | Reference zone: `Europe/London`. Named-zone rules only; fixed offsets are rejected.                                    | D-13 (Proposed) |
| 4   | Cutoff time.                                                                                                           | **U-02**        |
| 5   | The server assigns instants to shared days. Clients may preview but never decide.                                      | §8              |
| 6   | Day cutoff, recap reveal and grace rules are independent settings.                                                     | §8              |
| 7   | A shared day is labelled by the reference-zone date it begins on.                                                      | P-03            |
| 8   | Cutoff in a DST gap → the day begins at the transition. Cutoff in an overlap → the first occurrence.                   | P-03            |
| 9   | Cutoff changes take effect from the next shared day; past days are never re-assigned.                                  | U-13 (proposal) |
| 10  | Late offline entries keep their real `occurred_at`; whether they count for a finalized day depends on the late window. | **U-05**        |

## What the partners see

With a 04:00 London cutoff (example only; U-02 is open):

| Period             | London (partner B)      | Addis Ababa (partner A) | Gap |
| ------------------ | ----------------------- | ----------------------- | --- |
| Winter (GMT)       | Shared day starts 04:00 | starts 07:00            | 3 h |
| Summer (BST)       | Shared day starts 04:00 | starts 06:00            | 2 h |
| Spring-forward day | 23-hour shared day      | 23-hour shared day      | —   |
| Fall-back day      | 25-hour shared day      | 25-hour shared day      | —   |

The app always phrases the boundary in the viewer's own time: _"Today's shared day ends at 07:00 for you."_

## Choosing the cutoff (input to U-02)

- Any cutoff works technically. **Avoid 01:00–01:59 London**: around spring-forward it produces two 23.5-hour days (F-06).
- An early-morning cutoff (e.g. 03:00–05:00 London = 06:00–08:00 Addis in winter) means late-night moments still count as "today" for both.
- An evening cutoff (e.g. 21:00) makes the date label start "yesterday" from one partner's point of view. If chosen, the label convention (P-03) should be revisited.

## Data

`relationship.reference_time_zone`, `relationship.day_cutoff` (NULL until U-02 is decided; features depending on it stay disabled), `entry.occurred_at`, `entry.occurred_time_zone`, `entry.received_at`, `entry.shared_day` (set by the server at share time).

## Localization (U-17)

Times use the device locale through `Intl`. Ethiopia commonly uses the Ethiopian calendar and a 12-hour clock counted from dawn. `Intl` supports `calendar: "ethiopic"` but not the Ethiopian hour count. Whether to support either is a product question for the Ethiopia-based partner.
