# 17 — Notifications, emails and widgets

Spec: §35–37, A5 (notification catalogue), A6 (email templates), A7 (widgets). Everything here is a **preview** in Phase 2: no real push, no email sending, no real widget. Default previews are generic; detailed previews follow the recipient's settings. Never show sealed letter or surprise contents, private drafts or emotional detail on a lock screen, in an email or in a widget.

## Notifications

### NOTIF-01 · Notification centre (in-app)

```text
Garnet in-app notification centre, iPhone 393×852, dark. Grouped by day; each row: category icon,
title, safe body, time, unread dot (for the viewer only — never a "seen" signal to the partner).
Tap opens the target after re-checking access. "Mark all as read". Empty: "You're all caught up."
```

### NOTIF-02 · Notification preview lab

```text
Garnet "Notification preview lab" (prototype tool), dark. Top: privacy mode selector
(Generic / Sender and category / Full) and device frame toggle (iOS lock screen, iOS banner,
Android heads-up, Android shade). Below: one row per category from the catalogue; tapping
renders that notification in the chosen frame. Badge "Simulated — no notification is sent".
```

### NOTIF-03 · Catalogue (design each in the lab, all three privacy modes)

| Category                   | Title                                 | Body                                  | Privacy rule                             |
| -------------------------- | ------------------------------------- | ------------------------------------- | ---------------------------------------- |
| Thought                    | A little thought from {sender}.       | A little thought from {sender}.       | Note only if included and previews allow |
| Missing You                | A little closer, even from afar       | {sender} is missing you.              | No urgency; muteable                     |
| I Need You                 | A message from {sender}               | They sent you a support signal.       | No escalation                            |
| I Need to Talk             | When you have a moment                | {sender} would like to talk.          | No emergency implication                 |
| Please Check On Me         | A gentle check-in request             | {sender} asked you to check in.       | Quiet hours, deduplicated                |
| I Can't Talk Yet           | A note from {sender}                  | {sender} can't talk just now.         | No rejection framing                     |
| I'm Okay Now               | A little reassurance                  | {sender} let you know they're okay.   | Details hidden on lock screen            |
| New chat message           | Message from {sender}                 | {message_preview}                     | Preview setting controls body            |
| Reply / reaction           | A response to your message            | {sender} replied / reacted.           | Can combine or mute                      |
| Day reveal                 | Your day is ready to revisit          | Your shared day is ready.             | No countdown or guilt                    |
| Open When eligible         | A letter is ready when you are        | {safe_prompt_or_generic}              | Never the body                           |
| Surprise drop              | Something for you                     | {safe_title_or_generic}               | Sender's secrecy choice                  |
| Event reminder             | Coming up: {event_title}              | {date_time_context}                   | Correct timezone                         |
| Birthday / anniversary     | A day that matters to you both        | Your {event_type} is today.           | Per-event preference                     |
| Partner joined             | You're connected                      | {partner} joined your space.          | Only after acceptance                    |
| Invitation                 | You've been invited to a shared space | Open Garnet to review the invitation. | No token                                 |
| Security / account         | A change to your account              | Review this activity in Garnet.       | Details stay in-app                      |
| Media ready                | Your memory is ready                  | A media item finished processing.     | Avoid noise                              |
| Memory reminder (optional) | Save this moment if you'd like        | Optional gentle reminder.             | Off / low frequency                      |
| Service notice             | A Garnet update                       | Important service information.        | Genuine notices only                     |

Generic mode for every category: **Garnet** — "Something new for you 💜".

## Emails

### EMAIL-01 · Email preview lab

```text
Garnet "Email preview lab" (prototype tool): list of templates; each opens with toggles Mobile /
Desktop, HTML / Plain text, Images on / Images blocked, and link state Valid / Expired / Used /
Invalid / Signed out. Badge "Simulated — no email is sent".
```

### EMAIL-02 · Shared email layout

```text
Garnet transactional email, one column, 600 px max: header with the Garnet wordmark and a thin
violet line (no character art), headline, short body, one pill CTA button, fallback URL as text,
footer explaining why you got it with help and privacy links. High contrast, readable 16 px body,
no essential text in images, meaningful alt text. Show mobile (375) and desktop (600) widths,
plus the images-blocked rendering and the plain-text version.
```

### EMAIL-03 … EMAIL-13 · Templates (design each with EMAIL-02 layout)

| ID       | Type                    | Subject                                | Body                                                                                                      | CTA               | Footer                                                             |
| -------- | ----------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| EMAIL-03 | Verify email            | Verify your email for Garnet           | You're one step away from setting up your private space.                                                  | Verify email      | If you didn't create this account, you can ignore this message.    |
| EMAIL-04 | Password reset          | Reset your Garnet password             | We received a request to reset the password for this account. If it was you, use the secure button below. | Reset password    | If you didn't request this, no action is needed. The link expires. |
| EMAIL-05 | Invitation              | You've been invited to Garnet          | Someone invited you to join a private two-person space. Review who invited you before accepting.          | Review invitation | Only accept if you recognize the person. Invitation links expire.  |
| EMAIL-06 | Partner joined          | You're connected on Garnet             | Your partner has joined your shared space. Open Garnet to continue setup.                                 | Open Garnet       | If this wasn't expected, review account and relationship settings. |
| EMAIL-07 | Security alert          | Review a change to your Garnet account | A security-related change occurred on your account. Open Garnet to review details.                        | Review activity   | If you don't recognize this activity, secure your account.         |
| EMAIL-08 | Event reminder (opt-in) | Coming up: {event_title}               | A date you chose to remember is coming up on {date}.                                                      | View event        | You control event reminders in Garnet settings.                    |
| EMAIL-09 | Open When ready         | A letter is ready when you are         | A letter has reached its opening condition. Open Garnet to read it.                                       | Open Garnet       | The letter's contents are kept inside Garnet.                      |
| EMAIL-10 | Surprise ready          | Something is waiting for you           | A surprise is ready to open in Garnet.                                                                    | Open surprise     | The sender's privacy choice controls what appears in previews.     |
| EMAIL-11 | Export ready            | Your Garnet export is ready            | The export you requested is ready to download securely.                                                   | Download export   | This link expires. Keep the file private.                          |
| EMAIL-12 | Account deletion        | Confirm your Garnet account deletion   | You requested account deletion. Review the consequences before confirming.                                | Review deletion   | If you did not request this, do not confirm it.                    |
| EMAIL-13 | Service notice          | An update about Garnet                 | There is an important update about the service or your account.                                           | View update       | Only use for genuinely important service messages.                 |

**Never in any email:** passwords, private drafts, emotional signal details, Open When bodies, surprise contents.

## Widgets

### WIDGET-01 · Widget preview gallery

```text
Garnet widget gallery (in-app previews, not real widgets), dark and light, iOS and Android
styles: small, medium and large sizes for each widget below, plus long/short content, missing
image, private-preview mode and stale data ("Updated 14:05"). Glassy surfaces, the Garnet crystal
as the anchor, no scores, no separation counter.
```

| ID        | Widget              | Variants                                                                                           | Tap / guardrail                                                       |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| WIDGET-02 | Shared-space hero   | Small / medium / large: Garnet crystal + short greeting ("Garnet ❤️ · Something waiting for you.") | Opens Home                                                            |
| WIDGET-03 | Shared memory       | Photo, voice or memory preview with optional date                                                  | Opens the memory after access check; obeys preview privacy            |
| WIDGET-04 | Quick action        | Thought, Missing You, Quick Log buttons                                                            | Opens the composer; meaningful signals need a deliberate confirmation |
| WIDGET-05 | Today / day log     | "Today" label and safe recent entries                                                              | Opens Days; respects unrevealed and private state                     |
| WIDGET-06 | Event               | Next event title and date, both zones                                                              | Opens the event                                                       |
| WIDGET-07 | Lock-screen concept | Compact icon, label and safe summary                                                               | No sensitive content by default                                       |

Real widgets and refresh limits are verified later on devices (F-01, deferred to B-11).

## Built (P-63)

- **NOTIF-01, the notification centre:** opened from the bell on Home. Grouped by day, glass rows, an unread dot for the viewer only, "Mark all read", and "You're all caught up" with your gem when it's empty. It is built from what happened (the partner's signals, messages and reactions, letters ready to open, events within a week), using catalogue copy only.
- **NOTIF-02, the preview lab:** under Settings › Prototype. Every catalogue entry in Generic, Sender or Full, on an iOS lock screen, iOS banner, Android heads-up or Android shade.
- **EMAIL-01, the email lab:** all eleven templates with Mobile/Desktop, HTML/Plain text and Images on/blocked, plus what each link state leads to.
- **Copy rules:** generic previews read the same for every category, and no banned words appear (tested in `notifications.test.ts`).

## Counts and details (P-66)

- **Counts:** the bell on Home shows how many are new. Settings › Notification centre shows the same count.
- **Details:** tapping a notification opens a glass details page:
  - its picture, kind, title and words;
  - when it arrived, on both clocks;
  - "Why you got this", with its group's setting one tap away;
  - Open, and "Keep unread".
- **Reading:** opening it marks it read for you only. Messages read in the chat count as read here too.

## Widget gallery (P-70)

Settings › Prototype › Widget gallery shows WIDGET-02 to WIDGET-07 in small, medium and large sizes, on iOS and Android, in light and dark, stale, and with a missing picture. Every variant is privacy-neutral (§5): "Something waiting for you", "A memory to revisit", "Something special · in 5 days", never real titles or words. Quick actions ask "Send this?" first, and nothing is sent in the prototype.

## Character widgets (P-72)

The gallery now opens on **Character** widgets, planned in [widgets-plan.md](../widgets-plan.md): one large Garnet, Ruby or Sapphire as the whole widget, in a look that follows the time of day (morning, day, evening, night), a special day, or something new or waiting. They never look sad, and there are no streaks or counts. W1 Garnet today, W2 Two clocks, W3 Thinking of you (asks "Send 'I thought of you'?" first), W4 Something waiting, W5 Coming up, W6 Far apart, W7 lock screen, W8 StandBy, plus Material You on Android. **Simple** keeps the P-70 set.
