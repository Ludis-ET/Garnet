# 06 — Days and logging

Spec: §11–13, A1 "Days/logging", A2 "Days list", "Day timeline", "Quick log", "Day reveal", A9.

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal** (owner directions **P-48**, **P-51**, **P-53**, **P-55**). Pictures and emoji carry the meaning; words are one line at most. The Days list and Together are **shared** pages (Garnet violet). "My day", the moment form and its sheets use **the viewer's colour** (Ruby or Sapphire), and the partner's day uses theirs. Prototype choices are recorded as **P-56**.

**Rules:**

- A day is a stream of small moments, not a journal.
- Visibility (§4, day-log rules):
  - a new moment is **Only you** until the author chooses otherwise;
  - "After our days meet" stays the author's until the reveal;
  - a shared moment stays shared (**P-20**).
- The partner's private drafts never appear anywhere: no row, dot, emoji, count or search hit.
- No counts or scores (§5).
- Waiting copy never says who hasn't finished (no blame).
- **The cutoff is open (U-02) and recap timing too (U-06).** The prototype uses a PROVISIONAL policy (04:00 London; the recap opens when both are ready) and says so on screen.
- Changing a moment's time is open (**U-11**), so the time row is shown locked.

## The idea in one line

> **Two days, side by side, meeting when you're both ready.**

## DAYS-01 · Days

Route `/(tabs)/days`

```text
Large title "Days", glass search and info buttons. A liquid segmented control "List · Calendar".
List: week headings ("This week", "Last week", "Week of 5 Oct"); one glass row per day with the
date (weekday + serif day number; today tinted violet and labelled "Today"), up to four emoji
from the visible moments, a status line with an icon ("So far", "Waiting to meet", "Revealed",
"Still yours"), a small gradient thumbnail when there's a picture, and two tiny initial rings
(S, N) in each person's colour for who logged. A floating violet "＋" above the tab bar.
Calendar: a glass month card, Monday first, today ringed, two dots under days with moments,
and a legend "● Selam ● Noah".
```

**States:**

- list;
- calendar (month by month; future months locked);
- loading (pulsing glass rows);
- empty: "Your days will gather here, one small moment at a time.";
- search results;
- no results: "Nothing found. Try another word or filter."

## DAYS-02 to DAYS-04 · One day

Route `/(tabs)/days/[date]`

```text
Header: Back, "Today" (or "Tue 20 Oct"), info. Segmented "My day · Noah · Together", then one
quiet line "Addis Ababa · 20:14". A timeline: times on the left in your zone, a thin line in
the owner's colour with a dot per moment, glass cards on the right. Photos and videos are
large (videos have a play disc and a duration); voice notes have a play button and a waveform
that fills as it plays; feelings show a big emoji. Under the words: small facts ("😊 Happy",
"☕ Coffee", "📍 Entoto Park"). Your unshared moments carry "🔒 Only you" or "🌙 After". "•••"
on your own moments opens Edit, Share with Noah, After our days meet, Only you, Delete.
```

- **Noah's day:**
  - only what Noah shared, with his own time as well ("19:45 for Noah");
  - before the reveal and with nothing shared: "Noah's day is still theirs for now.";
  - otherwise one footnote: "More may arrive when your days meet."
- **Waiting:** the Garnet mark dimmed and part-lit, with "Your days will meet when you're both ready."
- **Ready:** the mark lights fully with a sparkle burst, "Your days met ❤️💙", and the button "See our day".
- **Together (the recap):** one violet line down the middle. Ruby's moments sit on the left and Sapphire's on the right, as compact cards headed "18:30 · Selam".
- **Finish my day:** a text button that opens a sheet with your character saying goodnight: "Finish your day?" and "It meets Noah's when you're both ready."
- **Uploads:**
  - in progress: a glass spinner on the picture;
  - failed: a calm capsule "Couldn't upload yet" with a retry button.

## DAYS-05 · A moment

Route `/(tabs)/days/entry/[id]`

```text
In the author's colour. The picture full width in a glass frame, a big emoji, the words in
serif, glass chips for kind and facts, then a glass card: author avatar and name, both local
times ("10:15 London · 12:15 Addis Ababa"), and who sees it. Buttons: Edit, Who sees this,
Delete (yours); Save as memory, Delete if shared (Noah's, D-11).
```

**States:**

- read-only after the reveal: "Your days have met, so this stays as it is.";
- not available (missing, deleted or not yours to see; all read the same): "This item isn't available here."

## DAYS-06 · New moment

Route `/(tabs)/days/new` (`?id=` edits). The tab bar slides away.

```text
Back, "New moment". Kind chips scroll sideways (Text, Photo, Video, Voice, Feeling, Activity,
Food, Work, Place). A large field "Coffee, a walk, a thought…". Three glass tiles: Photo,
Video, Voice. A glass group: Feeling (opens DAYS-09), Place (typed inline), Time "Now 🔒".
Who sees it: Only you ✓ · After our days meet · Share with Noah. A lip "Save".
```

**States:**

- **Empty:** the field shakes with "Add a few words or a picture."
- **Saving:** the button shows a spinner. Once saved, the toast says "Kept just for you.", "Saved for when your days meet." or "Shared with Noah.".
- **Leaving with changes:** a sheet "Leave this moment?" offering Discard, Keep editing, or "Keep as private draft" (typed words are never lost silently).
- **Editing a shared moment:** the other choices are locked (P-20).

## DAYS-07 · Add media (simulated)

A sheet with a "Simulated picker" badge offering Photo library, Take photo, Record video and Voice note. Picking one opens a 3-column grid of 12 sample gradient pictures (six photos and six videos with durations). One choice gets a numbered check; the button reads "Add photo" or "Add video". The note "Sample pictures only" appears under the grid.

## DAYS-08 · Voice note (simulated)

A sheet with a "Simulated recorder" badge: a live waveform, a large timer and a big round record button with a breathing glow. Tapping it records; tapping again stops. After stopping, the note plays back with a waveform and the buttons read "Use this" and "Record again".

## DAYS-09 · Feeling and activity

A sheet with your character peeking over the top. A segmented control switches between "Feeling" and "Activity", each a 4×2 grid of soft emoji tiles:

- **Feeling:** Calm, Happy, Excited, Loved, Tired, Busy, Stressed, Low.
- **Activity:** Coffee, Work, Commute, Food, Gym, Study, Outside, Home.

The chosen tile gets a check. The buttons are "Clear" and "Done".

## DAYS-10 · When does a day end?

A sheet showing today's shared day on both clocks, worked out from the zone database: Addis Ababa 06:00 → 06:00 (07:00 in winter) and London 04:00 → 04:00. It notes "Provisional: the exact time hasn't been decided yet." (U-02).

## DAYS-11 · Find a moment

A sheet with:

- a search field;
- a "Both · Mine · Noah" segmented control;
- kind chips.

Results replace the list, grouped by day, with the matching words in violet. A glass capsule at the top ("“coffee” · Photo ×") clears the search.
