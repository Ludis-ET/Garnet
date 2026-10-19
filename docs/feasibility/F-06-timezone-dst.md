# F-06 — Ethiopia ↔ London time zones and DST

**Result: ✅ Proven at the domain level, in Node only.** Behaviour on Hermes, the phone's JavaScript engine, is **unverified**. Code: [`packages/domain/src/time/shared-day.ts`](../../packages/domain/src/time/shared-day.ts). Tests: [`shared-day.test.ts`](../../packages/domain/src/time/shared-day.test.ts) — 28 tests, 4 of them property-based (thousands of random instants and cutoffs per run, 2020–2040).

## Question

Can one shared day, defined in Europe/London with a configurable cutoff, be assigned correctly and displayed in both partners' zones across GMT/BST changes, without fixed offsets?

## What was verified

| Case                                                                                                                                        | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Winter (GMT) and summer (BST) boundaries, for several cutoffs                                                                               | ✅     |
| 2026 spring-forward (29 Mar) → 23 h shared day; fall-back (25 Oct) → 25 h                                                                   | ✅     |
| 2027 transitions with no code change (no hard-coded offsets)                                                                                | ✅     |
| Cutoff inside the DST gap (01:30 on 29 Mar 2026) starts the day at the transition                                                           | ✅     |
| Cutoff inside the overlap (01:30 on 25 Oct 2026) uses the first occurrence; the second pass through 01:xx stays in the same day (monotonic) | ✅     |
| Addis Ababa is +03:00 all year                                                                                                              | ✅     |
| A 04:00 London cutoff = 07:00 Addis (winter), 06:00 Addis (summer)                                                                          | ✅     |
| A shared day can straddle two local dates for the Addis partner                                                                             | ✅     |
| Property: every instant lies in its assigned day's window                                                                                   | ✅     |
| Property: assignment is monotonic in time                                                                                                   | ✅     |
| Property: days are contiguous and 23–25 h long for any cutoff                                                                               | ✅     |
| Property: with a cutoff outside 01:00–01:59, days are exactly 23, 24 or 25 h                                                                | ✅     |
| Rejects fixed-offset zones (`+01:00`, `Etc/GMT-3`), unknown zones, invalid cutoffs                                                          | ✅     |

Mutation check (reproducible, `pnpm mutation --with-docker --runs 3`, run 2026-10-19): F06-1 (disambiguation `earlier` → `later`) and F06-2 (gap cutoff not moved to the transition) were both killed. Reproduce: `pnpm --filter @garnet/domain test` (part of `pnpm check`) and `pnpm mutation`.

## Findings

1. **For U-02:** a cutoff between 01:00 and 01:59 London splits the lost spring hour across two days (23.5 h + 23.5 h). It is correct but confusing. Recommend a cutoff outside that hour.
2. Days can be 23 or 25 hours long. Any "hours left today" UI must compute from the window, not assume 24.
3. The Temporal polyfill works in Node 24. **React Native/Hermes and on-device behaviour are not verified**; this is in the F-03 pass conditions (P-28) and the B-10 done criterion ("the F-06 tests pass on Hermes").

## Limitations

Display formatting (`Intl`) on Hermes and Ethiopian calendar support (U-17) were not exercised.
