# 14 — Search

Spec: A1 "Search", A2 "Search". Searches messages, day entries, letter **prompts** (never bodies), media metadata, events and milestones. **Excludes** private drafts from partner-facing results and never indexes a sealed body. No stale deleted results. AI search is a later possibility: don't promise it.

### SEARCH-01 · Universal search

Route `/search` (from headers)

```text
Garnet universal search, iPhone 393×852, dark. Search field with cancel. Below, before typing:
"Recent" queries with remove buttons and "Clear history". While typing: results grouped by type
with small headers — Messages, Moments, Letters, Memories, Events — each row with icon, safe
title, a short safe snippet with the match highlighted, and date. Filter chips row (type, person,
date). Sealed letters appear only as their prompt with a "Sealed" chip and no snippet.
```

**States:** empty (recent) · typing · grouped results · filtered · no results ("Nothing found. Try another word or filter.") · cleared history toast · deleted/unavailable result ("This item isn't available here.") · result tap → detail · offline (search on this device only).
**Never:** a sealed body snippet, a partner's private draft, or a deleted item's text.

### SEARCH-02 · Clear search history

```text
Garnet dialog "Clear search history?" — "This clears recent searches on this device." Cancel / Clear.
```

## Built (P-63, Daylight Glass)

- **The field:** a glass field and Cancel, then kind chips (All, Messages, Moments, Letters, Memories, Events) and Both / Mine / Noah.
- **Before typing:** your recent searches, each removable, "Clear history" (SEARCH-02) and "Searches stay on this device".
- **While typing:** results grouped by kind, with the match in bold and the date. Sealed letters show their prompt with a "Sealed" mark and no snippet.
- **Never found:** a partner's private or not-yet-revealed moment, a partner's draft letter, a letter's words, or anything deleted (tested in `mockSearchInbox.test.ts`).
