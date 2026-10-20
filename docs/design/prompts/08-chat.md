# 08 — Chat

Spec: A1 "Chat", A2 "Chat list/conversation", "Chat media", A3 message overlays. Private one-to-one only; no contacts list. Only curated photos, video and voice notes (no generic files). Sending media in chat does **not** create a memory automatically. **Read receipts are an open conflict (U-35):** Phase 1 rules say no read-receipt pressure, the spec says "flexible per-person controls agreed". Design receipts **off by default** and show both settings states. No figures on chat screens.

### CHAT-00 · Conversation list

Route `/(tabs)/us/messages`

```text
Garnet Messages list, iPhone 393×852, dark. Because the space is private, the list has a single
conversation row: Noah's avatar (sapphire ring), name, last message preview (respecting
privacy settings), time, an unread dot for the viewer. Beneath, quiet shortcuts: "Pinned",
"Shared media", "Search messages". No contacts, no "new chat" button.
```

**States:** with messages · no messages yet ("Say hello 💜").

### CHAT-01 · Conversation

Route `/(tabs)/us/chat`

```text
Garnet private conversation, iPhone 393×852, dark. Compact header: Noah's avatar with sapphire
ring, name, local time "18:42 in London", info button. Messages grouped by sender with soft
bubbles: mine in a ruby-tinted surface, Noah's in a sapphire-tinted surface (also distinguished
by alignment, not colour alone). Date separators ("Today"). A reply preview inside a bubble,
reactions as small pills under bubbles, an edited label, a pinned banner at top ("1 pinned").
Composer above the keyboard: "＋" media, text field "Message", voice-note button, send.
Scroll-to-latest pill when scrolled up.
```

**States:** populated · empty conversation ("Say hello 💜") · keyboard open · pending message (clock icon + "Sending…") · failed (red-outline icon + "Not sent · Retry") · typing preview (only if the partner allows it) · offline · long messages · media message (photo, video, voice).

### CHAT-02 · Message context menu, reactions, reply

```text
Garnet message long-press state, dark: message lifted, blurred background, reaction palette of
6 soft emoji above it, menu below: Reply, React, Edit (own, if eligible), Pin, Copy, Save as
memory (media), Delete. Then the reply composer state showing a quoted preview with ×.
```

### CHAT-03 · Edit message

```text
Garnet edit-message state: composer shows "Editing message" bar with the original text,
Cancel and Save; edited bubble later shows "edited".
```

**States:** eligible · edit window passed (Edit hidden; rules open in spec A13).

### CHAT-04 · Delete for me / for everyone

```text
Two Garnet dialogs, dark. "Delete for you?" — "This removes the message from your view only."
Cancel / Delete for me. "Delete for everyone?" — "This removes it for you and Noah. It can't
remove screenshots or copies outside Garnet." Cancel / Delete for everyone (destructive).
Result bubble: "This message was removed."
```

### CHAT-05 · Pinned messages

```text
Garnet pinned messages sheet: list of pinned messages with date, tap to jump, swipe to unpin.
Empty: "Pin a message to keep it close."
```

### CHAT-06 · In-chat search

```text
Garnet in-chat search: search field in header, results list with highlighted terms and dates,
up/down to step through matches in the conversation. No results: "Nothing found. Try another word."
```

### CHAT-07 · Message details

```text
Garnet message details sheet: sent time in both zones, edited time, delivery state shown only
as "Sent" (no "seen"/"read" unless the read-receipt setting is on for both — U-35).
```

### CHAT-08 · Media sheet and preview

```text
Garnet chat media sheet: Photo, Video, Voice note (mock picker). Preview screen before sending:
media large, caption field, destination "Chat with Noah", Send. Note: "This won't be saved as a
memory unless you choose to."
```

### CHAT-09 · Conversation details

```text
Garnet conversation details screen: shared media grid (photos/videos/voice), pinned messages
row, search row, notification setting for messages, read receipts setting (U-35, off by default),
typing indicator setting.
```
