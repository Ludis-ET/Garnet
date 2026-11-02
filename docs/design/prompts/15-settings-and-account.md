# 15 — Settings and account

Spec: A1 "Settings/account", A2 "Settings", "Account lifecycle", A3 lifecycle dialogs, A5 preferences. Groups: Account; Personalization; Notifications; Privacy & Safety; Shared Space; Data & Storage; Help/About. Toggles say what the partner can see. Each person controls only their own settings. Deleting an item, unpairing and deleting an account are **separate** actions; export comes first. Fate of shared content after departure: direction **P-37** (ask; export first; default removal), details open (**U-20, U-23**). 2FA and passkeys are later: design them as "Coming later" rows only.

### SET-01 · Settings home

Route `/settings`

```text
Garnet Settings, iPhone 393×852, dark. Profile header row (avatar with side ring, name, "Ruby").
Grouped inset lists with section headers: Account (Profile, Email & password, Devices &
sessions), Personalization (Appearance, Theme & side, Nicknames & greetings, Background),
Notifications (Notifications, Quiet hours, Lock-screen previews), Privacy & Safety (Privacy,
Read receipts, What Noah can see), Shared space (Day reveal, Time zone & day boundary, Start /
manage long distance), Data & storage (Offline & sync, Export my data), Help & about (Help,
About & licensing, Send feedback), Prototype (Reset demo data — badge "Prototype"). Danger zone
at the bottom: "End our space", "Delete my account" in danger text.
```

### SET-02 · Profile and edit profile

```text
Garnet Profile: avatar, display name, nickname, email (masked), side, timezone; Edit opens a form
with Save / Cancel and discard-changes behaviour.
```

### SET-03 · Appearance, theme and side, background

```text
Garnet Appearance: System/Dark/Light, accent intensity, live preview of Home; Theme & side (see
SETUP-04 cards); Background choices for the shared hero (night sky, aurora, plain). Save / Cancel,
"Reset to default".
```

### SET-04 · Nicknames and greetings

```text
Garnet "Nicknames & greetings": my nickname for Noah, greeting style (Good morning / custom),
live preview of the Home greeting and a notification line.
```

### SET-05 · Notification preferences

```text
Garnet Notifications: groups Messages; Emotional signals; Days and memories; Open When and
surprises; Events; Account and security; Optional reminders. Each category row has a mode
selector Immediate / Quiet / Scheduled / Off, and sound / vibration / badge sub-toggles where
supported. Each group has a "Preview" button that shows a simulated notification for that
setting. Banner if OS permission is denied: how to enable it later.
```

### SET-06 · Quiet hours

```text
Garnet Quiet hours: toggle (on by default), start and end time pickers in local time with the
partner's equivalent shown, optional days, note "Garnet isn't an emergency service, so quiet
hours are never bypassed." Default window is open (U-21): show 22:00–07:00 labelled "Suggested".
```

### SET-07 · Lock-screen preview privacy

```text
Garnet "Lock-screen previews": three options with live notification mockups — Generic
("Garnet — Something new for you 💜", recommended, default), Sender and category only ("Noah ·
Thought"), Full content. Explanation: "Anyone who can see your phone can see previews."
```

### SET-08 · Reminder intensity

```text
Garnet "Reminders": Off / Gentle / Custom, with example copy. No repeated nudges, no guilt.
```

### SET-09 · Privacy, read receipts, what Noah can see

```text
Garnet Privacy: plain-language list of what Noah sees (shared moments, signals, revealed days)
and never sees (your drafts, your settings, sealed letter contents). Read receipts (U-35):
off by default, explanation of what turning it on shares. Typing indicator toggle.
```

### SET-10 · Time zone and day boundary

```text
Garnet "Time zone & day": my timezone, Noah's timezone, the shared day boundary shown on both
clocks, labelled "Provisional — not decided yet" (U-02), and a link to the explainer (DAYS-10).
```

### SET-11 · Offline and sync (prototype)

```text
Garnet "Offline & sync": status "Everything on this device" (simulated), pending items list,
developer toggle "Simulate offline" with a "Prototype" badge, retry button.
```

### SET-12 · Devices and sessions, password

```text
Garnet "Devices & sessions": this device (current), other devices with last active time and
"Sign out" per device, "Sign out of all other devices". Password: change password form.
Rows "Two-step verification — Coming later" and "Passkeys — Coming later" (disabled).
```

### SET-13 · Export my data

```text
Garnet "Export my data": what's included (your drafts, shared moments, letters you wrote or
received and opened, signals, memories) and what's not (Noah's private drafts). Primary
"Prepare export". States: preparing, ready (download, expires in 7 days), expired.
```

### SET-14 · End our space (unpair)

```text
Garnet "End our space" flow, dark, careful tone. Step 1: consequences in plain language and the
current direction: "You'll be asked what happens to shared memories. Noah can export first."
(provisional, P-37). Step 2: "Export first" primary, "Continue". Step 3: type "END" to confirm,
final destructive button "End our space", and Cancel at every step.
```

### SET-15 · Delete my account

```text
Garnet "Delete my account" flow: consequences, export option, separate from "End our space",
explicit confirmation phrase, final destructive button. Note: "Deleting from Garnet can't erase
screenshots, downloads or copies outside Garnet." Possible grace period shown as provisional (U-23).
```

### SET-16 · Help, about and licensing

```text
Garnet "About": version, "Prototype — no real accounts or messages", privacy and terms links,
"Character artwork: rights and distribution not yet authorized; internal prototype only"
(U-10), open-source licences list, Send feedback form (text + screenshot toggle).
```

### SET-17 · Reset demo data

```text
Garnet dialog "Reset demo data?" — "This restores the prototype's sample data on this device."
Cancel / Reset. Toast "Demo data restored."
```

## Built (P-63, Daylight Glass)

SET-01 to SET-17 are built: the profile card, iOS inset groups on glass with coloured icon tiles, and the Prototype group (notification lab, email lab, Reset demo data). Ending the space and deleting the account sit at the bottom, separately.

- **Quiet hours:** off until you choose a window. 22:00–07:00 is offered only as "Suggested" (U-21 open).
- **Reminders:** start "Not chosen", which sends none (P-65).
- **Lock-screen previews:** generic by default, and each choice is shown on a drawn lock screen.
- **End our space and Delete my account:** stepped flows, "Export first", then a typed END or DELETE. The open questions are labelled (U-20, U-23).
- **Side:** read-only (P-51).

## Control everything (P-66)

- **Quick controls:** glass toggles at the top for Distance, Characters, Quiet hours, Haptics, Calm motion and Shortcut ring.
- **Search:** "Search settings" finds any page by everyday words ("km", "seen", "dark").
- **New pages:**
  - **Home layout:** the ring, the characters and each card.
  - **Chat:** Seen, typing, message notifications, and "Mark all as read".
  - **Location & distance:** on/off, what it shows right now, "Update now", and what Noah sees.
  - **Motion & haptics:** "Like my phone" or "Calm", and haptics on/off.
- **Takes effect everywhere:** these settings change the whole app right away.
