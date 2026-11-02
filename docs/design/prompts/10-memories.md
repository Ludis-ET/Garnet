# 10 — Memories (Our World)

Spec: §23–24, A1 "Memories", A2 "Memories/collections", A3 "Save chat media as memory", "Delete letter/memory".

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal.** Redesign: **P-59**. Our World is a **shared** page (Garnet violet). A memory's own page and form use its author's colour.

**Rules:**

- A private archive of their life together. Saving from Days or chat is always **explicit**.
- "Remove from collection" keeps the memory; "Delete" removes it for both of you (MEM-09).
- Who deleted a memory is never shown (**U-16** open).
- No per-person counts or comparisons (§5).

## MEM-01 · Our World

Route `/(tabs)/our-world`

```text
"Our World" with glass search and ＋ buttons. A storybook hero: the current chapter's cover with
Ruby and Sapphire together on it, "CHAPTER 02", "Our story", the chapter's title — tap to open it.
A liquid segmented control "Memories · Collections · Chapters". Memories: serif month headers
("October · Chapter 02"), then a balanced two-column masonry: photos and videos as large rounded
pictures, voice notes as tinted glass with a waveform, words as quiet serif quotes; each with a
short date and a thin bar in the author's colour.
```

**States:**

- **Empty:** Garnet holding the crystal, with "Your story starts with one memory."
- **Filtered:** a "Filtered · clear" chip; with no matches, "Nothing found. Try another word or filter."

## MEM-02 · Collections

Two columns of glass cover cards, each with its title in serif and how many memories it holds, plus a dashed "New collection" card that opens a sheet with Name and About fields.

## MEM-03 · A collection

Route `/(tabs)/our-world/collection/[id]`.

- **Hero:** the cover, with the title and description over a soft fade.
- **Actions:** "Add memories" opens a checklist; a glass trash button deletes the collection after confirming "The memories stay in your Memories."
- **Body:** a grid of the collection's memories.

## MEM-04 · New memory

Route `/(tabs)/our-world/memory-new`; the tab bar slides away.

The form has:

- Photo, Video and Voice tiles (simulated);
- a title and the story;
- a date from a glass month picker;
- a place (optional, never filled in automatically);
- #tags and collections.

Leaving with changes asks first.

## MEM-05 · A memory

Route `/(tabs)/our-world/memory/[id]`.

- The picture is full width; tapping it opens the viewer (MEM-06).
- The title in serif, then the date, place and story.
- "Added by you" or "Added by Noah", the collection chips and the tags.
- Actions: Edit, Collections (add or remove; removing keeps the memory) and Delete. Delete confirms: "It will be removed for both of you, including its photos and collection links. Copies saved outside Garnet aren't affected."

## MEM-08 · Save as memory

From chat (a media message) or Days, a sheet with your character holding the crystal offers a preview, title, a few words and collection choices. Saving shows "Saved to Memories."

## MEM-10 · Find a memory

A sheet with a search field, Both / Mine / Theirs, kinds (Photos, Videos, Voice, Words) and collections.
