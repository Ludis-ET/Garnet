# ADR-0002: Time handling — UTC instants, named zones, Temporal API

- **Status:** **Planning baseline** (owner direction, 2026-10-18): the working direction for Phase 2 planning. **Not Accepted**; implementation not verified (see Consequences for the evidence level).
- **Date:** 2026-10-18
- **Decision IDs:** D-12, D-13, P-02, P-03; open: U-02, U-05, U-11, U-13, U-14, U-17

## Context

The partners live in **Ethiopia (Africa/Addis_Ababa, UTC+3, no DST)** and **the UK (Europe/London, GMT/BST)**. Their offset gap switches between 3 h and 2 h twice a year. §4 requires UTC storage with local display; §8 requires one shared day in a named reference zone with a configurable cutoff, computed by the server, and forbids fixed offsets.

## Decision

1. **Storage:** every event time is a UTC instant (`timestamptz`). Entries also keep the author's IANA zone at the time (`occurred_time_zone`) for faithful display, and the server receipt time (`received_at`) for clock-skew checks (U-14).
2. **Computation:** all date/time logic uses the **Temporal API** via `temporal-polyfill` (Hermes and Node 24 have no native Temporal). Domain code never does `Date` arithmetic or offset math.
3. **Shared day** (implemented in [`shared-day.ts`](../../../packages/domain/src/time/shared-day.ts)):
   - Labelled by the reference-zone date on which it begins (P-03).
   - Cutoff in a DST gap → the day begins at the transition; cutoff in an overlap → first occurrence. Assignment is therefore total and monotonic.
   - Config rejects fixed-offset zones (`+01:00`, `Etc/GMT-3`).
   - No default cutoff is exported (U-02).
4. **Display:** clients format with the device locale and zone (`Intl`). Calendar systems (U-17) are a localization decision.

## Options considered

| Option                     | Pros                                                 | Cons                                               |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Temporal polyfill (chosen) | Standard API; explicit disambiguation; future-native | Bundle size (polyfill) on device                   |
| Luxon                      | Mature, small, Intl-based                            | Non-standard API; ambiguity handling less explicit |
| date-fns-tz                | Tree-shakeable                                       | Zone handling bolted onto `Date`; easy to misuse   |
| Fixed offsets              | Trivial                                              | Wrong twice a year; forbidden by §8                |

## Consequences

- Evidence: [F-06](../../feasibility/F-06-timezone-dst.md): 28 tests, 4 of them property-based (thousands of random instants and cutoffs, 2020–2040), including the 2026 and 2027 transitions and Addis Ababa display. Run in Node only; behaviour on Hermes (on the phone) is unverified.
- **Finding for U-02:** a cutoff between 01:00 and 01:59 London makes the two shared days around spring-forward 23.5 h each. Recommend choosing a cutoff outside that hour.
- When Hermes ships Temporal, drop the polyfill without API changes.
