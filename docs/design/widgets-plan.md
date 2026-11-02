# Garnet widgets: design plan for iPhone and Android

Status: **plan (P-72)**; **Android W1 to W6 built as real widgets (P-73)**. Every design below
is also previewed in the app (Settings › Prototype › Widget gallery) on local data. The Android
widgets run in the test APK and are the early, Android-only part of the feasibility spike **F-01**
(deferred to **B-11**); the target devices (**U-01**) are still open. iPhone widgets (W1 to W8 on
iOS) are not built: they need a Mac or EAS.

## 1. The idea: a character that lives with you, not one that nags

Duolingo's widgets work because the owl is the widget: one big, expressive character that
changes with your day, very little text, and a single tap into the app. Garnet borrows the
first half and refuses the second:

| Borrowed from Duolingo                                   | Refused (Garnet guardrails, AGENTS.md §5, P-09)                 |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| One large character as the whole widget                  | Streaks, flames, day counts, "don't break it"                   |
| Expressions that follow the time of day and special days | Sad, crying, angry or "come back" faces; any guilt              |
| Very little text, big type                               | Counts of signals, partner "online", "seen", last active        |
| One tap into the right place in the app                  | Anything that sends without asking first                        |
| A widget for every size, and the lock screen             | Content on the home or lock screen (messages, moments, letters) |

Ruby, Sapphire and Garnet appear only from the owner's images (P-44, P-45). Rights and public
distribution are unresolved (**U-10**, **U-26**): widgets put the characters on a home screen,
so they stay in the internal build.

## 2. What the widget is allowed to know

The app writes a tiny snapshot that the widget reads. Nothing else crosses into widget code.

| Field                   | Example                              | Why it's safe                                   |
| ----------------------- | ------------------------------------ | ----------------------------------------------- |
| `part`                  | `morning`, `day`, `evening`, `night` | From this phone's clock                         |
| `special`               | `birthday`, `anniversary`, or none   | Both partners already know these dates          |
| `mySide`, `partnerSide` | `ruby`, `sapphire`                   | Chosen together in setup                        |
| `myZone`, `partnerZone` | `Africa/Addis_Ababa`                 | Already shown in the app                        |
| `somethingNew`          | `true`                               | A yes/no only, never what or from whom          |
| `waiting`               | `true`                               | A letter or surprise can be opened; never which |
| `nextEventDays`         | `5`                                  | Never the event's title                         |
| `km`                    | `5900` (or null)                     | Only if distance is on (P-66); never a place    |
| `updatedAt`             | `14:05`                              | For the "Updated" label                         |

Never in a widget: message, moment, letter or surprise words, signal types, feelings, photos,
names of events or places, partner presence. Signals light `somethingNew` only and are never
counted (SYS-05).

## 3. The character's expressions

One rule set, used by every widget:

| When                    | Garnet / Ruby / Sapphire look                                |
| ----------------------- | ------------------------------------------------------------ |
| 05:00–11:00             | `morning` (stretching, hello)                                |
| 11:00–17:00             | `happy`                                                      |
| 17:00–21:00             | `cozy`                                                       |
| 21:00–05:00             | `goodnight` (asleep: the worst a character ever does is nap) |
| Birthday or anniversary | `birthday` / `anniversary`, all day                          |
| `somethingNew`          | `loving`, for an hour, then back to the time of day          |
| `waiting`               | `surprise` look holding the envelope or gift                 |

Each look is a pre-rendered image at widget sizes, so widgets never draw characters at run
time. Reduced motion has no effect here: widgets don't animate, they change between refreshes.

## 4. The widget families

Sizes: iPhone small (2×2), medium (4×2), large (4×4) and the lock screen (circular, rectangular,
inline), plus StandBy. Android resizable cells (2×2, 4×2, 4×4) with Material You colours.

| #   | Widget                | Sizes                         | What it shows                                                                                                                        | Tap                                                                    |
| --- | --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| W1  | **Garnet today**      | S, M, L / 2×2, 4×2, 4×4       | Garnet, large, in the time-of-day look; "Good evening 💜". Large adds both clocks                                                    | Home                                                                   |
| W2  | **Two clocks**        | M / 4×2                       | Ruby and Sapphire, each in their own time-of-day look, with each local time and "Both awake · about 3 h"                             | Us                                                                     |
| W3  | **Thinking of you**   | S / 2×2                       | Your gem holding a heart; one button                                                                                                 | Asks "Send 'I thought of you'?" in the app (never one-tap sending, §6) |
| W4  | **Something waiting** | S, M / 2×2, 4×2               | Garnet peeking from behind a glowing envelope or gift when something can be opened; resting otherwise ("All caught up")              | Open When or Surprises                                                 |
| W5  | **Coming up**         | S / 2×2                       | The event's emoji and "Something special · in 5 days"; the character gets more excited as it nears                                   | The event                                                              |
| W6  | **Far apart**         | M / 4×2                       | Both gems with a little plane on a dotted arc, "≈ 5,900 km"                                                                          | Us                                                                     |
| W7  | **Lock screen**       | circular, rectangular, inline | Circular: the Garnet mark with a dot when something is new. Rectangular: "💜 Something new for you". Inline: "Garnet · Good evening" | Home                                                                   |
| W8  | **StandBy / night**   | iPhone StandBy                | Garnet asleep, dimmed; red-tinted at night like iOS                                                                                  | Home                                                                   |
| W9  | **Material You**      | all Android sizes             | The same designs, tinted with the wallpaper's colours                                                                                | —                                                                      |

## 5. How it would be built (after F-01)

- **iPhone:** a WidgetKit extension in SwiftUI, added through an Expo config plugin. The app
  writes the snapshot to an App Group. Timelines refresh hourly and on each change; WidgetKit's
  daily refresh budget (roughly 40–70 reloads) applies. W3 uses App Intents (iOS 17) to open the
  confirmation, never to send.
- **Android:** Jetpack Glance (or `react-native-android-widget`, which renders React Native-like
  layouts into RemoteViews). The snapshot goes in DataStore, refreshed every 30 minutes at most
  and on each change.
- **Images:** pre-scaled PNGs per look, at 1×, 2× and 3×, kept small (iOS widget extensions have
  a tight memory limit).
- **Dependencies:** each needs the owner's approval, with the licence and maintenance checked,
  before it's added (AGENTS.md §6).

## 6. Open questions

- **U-01:** iPhone, Android, or one of each? This decides which half is built first.
- **F-01, B-11:** the widget feasibility spike, including refresh timing on real devices
  (P-26's acceptance criteria).
- **U-10, U-26:** character rights before anyone outside the two of you sees a widget.
- Should W6 (distance) exist on a home screen at all? It shows only kilometres, but it's always
  visible.

## 7. Suggested order

1. Freeze the designs in the in-app gallery (now).
2. F-01 spike: W1 small on iPhone and 2×2 on Android, from the snapshot.
3. W3 with its confirmation, then W4 and W5.
4. The lock screen (W7), StandBy (W8) and Material You (W9).

## 8. What the Android build does (P-73)

- **Built:** W1 Garnet today (resizable; wide shows the greeting beside Garnet), W2 Two clocks,
  W3 Thinking of you, W4 Something waiting, W5 Coming up, W6 Far apart. Each comes in light and
  dark; at night the light version turns dark too.
- **Data:** the app writes the snapshot (section 2) to a private file a second after anything
  changes, and redraws every widget. Android also asks every 30 minutes, which keeps the part of
  the day right while the app is closed. W2 shows parts of the day and cities rather than ticking
  clocks, because a ticking clock needs native widget code.
- **Taps:** W1 opens the app; W2 and W6 open Us; W4 and W5 open Moments; W3 opens a page that
  asks "Send 'I thought of you'?" first.
- **Not yet:** W7 and W8 (iPhone only), and Material You wallpaper colours (W9): the widget
  library offers fixed light and dark colours only.
- **Images:** `python scripts/make-widget-art.py` (from `apps/mobile`) makes small copies of the
  owner's images in the git-ignored `assets/characters/widget/`. Without them the widgets show gem
  colours and words.
