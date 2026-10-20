# 11 — Events and chapters

Spec: §24–28, §63, A1 "Events/chapters", A2 "Events/chapters", A3 "Event date/time picker", "Reminder options". Show the timezone wherever confusion is possible. Monthly chapters are optional: no mandatory forms, no guilt for skipping, no scores. Birthday and anniversary are **special pages**, not calendar alerts.

### EVT-01 · Events — list and calendar

Route `/(tabs)/moments/events`

```text
Garnet Events, iPhone 393×852, dark. Large title "Moments" with segmented "Events · Open When ·
Surprises" (this is the Events tab). Toggle "List · Calendar". List: upcoming events as elegant
rows with a coloured gem icon per type (birthday ruby/sapphire by person, anniversary violet,
travel, custom), title, date, "in 4 days", and the time in both zones for timed events.
Calendar: month grid with small gem markers, today ring. Floating "Add event".
```

**States:** list · calendar · empty ("Dates that matter to you both will appear here.") · loading.

### EVT-02 · Event detail

```text
Garnet event detail: cover image or gradient, title, type, date and time with both zones
("Sat 14 Nov · 19:00 London · 22:00 Addis Ababa"), description, linked memories/letters/surprises
chips, reminder summary. Actions: Edit, Reminders, Delete.
```

### EVT-03 · Create / edit event

```text
Garnet "New event" form: title, type chips, date, time (optional), timezone selector with clear
labels, repeats (none / yearly / monthly), description, cover, reminder row. Validation for
ambiguous times (e.g. a time that doesn't exist during the UK clock change). Save / Cancel.
```

### EVT-04 · Reminder options

```text
Garnet reminder sheet: on the day, 1 day before, 1 week before, custom; channel note
"In-app and notifications (simulated)"; dedupe note "You'll get one reminder per time."
```

### EVT-05 · Birthday mode

```text
Garnet Birthday mode, dark, celebratory but elegant. The birthday person's colour dominates
(e.g. sapphire for Noah). Hero: [SAPPHIRE FIGURE] (pose: celebrating) on a crystal plinth with a
short sparkle flourish (skippable). Title "Happy birthday, Noah" in serif. Sections: birthday
message from Selam, scheduled surprise ("Something is waiting for you 🎁" — content hidden),
previous birthday photos carousel, birthday memories. Feels like opening a special page.
```

**States:** recipient view · sender view (preparing) · reduced motion · artwork unavailable.

### EVT-06 · Anniversary mode

```text
Garnet Anniversary mode, dark, shared Garnet violet dominates. Hero: [RUBY FIGURE] and
[SAPPHIRE FIGURE] (pose: together) with their lights meeting into the Garnet crystal. Title
"A day that matters to you both". Curated sections: anniversary message, favourite memory,
shared photos, a letter, previous anniversaries, "When we meet again" plan. Manual curation
"Edit this page".
```

### EVT-07 · Monthly chapter

```text
Garnet monthly chapter page "October · Our second chapter", dark. Optional reflection prompts
as gentle cards: Favourite moment, Favourite photo, Something we learned, Something we're
looking forward to. Each is optional ("Skip" always visible). No statistics.
```

### EVT-08 · Relationship chapters list and detail

```text
Garnet chapters list: vertical story list "Before Long Distance — Preparing", "Chapter 01 — London
begins", "Chapter 02 — Finding our rhythm", "Chapter 03 — Still us", each with a cover photo and
date range; rename action. Detail: chapter cover, title (editable), dates, memories, letters.
```

### EVT-09 · Celebration state

```text
Garnet small celebration banner on Home for today's event: "Your anniversary is today 💜" with
"Open" — short sparkle once, never repeated nagging.
```
