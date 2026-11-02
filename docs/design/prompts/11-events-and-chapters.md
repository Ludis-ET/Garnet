# 11 — Events and chapters

Spec: §24–28, §63, A1 "Events/chapters", A2, A3 "Event date/time picker", "Reminder options".

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal.** Redesign: **P-59**.

**Rules:**

- Show both zones wherever a time could confuse (ADR-0002). A time the clocks skip is refused with a clear reason, never moved.
- Birthdays and anniversaries are **special pages**, not alerts.
- Monthly chapters are optional: Skip is always there, with no forms to finish, no guilt and no scores.
- Reminders are simulated in the prototype and say so.

## EVT-01 · Events (in Moments)

Route `/(tabs)/moments`

```text
"Moments", segmented "Events · Open When". The next event as a hero: its gradient cover, a gem
badge with its emoji, and a glass caption "Movie night on call · in 5 days · 23:00 Addis Ababa ·
20:00 London". Then "List · Calendar". List: glass rows with a faceted gem badge (a birthday in
that person's colour, an anniversary in Garnet violet, a visit sapphire-to-ruby), title, "Sat 31
Oct · in 5 days" and both zones for timed events. Calendar: a glass month with gem markers and a
today ring; tapping a day lists its events.
```

## EVT-02 · An event

Route `/(tabs)/moments/event/[id]`.

- **Header:** a glass edit button.
- **Body:** the cover with its gem, the title in serif, a kind chip, the date and countdown, both zones, and notes.
- **Reminders:** a summary row that opens a sheet of choices; the sheet notes they're simulated and that you'll get one reminder per time.
- **Delete:** confirms that it's removed for both of you.

## EVT-03 · New event

Route `/(tabs)/moments/event-new`; the tab bar slides away.

The form has:

- **Basics:** a name, then kind chips. "Birthday" adds a "Noah / Mine" choice.
- **When:** a date from a glass month picker. Turning off "All day" adds a time field and a zone choice between your city and Noah's, with a live line showing the time in both zones.
- **Repeats:** Once, Every year or Every month.
- **The rest:** notes, a cover and reminders.

**Errors:**

- No name: "Give it a name."
- A time the clocks skip: "That time doesn't exist in London that day (the clocks change). Pick another."

## EVT-05 · Birthday mode

The birthday person's colour leads the page:

- **Hero:** their character celebrating on a glass plinth, with a sparkle burst.
- **Title:** "Happy birthday, Noah" on the day; otherwise the event's name.
- **Notes:** shown as a letter-like card.
- **Getting ready:** shown only when it's the partner's birthday. "Leave something waiting" opens a new Open When letter, and nothing about what's in it is shown.
- **Birthday memories:** a strip of pictures.

## EVT-06 · Anniversary mode

A Garnet violet page that belongs to both of you:

- **Hero:** Ruby and Sapphire together, loving, on a glass plinth.
- **Title:** "A day that matters to you both", with "Our anniversary · 2 years".
- **Body:** the notes and a strip of your photos.

## EVT-07, EVT-08 · Chapters (in Our World)

Routes `/(tabs)/our-world/chapters` and `/(tabs)/our-world/chapter/[month]`.

- **Which months:** one chapter per month since they started, newest first.
- **Chapter cards:** "Chapter 02 · now", "Finding our rhythm" and the date range.
- **A chapter page:**
  - the cover hero, with a title either of you can rename;
  - four gentle prompt cards: Favourite moment, Favourite photo, Something we learned, Something we're looking forward to;
  - "Add yours" opens a sheet; answers are shown with each person's colour and name;
  - "Skip" hides a prompt that has no answers yet;
  - the month's memories.

## EVT-09 · Celebration

On the day of a birthday or anniversary, Home shows a glass capsule ("Our anniversary is today") that opens the event. It appears once and never nags.
