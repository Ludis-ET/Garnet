# F-01 — Widget capability on target platforms

**Result: ⛔ Blocked on U-01** (which phones the partners use). **Deferred to Phase 2 backlog item B-11 (M1)** by owner direction P-33, which is not Accepted. The deferral is not evidence of success. A widget can only be validated on real platform builds; nothing on this page is verified or final until it is run (§6). With multiple devices per person planned (P-36), U-01 must list every device.

## Hypotheses

1. A neutral widget can render the six states in [features/widget.md](../features/widget.md) on each target platform.
2. The two actions (Add a Moment, Open Today's Recap) deep-link reliably from a cold start.
3. After a partner shares something, the widget moves to "Something new" within an acceptable time (target: ≤ 15 min typical, without battery complaints), or the UX holds up with "Updated <time>".
4. Lock-screen and StandBy (iOS) render without exposing content.

## Environment findings (from this machine, 2026-10-18)

| Item                                  | Status                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Android SDK, emulator, platform tools | Installed (`C:\Android\sdk`); **no AVD created yet**                                 |
| Docker                                | Installed, daemon not running (not needed for this spike)                            |
| macOS / Xcode                         | **Not available** — iOS widgets need EAS Build (cloud) + a physical iPhone, or a Mac |
| Expo Go                               | Not usable for widgets; development builds required                                  |

## Plan

| Step | Android                                                                              | iOS                                                                                 |
| ---- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1    | `create-expo-app` in `spikes/widget-app`; dev build via `expo run:android`           | Same project; EAS development build; install on the device                          |
| 2    | Widget via `react-native-android-widget` (JS-rendered) **or** native Glance; compare | Widget extension via an Apple-targets config plugin (SwiftUI)                       |
| 3    | Shared state: app writes neutral state JSON; widget reads it                         | App Group container; check readability while locked                                 |
| 4    | Refresh: `updatePeriodMillis` vs app-triggered update on FCM data message            | Timeline reloads from the app; measure the reload budget; check widget push updates |
| 5    | Deep links: cold start, warm start, signed out                                       | Same, with `widgetURL`                                                              |
| 6    | Measure: latency from partner share to widget change (n ≥ 20), battery over 24 h     | Same                                                                                |
| 7    | Accessibility: TalkBack labels, font scale                                           | VoiceOver, Dynamic Type, `privacySensitive` on the lock screen                      |

Proposed acceptance criteria: **P-26** (not approved).

**Exit:** a filled-in capability matrix (replacing "expected" with measured), a recommendation per platform, and any copy or design changes the limits force.

## Risks to watch

Widget processes have tight memory and time limits; JS-rendered Android widgets need a headless JS start; iOS reload budgets vary with how often the widget is viewed; aggressive OEM battery savers (common on Android) may delay updates.
