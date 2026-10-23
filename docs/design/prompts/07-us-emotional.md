# 07 — Us: emotional connection

Spec: §14–21, §59, A1 "Emotional connection", A2 "Emotional signal compose", A5, A8.

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal** (owner directions **P-48**, **P-51**, **P-53**, **P-55**). Us is a **shared** page (Garnet violet). Each compose sheet opens in **the viewer's colour**, with their character peeking over the edge. Prototype choices are recorded as **P-56**.

**Rules:**

- Signals are **communication, not measurement**: no counts, streaks, scores, rankings or diagnoses.
- **Never say the partner was notified or saw it.** The sender sees "Sent" and nothing more.
- No automatic escalation. Support signals are calm, never alarm red.
- Copy uses names, not pronouns.
- Calls and video come later, so there are no call buttons (A13).
- Quiet hours apply on delivery (window **U-21** open).
- Offline sending is open (**U-30**): a failed send says so honestly.
- History retention is open (**U-09**).

## The idea in one line

> **Small signals, softly sent.**

## US-01 · Us

Route `/(tabs)/us`

```text
Large title "Us", a glass history button. A glass card with both of you: avatars ringed in
ruby and sapphire, names, local times, and a thin violet line between you with a small light
gliding from one colour to the other. A 2-column grid of glass tiles, each a big emoji and a
title: Thought of You 💭, Missing You 🥺, I Need You 🫂, I Need to Talk 💬, Just Listen 👂,
Please Check On Me 🤍, I Can't Talk Yet ⏳, I'm Okay Now 🌤️; a wide "Messages 💬" tile (chat
comes later). "Recent" with "All": three quiet rows.
```

**States:**

- default;
- Noah's open support signal pinned at the top (US-05);
- loading;
- offline (notice pill).

## US-02 to US-09 · Sending a signal

Each tile opens a glass sheet in your colour, headed by a big emoji and a serif title. Everything is optional, and one tap on the button sends. The note field reads "Add a few words (optional)".

| Signal                      | In the sheet                                                                                                                                                             | Button              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Thought of You              | Note; Photo, Voice and Video chips (simulated)                                                                                                                           | "💭 Send a thought" |
| Missing You                 | Chips: A little · A lot · I need a hug                                                                                                                                   | "Send to Noah"      |
| I Need You                  | "What do you need right now?" with eight large rows (🌧️ I'm feeling down … ❤️ I just need you); attachments; footnote "Garnet isn't an emergency service."               | "Send to Noah"      |
| I Need to Talk, Just Listen | Topic chips; choosing "Just listen" shows a violet card: "I don't need advice right now. I need you to listen."                                                          | "Send to Noah"      |
| Please Check On Me          | Now · Later today · Tonight · Tomorrow, each with the time in Noah's zone ("around 21:00 for Noah", **P-56**); "Garnet will remind Noah gently, respecting quiet hours." | "Send to Noah"      |
| I Can't Talk Yet            | A violet card "I'm not okay, but I'm not ready to talk yet."; chips Check on me later · Give me some space · Stay close · Send comfort                                   | "Send to Noah"      |
| I'm Okay Now                | "Let Noah know you're okay now"                                                                                                                                          | "Let Noah know"     |

**Sent:** the sheet closes. A small light in your colour rises, turns Garnet violet and fades, and a glass capsule reads "Sent 🫂". Under reduced motion only the words appear.

## US-05 · Noah needs you

```text
A calm glass card tinted in Noah's colour, pinned on Us: the emoji, "Noah: "I feel lonely"",
"23:42 · 01:42 for you", other details, his words in serif italics, then "I'm here" (primary),
"Send comfort", and a text "Message".
```

Replying records the response and unpins the card, with the toast "You let Noah know you're here.". The card also closes if Noah later sends "I'm okay now" (US-09). Each signal offers its own replies:

- check-ins: "I'm here" and "Check on them later";
- can't talk yet: "Send comfort" and "Give space";
- thought: "Send one back";
- missing you: "Send a hug back".

## US-10 · Between you

Route `/(tabs)/us/history`

```text
Back, "Between you". Day headings (Today, Yesterday, 21 Oct). Rows: the emoji in a ring of the
sender's colour, "You sent a thought" / "A little thought from Noah 💭", the time. Tap to open:
the details, the note, replies ("Noah: I'm here"), both times. Footnote "🔒 Only the two of
you can see this." opens "Who sees what".
```

**States:**

- **Populated:** the day headings and rows described above.
- **Empty:** "Little signals between you will appear here."
- **Who sees what:** a sheet saying both of you see every signal and nobody else does; no counts, no scores, no "seen"; how long signals are kept hasn't been decided yet (U-09).
