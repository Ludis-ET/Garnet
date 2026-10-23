# Sitemap and navigation

Low-fidelity structure for §13B. Visual wireframes are **not yet produced** (they need a design tool); this sitemap and [states.md](./states.md) are their input. Per owner direction **P-34**, wireframes for all core journeys J1–J7, especially J3 and J4, must be reviewed **before any Phase 2 UI implementation** (gate B-04). The clickable prototype is deferred and is not required for Phase 1 sign-off.

```mermaid
flowchart TD
  Launch([Launch]) --> Auth{Signed in?}
  Auth -- no --> Welcome[Welcome] --> SignUp[Sign up] --> Verify[Verify email]
  Welcome --> SignIn[Sign in] --> Reset[Reset password]
  Auth -- yes --> Paired{Paired?}
  Verify --> Paired
  Paired -- no --> Pair[Invite your person / Enter invite]
  Pair --> Setup[Identity and setup]
  Paired -- yes --> Home

  subgraph Tabs[Main tabs]
    Home[Home — living shared world]
    DayLog[Day Log]
    Signals[Signals]
    Memories[Memories]
  end
  Setup --> Home

  Home --> AddMoment[Add a Moment]
  Home --> Spark[Shared Spark]
  Home --> Recap[Today's Recap]
  DayLog --> AddMoment
  DayLog --> Entry[Entry detail]
  Signals --> SendSignal[Send signal] --> Respond[Respond to signal]
  Memories --> PastRecaps[Past recaps]
  Memories --> Milestones[Milestones]
  Memories --> OpenWhen[Open When letters] --> Letter[Write / read letter]

  Home --> Settings[Settings]
  Settings --> Notif[Notifications & quiet hours]
  Settings --> Privacy[Privacy & previews]
  Settings --> SparkPrefs[Spark: hide / mute]
  Settings --> TimeZones[Time zones & shared day]
  Settings --> Data[Export & delete]
  Settings --> Sessions[Devices & sessions]

  Widget([Widget]) -. Add a Moment .-> AddMoment
  Widget -. Open Today's Recap .-> Recap
  Push([Notification]) -. opens .-> Signals
```

## Navigation principles

- **Four tabs:** Home, Day Log, Signals, Memories. Settings is reached from Home.
- **Signals are one tap from anywhere** (persistent action on Home and the Day Log). Support must never be buried.
- **Add a Moment** is the primary action on Home and the Day Log, and the target of the widget.
- **Deep links** (widget, notifications) land on the exact screen with a back path to Home.
- Destructive actions (delete memory, end pairing, delete account) are kept apart in Settings → Export & delete, each with its own confirmation (§11).

## Wireframe list (to produce)

Onboarding · Pairing · Setup · Home · Day Log · Add a Moment · Entry detail · Signals (send / respond) · Recap · Spark · Widget (each state in [features/widget.md](../features/widget.md)) · Open When · Memories · Settings · Export & delete. Each screen must cover the states in [states.md](./states.md).
