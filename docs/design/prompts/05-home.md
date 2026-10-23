# 05 — Home

Spec: §10, A1 "Home", A2 "Home", A3 "Quick Log sheet", "Emotional action sheet".

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal** (owner directions **P-48**, **P-51**, **P-53**). One idea per section and almost no text: the visuals carry the meaning. Home is a **shared** page, so its accent is Garnet violet; Ruby and Sapphire appear as the two lights.

**Rules:** no relationship score, streak, "days apart" counter or guilt language. Spark and grace behaviour stay open (U-03, U-04, U-24), so no streak number appears. New moments start as **private drafts**, and sharing is always an explicit tap (§4, day-log rule 2). Senders see "Sent", never "delivered" or "seen" (§5). The partner's day is not shown before the reveal (U-02 and U-06 open), so Home shows only your own day.

## The idea in one line

> **The two of you, right now.**

## HOME-01 · Home

Route `/(tabs)/home`

```text
Garnet Home, iPhone 393×852, Daylight Glass liquid, minimal and award-level. Porcelain canvas,
soft aurora. Top row: "Good morning, Sel" (22 pt semibold) on the left; a 44-pt glass avatar
button on the right. Under it a tiny glass capsule: ruby dot "09:12" · sapphire dot "07:12
Noah". Hero (about 40 % of the height): a large liquid-glass orb with the Garnet crystal
floating inside; a ruby light circles in from the left and a sapphire light from the right,
meeting in the violet core. Below: three round glass buttons (64 pt) with an emoji and one
word under each — "Thinking", "Missing", "Need you" — and a small "More" chip. A wide violet
lip button "Log a moment". "Today": up to three slim glass rows (time · emoji · words, a tiny
lock for private ones). A horizontal row of small glass cards: "Noah's birthday · 4 days" and
"Something's waiting 💜". A floating liquid-glass tab bar: Home, Days, Us, Moments, World.
```

**Motion.** On arrival the sections rise in 50 ms apart with springs. The lights orbit slowly (12 s), and the crystal breathes. The tab bar's glass thumb slides between tabs with a spring and stretches as it moves.
**States:** default · first day (no moments: "Your day starts here.") · with event · with waiting item · offline (notice pill) · reduced motion (lights still, crystal still) · artwork unavailable · dark (Night Glass).

## HOME-02 · The hero reacts

- **You log or send something:** a ruby spark (sapphire if that's your side) flies from the button into the crystal, and the crystal pops once.
- **Noah's thought arrives:** a spark of Noah's colour drifts in, and a glass capsule floats above the orb for 3 s: "Noah thought of you 💙".

Each reaction lasts under 1 s and never blocks anything. Under reduced motion the glow simply changes.

## HOME-03 · Log a moment

```text
Glass sheet with a grabber (drag down to close). One large field "A small moment…", a row of
six emoji chips (☕ 💼 🍝 🚇 📸 ❤️). Two buttons: violet lip "Share with Noah" and text "Keep
private". Nothing else.
```

**Rules:** a moment is a private draft until "Share" is tapped. Closing with text keeps the draft ("Kept as a draft."). There are no other dialogs.

## HOME-04 · Hold to send

The three signal buttons send on a **press and hold** (0.6 s). A ring fills around the button with light haptic ticks; letting go early shows "Hold to send" under it. Once sent, the button bursts with sparkles and reads "Sent". "More" opens a glass sheet with the other signals (Need to talk, Just listen, Check on me, Can't talk yet, I'm okay now), each also hold-to-send. Nothing sends on a tap.

## HOME-05 · Profile menu

A glass popover from the avatar: your card (avatar, name, side), "Settings", "Sign out". Nothing else.
