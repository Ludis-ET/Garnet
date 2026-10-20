# 07 — Us: emotional connection

Spec: §14–21, §59, A1 "Emotional connection", A2 "Emotional signal compose", A5, A8. Signals are **communication, not measurement**: no counts, streaks, scores, rankings or diagnoses. **Never imply the partner was notified or saw it** (no "seen", no "delivered" unless genuinely confirmed later). No automatic escalation. Copy uses names, not pronouns. Calls/video are later features: don't design working call buttons (spec A13).

### US-01 · Us tab

Route `/(tabs)/us`

```text
Garnet "Us" tab, iPhone 393×852, dark, Garnet violet accent. Large title "Us". Top: both avatars
(ruby ring "Selam", sapphire ring "Noah") with a thin violet line between them and each person's
local time. Grid of signal tiles, 2 columns, premium glass tiles with icon + label: Thought of
You, Missing You, I Need You, I Need to Talk, Please Check On Me, I Can't Talk Yet, I'm Okay Now,
and a wide tile "Messages" (opens chat). Below: "Recent between you" — 3 quiet rows from signal
history (no counts).
```

**States:** default · open support request from partner pinned at top as a gentle card ("Noah sent you a support signal") · offline.

### US-02 · I Thought of You — compose / sent / received

```text
Three Garnet screens, dark. (1) Compose sheet: big tappable "💭 Send a thought" button, optional
note field "Add a few words (optional)", optional photo/voice/video chips, Cancel. (2) Sent: a
tiny ruby particle travels upward and becomes a small violet light; text "Sent 💭". No "seen".
(3) Received (partner's view, in-app card): "A little thought from Noah 💭" with the note if
included and the time in both zones; actions "Send one back" and "Save as memory".
```

**States:** one-tap send · with note · pending offline ("Saved — it'll send when you're back online.") · failed with retry · reduced motion.

### US-03 · Missing You — compose / sent / received

```text
Garnet Missing You compose sheet, dark: three soft choice chips "A little", "A lot", "I need a
hug", optional note, "Send". Sent state: gentle inward glow, "Sent 🥺". Received card: "Noah is
missing you." with the chosen chip as text, actions "Send a hug back", "Message".
```

**Never:** "You missed me 37 times", graphs, comparisons.

### US-04 · I Need You — selector

```text
Garnet "What do you need right now?" screen, dark, grounded and calm (no alarm red). List of
large selectable rows with emoji + label: I'm feeling down · I'm overwhelmed · I feel lonely ·
I need to talk · I need comfort · Something upset me · I don't know what's wrong · I just need you.
Optional attachments row (text, voice, photo, video). Primary "Send to Noah". Footnote:
"Garnet isn't an emergency service." with link to help resources.
```

**States:** none selected · selected · with voice note · sending · sent ("Noah will see this in Garnet.") · pending offline · failed.

### US-05 · I Need You — received

```text
Garnet received support request (partner view), dark. Calm card at top of Home/Us: "Selam sent
you a support signal 🫂" and the selected need ("I'm overwhelmed"), note/voice if included,
time in both zones. Actions: "I'm here" (primary), "Send comfort", "Message". Secondary: "Check
on Selam later". No call buttons in Phase 2.
```

**States:** new · responded ("You let Selam know you're here.") · resolved by "I'm Okay Now".

### US-06 · I Need to Talk + Just Listen

```text
Garnet "I need to talk" sheet, dark. Topic chips: Work, Life, Us, Something difficult, Something
on my mind, I don't know, Just listen. Selecting "Just listen" shows a highlighted explanation:
"I don't need advice right now. I need you to listen." Optional note, "Send".
Received view: "Noah would like to talk — just listen." with actions "I'm here", "Message".
```

### US-07 · Please Check On Me

```text
Garnet "Please check on me" sheet, dark. Options: Now, Later today, Tonight, Tomorrow, each with
the time shown in the partner's zone ("Tonight · around 21:00 for Noah"). Note "Garnet will
remind Noah gently, respecting quiet hours." Send.
```

**States:** each option · reminder pending (partner view: "Selam asked you to check in tonight") · done.

### US-08 · I Can't Talk Yet

```text
Garnet "I can't talk yet" sheet, dark. Prewritten message card: "I'm not okay, but I'm not
ready to talk yet." Optional chips: Check on me later · Give me some space · Stay close ·
Send comfort. Send. Received copy: "Selam can't talk just now." with "Send comfort", "Give space".
```

**Never:** rejection framing.

### US-09 · I'm Okay Now

```text
Garnet "I'm okay now" one-tap confirmation, dark: soft warm glow, "❤️ Let Noah know you're okay
now", optional note, Send. Partner view: "Selam let you know they're okay. ❤️" — closes the open
support card.
```

### US-10 · Signal history and detail

```text
Garnet signal history list, dark: chronological, grouped by day, each row icon + "You sent a
thought" / "Noah sent a support signal" + time. Detail view shows the note/media and responses.
No totals, no charts. Footnote: "Only the two of you can see this."
```

**States:** populated · empty ("Little signals between you will appear here.") · muted category notice · privacy explanation sheet (who sees what, retention open **U-09**).
