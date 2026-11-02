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

**Update (P-57):**

- **Garnet's picture:** follows the moment — a special date (celebrating, loving), a hug when either of you needs one, today's feelings, else the time of day (morning, cozy evening, sleepy night), with a different everyday look each day of the week.
- **Shortcut ring:** a ring of glass beads drifts around her: Log, Days, Chat, Open When, Memories, Events, Chapters, Signals. Drag sideways to spin it; tap a bead to go there.
- **Coming up:** the card is the next event from Events and opens it.
- **Watchers:** Ruby and Sapphire peek over the tab bar on every tab page, each in their own person's look.

## HOME-02 · The hero reacts

- **You log or send something:** a ruby spark (sapphire if that's your side) flies from the button into the crystal, and the crystal pops once.
- **Noah's thought arrives:** a spark of Noah's colour drifts in, and a glass capsule floats above the orb for 3 s: "Noah thought of you 💙".

Each reaction lasts under 1 s and never blocks anything. Under reduced motion the glow simply changes.

## HOME-03 · Log a moment

```text
Glass sheet with a grabber (drag down to close), a mini composer (redesign P-62). Kind chips
(Text, Photo, Voice, Feeling…), then a large outline-free writing well whose prompt follows
the time of day ("How's your morning going?") with an emoji that follows what's attached.
Under it: the attached photo or voice note and removable chips for feeling, activity and
place. A tool tray (photo, voice, feeling, activity, place) opens each picker inline. Three
buttons: violet lip "Share with Noah", "After our days meet", and text "Keep private".
```

**Rules:** a moment is a private draft until "Share" is tapped. Closing with content keeps a **private** draft ("Kept as a draft."), never a shared one. There are no other dialogs.

## HOME-04 · Hold to send

The three signal buttons send on a **press and hold** (0.6 s). A ring fills around the button with light haptic ticks; letting go early shows "Hold to send" under it. Once sent, the button bursts with sparkles and reads "Sent". "More" opens a glass sheet with the other signals (Need to talk, Just listen, Check on me, Can't talk yet, I'm okay now), each also hold-to-send. Nothing sends on a tap.

## HOME-05 · Profile menu

A glass popover from the avatar: your card (avatar, name, side), "Settings", "Sign out". Nothing else.

## Home updates (P-63)

- **Shortcut ring:** a bead fades out completely as it passes behind Garnet's glass orb, and the orb covers it for touches. Under reduced motion the ring holds still with every bead in front.
- **Header:** small glass Search and Notifications buttons sit beside your picture. The bell carries a dot when something is new for you (never a count that reaches the partner).
- **Watching from below:** Ruby and Sapphire both peek over the tab bar only once both of you use the app (your partner has joined and finished setup). Until then, only your own gem watches, in its own corner.

## Home below Garnet (P-66)

- **Signal dock:** one glass panel, "Hold to send to Noah", with the three signals and More (hold to send, unchanged), then "Log a moment".
- **Cards:** each card springs in on a stagger, sinks a little when pressed, and can be hidden in Settings › Home layout:
  - **Right now:** both clocks with the part of each day, the kilometres between you, and "You're both awake for about 3 h. A good time to call." or "Both awake again in about 11 h." Waking hours are 08:00–22:00 in each zone, and the count is DST-safe. A soft sheen slides across the card.
  - **Messages:** the partner's picture with an unread count, "2 new" and the latest message.
  - **Coming up:** the event's emoji and a day count that counts into place.
  - **Waiting for you:** letters you may open, with a count. When there are none, it offers "Write one for later".
  - **A memory:** one memory each day, its picture filling the tile, with its title over a soft shade.
  - **Today:** your own moments on a little timeline, with "Your day ›".
- **Counts:** the bell shows how many are new; the Chat and Open When beads, and the Us and Moments tabs, carry their own counts. They are the viewer's own numbers only.
