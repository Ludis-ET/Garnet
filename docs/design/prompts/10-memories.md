# 10 — Memories

Spec: §23–24, A1 "Memories", A2 "Memories/collections", A3 "Save chat media as memory", "Delete letter/memory". A private archive of their life. Saving from chat or days is always an **explicit** action. Remove-from-collection and delete-memory are clearly different.

### MEM-01 · Memories timeline

Route `/(tabs)/our-world/memories`

```text
Garnet Memories, iPhone 393×852, dark, Garnet violet accent. Large title "Memories".
Segmented "Timeline · Collections". Timeline: month headers in serif ("October · Chapter 02"),
a calm masonry of large rounded photo tiles, voice-note tiles with waveform, text memories as
quiet serif quotes, each with date. Search and filter icons. Floating "Add memory".
```

**States:** populated · empty ("Your story starts with one memory.") with [GARNET FIGURE] (pose: holding the crystal) small · loading skeleton · unavailable media tile ("This item isn't available here.").

### MEM-02 · Collections

```text
Garnet Collections grid, dark: 2-column cover cards with large cover photo, title in serif
("Before Long Distance", "First days apart", "Birthdays", "Trips", "Random moments"), item
count in small caption. "New collection" card with dashed outline.
```

### MEM-03 · Collection detail

```text
Garnet collection detail: hero cover with title and description over a soft gradient, edit
button, then the collection's memories as a grid. Actions menu: Edit collection, Add memories,
Delete collection.
```

**States:** populated · empty collection ("Nothing here yet. Add a memory.") .

### MEM-04 · Create / edit memory

```text
Garnet "New memory" screen, dark. Media area (add photos/videos/voice), title, caption/story text
area, date picker, place (optional, never automatic), tags chips, destination "Add to collection"
selector. Primary "Save memory". Autosave "Draft saved on this device."
```

**States:** empty · filled · uploading (mock progress) · failed with retry · discard dialog · saved.

### MEM-05 · Memory detail

```text
Garnet memory detail: full-bleed media, title in serif, date and place, story text, who added it
(avatar), collections it belongs to as chips. Actions: Edit, Add to collection, Remove from this
collection, Delete memory.
```

### MEM-06 · Media viewer

```text
Garnet full-screen media viewer: black background, swipe between items, pinch to zoom, caption
and date at the bottom, close button, share disabled by default (private). Video with simple
controls; voice note with large waveform.
```

### MEM-07 · Voice note player

```text
Garnet voice note player sheet: large waveform with scrubber, play/pause, speed (1×, 1.5×),
transcript area "Transcript not available" placeholder, author and date.
```

### MEM-08 · Save as memory (from chat or days)

```text
Garnet "Save as memory" sheet: media preview, title field, caption, choose collection list,
Save / Cancel. Toast after: "Saved to Memories."
```

### MEM-09 · Remove from collection vs delete

```text
Two Garnet dialogs. "Remove from 'Trips'?" — "The memory stays in your Memories." Cancel /
Remove. "Delete this memory?" — "It will be removed for you and Noah, including its photos and
collection links. Copies saved outside Garnet aren't affected." Cancel / Delete (destructive).
```

### MEM-10 · Search and filter

```text
Garnet Memories filter: type chips (photos, videos, voice, text), person, collection, date range;
results grid; no-results state.
```
