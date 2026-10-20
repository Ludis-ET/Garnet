# 06 — Days and logging

Spec: §11–13, A1 "Days/logging", A2 "Days list", "Day timeline", "Quick log", "Day reveal", A9. A day is a chronological stream of small moments, not a journal form. **Cutoff is open (U-02)**; label it provisional. Emotional signals bypass reveal. Visibility types: personal draft · shared immediately · personal until reveal.

### DAYS-01 · Days overview

Route `/(tabs)/days`

```text
Garnet Days tab, iPhone 393×852, dark. Large title "Days". Segmented control "List · Calendar".
"Today" shortcut chip. List of day rows grouped by week: date label ("Tue 3 Nov"), two tiny
side-coloured dots (ruby, sapphire) showing who logged (with text labels for accessibility),
a preview line of 2–3 moment icons, a small photo thumbnail if present, and a status tag:
"Revealed", "Waiting to meet", or "Your day so far". Search and filter icons top right.
```

**States:** list · calendar month (dots on days, today ring) · empty ("Your days will gather here, one small moment at a time.") · loading skeleton · unrevealed partner day (no partner content, only "Noah's day will meet yours later") · filter results · no results.

### DAYS-02 · My Day timeline

Route `/(tabs)/days/[date]` (my side)

```text
Garnet "My day" timeline, dark, ruby accent (viewer is Ruby). Header: "Today · Addis Ababa",
segmented "My day · Noah's day · Together". Vertical timeline: left column times (08:12, 09:03…),
thin ruby line with small dots, each entry a quiet row: icon + short text ("☕ First coffee"),
photos as large rounded media (photos are visually important), video with duration badge, voice
note with a waveform and play button. Each row has a "…" context menu. Private drafts show an
"Only you" badge. Floating "＋" button bottom right. Bottom: "Finish my day" text button.
```

**States:** populated · empty day · draft entries · uploading photo (progress ring) · upload failed ("Couldn't upload this photo yet. We'll keep trying." + retry) · deleted/unavailable entry ("This item isn't available here.") · finished day.

### DAYS-03 · Partner's Day

```text
Garnet "Noah's day" timeline, dark, sapphire accent, "London 🇬🇧" in the header with both local
times shown on each entry ("15:42 · 18:42 for you"). Same layout as My day, read-only, no
context menu except "Save as memory" and "React".
```

**States:** revealed · not yet revealed ("Noah's day is still theirs for now." with crystal resting, no content) · empty.

### DAYS-04 · Day reveal — waiting / ready / recap

```text
Three Garnet screens, dark. (1) Waiting: "Your day is still yours for now." with the crystal half
lit ruby; "Noah hasn't finished yet" is NOT shown — use neutral "Your days will meet when you're
both ready." (2) Ready: crystal lit violet, title "Your days are ready to meet. ❤️💙", primary
"See our day". (3) Recap: one merged chronological timeline, ruby entries on the left edge and
sapphire on the right edge of a central violet line, times in viewer's zone, photos large.
```

**States:** waiting · ready · recap · reduced motion · provisional cutoff label in reveal settings.

### DAYS-05 · Entry detail

```text
Garnet day entry detail, dark. Full-width media (if any), text, type chip, time with both zones,
author avatar, visibility state ("Shared with Noah" / "Only you" / "After your days meet").
Actions: Edit, Change visibility, Delete (destructive), Save as memory.
```

**States:** text only · photo · video · voice · read-only after reveal (edit disabled with reason) · deleted.

### DAYS-06 · Add / edit entry (full)

```text
Garnet "New moment" full screen, dark. Type selector chips at top. Text area. Media row
(add photo, video, voice). Mood chips. Time row (defaults to now; editing time is open
decision U-11 — show the control as disabled with a note). Visibility selector. Primary "Save",
Cancel. Typed text is preserved if media selection is cancelled.
```

**States:** new · editing · validation (empty) · discard-changes dialog · saving · saved.

### DAYS-07 · Media picker (mock)

```text
Garnet media source sheet, dark: rows "Photo library", "Take photo", "Record video",
"Voice note", each with an icon. Then a mock grid picker with 12 neutral sample photos,
multi-select with numbered checks, "Add 2" primary. Badge "Simulated picker".
```

**States:** permission rationale · limited access (iOS) · denied · selected.

### DAYS-08 · Voice note recording (mock)

```text
Garnet voice note recorder sheet, dark: large circular record button with ruby glow, live
waveform, timer "0:12", controls Cancel / Stop / Send. After stop: playback with scrubber,
"Record again", "Save".
```

### DAYS-09 · Mood and activity picker

```text
Garnet picker sheet, dark: tabs "Feeling" and "Activity". Feeling grid of soft labelled emoji
chips (Calm, Happy, Tired, Busy, Excited, Low…); activity list (Coffee, Work, Commute, Food,
Gym, Study, Outside, Home). Selected chip shows check + fill. "Clear" and "Done".
```

### DAYS-10 · Day boundary explainer

```text
Garnet info sheet "When does a day end?", dark. Diagram of one shared day shown on two clocks:
London 04:00 → 04:00 and Addis Ababa 07:00 → 07:00 (06:00 in summer). Note "Provisional:
the exact time hasn't been decided yet." Close button.
```

### DAYS-11 · Filter and search results

```text
Garnet Days filter sheet: chips for type (photo, voice, feeling…), person (me / Noah / both),
date range. Results list grouped by day with matching moments highlighted. "No results" state:
"Nothing found. Try another word or filter."
```
