# 13 — Future plans and Our World

Spec: §30–34, §64, A1 "Future/shared world", A2 "Future plans", "Shared places/soundtrack/world". Places are saved memories, **never location tracking**. Soundtrack stores links/metadata, not audio files. The shared world changes for intentional moments, **never** for app usage, and never loses anything because someone missed a day (no points, no streaks).

### WORLD-01 · Our World tab

Route `/(tabs)/our-world`

```text
Garnet "Our World" tab, iPhone 393×852, dark, Garnet violet. Top: the shared growing world — a
small floating crystal island (original 3D motif) with a few gems, stars and soft light, gently
rotating; [RUBY FIGURE] and [SAPPHIRE FIGURE] (pose: idle) tiny on either side of the island.
Below, a calm list of large entry cards: Memories, Chapters, When We Meet Again, Soundtrack,
Places. Each card: icon, title in serif, one-line description.
```

**States:** default · early world (few elements, still beautiful — never "empty") · reduced motion (static island) · artwork unavailable.

### WORLD-02 · Shared world detail and customization

```text
Garnet shared world full screen: the crystal island larger, tap an artefact to see the memory it
came from ("This star appeared when you saved 'Sunset in London'"). Customize sheet: choose
island style, sky, light colour; Save / Cancel / Reset.
```

### WORLD-03 · Together / fusion state

```text
Garnet together moment overlay, dark: ruby light from the left and sapphire light from the right
meet in the centre and form a violet Garnet crystal; [GARNET FIGURE] (pose: together) appears
softly behind the crystal. Line: "Together, even from afar." Triggers: both viewing the same
memory, both responding to an event, completing a plan, anniversary, reunion. Subtle, ≤ 1.2 s,
skippable, original motion (do not copy any existing show animation). Reduced-motion frame.
```

### FUT-01 · When We Meet Again — list

```text
Garnet "When we meet again" list, dark, warm and hopeful. Grouping toggle "By date · By theme".
Plan cards with optional photo, title in serif ("Recreate our first date"), note, place chip,
target "Someday" or a date range ("Dec–Jan"). Completed plans section collapsed with a check.
Floating "Add a plan". No countdown as the main metric.
```

**States:** populated · empty ("Start a list of things to do together.") · all completed.

### FUT-02 · Add / edit plan

```text
Garnet "New plan" form: title, description, photo, place (optional), date: Someday / Date /
Date range, link to an event or memory, notes. Save / Cancel.
```

### FUT-03 · Plan detail and complete

```text
Garnet plan detail with "Mark as done together" primary. Completion moment: both figures
(pose: celebrating), crystal glow, title "We finally did it. ❤️💙", prompt "Add a photo of the
moment" (optional) → saves as a memory.
```

### PLACE-01 · Places list, map placeholder, detail

```text
Garnet "Places" — saved places as memories: list with place name, photo, date and note; a simple
illustrated map placeholder (not a live map, not tracking). "📍 I'm here today" button creates a
voluntary place entry: place name, photo, short note. Detail screen with photo and note.
```

**Never:** continuous location, live position, "last seen at".

### SONG-01 · Soundtrack list and detail

```text
Garnet "Our soundtrack": list of songs with artwork thumbnail, title, artist, and a personal note
("I listened to this on the way home and thought of you."), who added it, linked memory/date.
Detail opens an external link card ("Open in your music app"). Add-song form: link, title,
artist, note. No in-app audio.
```
