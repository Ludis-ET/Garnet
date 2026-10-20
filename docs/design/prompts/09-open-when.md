# 09 — Open When

Spec: §22, §61, A1 "Open When", A2 "Open When list/locked", "Open When create/open", A3 "Open letter confirmation", A8, A9. **Privacy rule on every surface:** a sealed letter shows only its safe prompt/title, sender, status and eligibility. Never the body, attachments, a peek, a blur of the text or a character count — not in lists, search, notifications, emails, widgets, accessibility labels or route params. State model: `draft → sealed → opening → opened` (+ removed). The app enforces this in its views (`apps/mobile/src/domain/openWhen.ts`), but UI hiding is **not** authorization; a server fix is a known blocker (B-90).

### OPEN-01 · Open When library

Route `/(tabs)/moments/open-when`

```text
Garnet Open When library, iPhone 393×852, dark. Large title "Open When". Segmented control
"For me · From me". Grid of 2 columns of gem capsules (original 3D motif): ruby, sapphire or
violet capsule per sender, each on a soft reflective floor, with the safe prompt underneath in
the serif ("Open when you miss me"), sender name, and a status chip: "Sealed", "Ready to open"
(gentle pulse) or "Opened". Floating "Write a letter" button.
```

**States:** populated · empty for me ("Letters from Noah will rest here until you need them.") · empty from me ("Leave something for the days apart.") · loading · offline · removed letter in list ("This item isn't available here.").
**Never:** body text, a preview line, attachment counts or blurred text.

### OPEN-02 · Create — prompt and category

```text
Garnet "Write an Open When letter" step 1, dark. Title "Open when…". Suggestion chips: you miss
me, you have a terrible day, you can't sleep, you're homesick, you're angry with me, you need to
laugh, you need motivation, on your first day at work, you need to hear my voice, you want to
remember us — plus "Write your own". Selected chip shows the full prompt in the serif.
```

### OPEN-03 · Create — body and attachments

```text
Garnet letter editor, dark, writing-focused: paper-like surface with generous margins, serif
body text, word count hidden, formatting kept minimal. Attachment row: photos, voice recording,
video, song link (curated only). Autosave indicator "Draft saved on this device". Top right
"Next".
```

**States:** empty · writing · attachments added · draft saved · discard dialog.

### OPEN-04 · Create — unlock condition and recipient preview

```text
Garnet "When can Noah open it?" step, dark. Options: "Anytime" (manual), "On a date and time"
(picker showing both zones), "On an event" (pick from events). Then "What Noah will see before
opening": a preview of the sealed capsule with only the prompt and "From Selam". Buttons
"Save draft" and primary "Seal letter". Confirmation: "Once sealed, you can't edit it."
```

### OPEN-05 · Sealed letter (recipient)

```text
Garnet sealed letter detail, dark, cinematic. A single gem capsule centred, softly glowing seam,
floating above a reflective floor. Prompt in large serif: "Open when you miss me". "From Noah ·
sealed 30 Aug". Status: "Opens on 5 January · 06:00 for you" or, if eligible, primary "Open
letter". No peek, no preview, no blurred text. Back button.
```

**States:** locked until a date · eligible (gentle pulse + Open button) · event-locked ("Opens on your first day at work") · sender's view of their own sealed letter (prompt + "Sealed for Noah"; whether the author can re-read is **U-34** — design without the body).

### OPEN-06 · Opening confirmation and animation

```text
Garnet "Open this letter now?" dialog: the prompt, "From Noah", buttons "Not now" / "Open".
Then the opening storyboard (5 frames, ≤ 1.5 s, skippable): capsule glows → seam splits → light
spills out → halves rest apart → letter rises into view. [SAPPHIRE FIGURE] (pose: writing a
letter) may appear small at the end. Reduced-motion version: cross-fade to the opened letter.
```

### OPEN-07 · Opened letter

```text
Garnet opened letter, dark. Paper-like surface, serif body text, author signature line
"— Noah", opened time "Opened today at 21:04". Attachments below: photos gallery, voice note
player with waveform, video, song link card. Actions: "Save as memory", "Reply with a thought".
```

### OPEN-08 · Unavailable, removed, access denied

```text
Garnet unavailable letter state, dark: soft empty capsule outline, "This item isn't available
here." No details about why or what it contained. Button "Back to letters".
```
