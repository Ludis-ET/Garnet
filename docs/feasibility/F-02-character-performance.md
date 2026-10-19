# F-02 — Character performance (3D vs pre-rendered)

**Result: ⛔ Blocked on U-01** (target devices) **and U-26** (asset sourcing and handling). **Deferred to Phase 2 backlog item B-110 (M11)** by owner direction P-33, which is not Accepted. The deferral is not evidence of success.

The final character experience is the actual Ruby, Sapphire and Garnet (P-30). Per P-31, F-02 may use **representative proxy assets** to measure performance. **Proxy results do not establish performance of the final Ruby, Sapphire and Garnet assets**; the final-asset requirement is not met until those assets are measured on the target devices.

## Hypothesis

A Home screen with one animated character meets the budgets below on the slowest target device, either with runtime 3D or pre-rendered animation, plus a static fallback.

## Budgets

Proposed acceptance budgets: **P-27** (not approved).

| Metric                                | Budget                          |
| ------------------------------------- | ------------------------------- |
| Home first meaningful paint (cold)    | ≤ 1.0 s                         |
| Animation frame rate                  | 60 fps target; ≥ 55 fps p95     |
| JS thread frame drops while scrolling | ≤ 1 % of frames                 |
| Initial character payload             | ≤ 2 MB; the rest lazy-loaded    |
| Memory added by the character         | ≤ 80 MB                         |
| Battery (5 min on Home)               | No more than 1.2× a static Home |

## Candidates

| Option                                   | Notes                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| Pre-rendered vector state machine (Rive) | Small files; interactive states; strong reduced-motion story |
| Lottie                                   | Mature; designer-friendly; less interactive                  |
| Sprite sheets rendered from 3D           | Exact 3D look; larger files; simple runtime                  |
| Runtime 3D: react-native-filament        | Native renderer, glTF; heavier integration                   |
| Runtime 3D: three.js via expo-gl / R3F   | Familiar; check performance on Hermes                        |

## Plan

1. A representative **proxy** model of comparable complexity (sourcing per U-26, safeguards per P-31) with idle and "moment shared" animations; export to glTF, Rive and a sprite sheet. Label every result as proxy-based.
2. A test screen per option in a development build; release builds only for measurement.
3. Measure with the platform profilers (Android GPU rendering / Perfetto, Xcode Instruments) on each target device; three runs each.
4. Record results here; recommend one approach plus fallbacks.
5. Re-measure with the final Ruby, Sapphire and Garnet assets before treating the character-performance requirement as met.

Current recommendation (art brief): pre-rendered first, runtime 3D only if it meets the budgets.
