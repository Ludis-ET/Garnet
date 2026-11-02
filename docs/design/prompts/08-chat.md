# 08 — Chat

Spec: A1 "Chat", A2 "Chat list/conversation", "Chat media", A3 message overlays.

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal** (P-48, P-51, P-53, P-55). Prototype choices: **P-58**.

**Rules:**

- Private one-to-one only. There are no contacts and no list of conversations: the Messages tile on Us opens the one conversation.
- Only curated photos, video and voice notes, never generic files. Sending media does **not** create a memory; saving one is always explicit (MEM-08).
- **"Seen" (U-35 open; owner direction P-58):**
  - each person is asked once, "Show when you've seen messages?", with nothing preselected;
  - "Seen" shows only when **both** said yes, and either can turn it off;
  - unanswered counts as no.
- **Typing:** shared unless the person turns it off, and shown only when the partner shares it.
- Never "delivered", "online" or a last-seen time. No streaks, counts or reply-time figures (§5).
- **Characters:** Ruby and Sapphire join in like little avatars (owner direction):
  - both wave when the chat opens;
  - the partner's gem pops up with typing dots while they type;
  - yours hops when you send;
  - the partner's tiny face sits beside "Seen".

  They are decorative and never claim presence.

## CHAT-01 · Conversation

Route `/(tabs)/us/chat` (the tab bar slides away)

```text
Aurora canvas. A floating glass header capsule: Back, Noah's avatar ringed in his colour, his
name and "18:42 in London" (switches to "typing…" in place), Search. A slim glass pin strip:
"1 pinned · Hearing your voice…". Bubbles: mine a lip gradient in my colour on the right; his
glass tinted his colour on the left; runs of messages hug (small inner corners); reactions as
glass pills on the bubble edge; reply quotes inside; "edited" in the time line; glass date
pills. At the top of the history: both characters waving, "Just the two of you 💜", "Private to
Selam and Noah". Under my latest message: "Sent", or Noah's tiny face + "Seen" (both said yes).
Composer: one glass capsule — ＋, "Message", mic / a lip send button when there's text.
```

**States:**

- **Seen question:** a glass card above the composer with "Yes" and "No thanks", and nothing preselected.
- **Typing:** the partner's character and a dots bubble above the composer.
- **Hello:** for about two seconds after opening, both characters wave 👋.
- **Sending and failure:** "Sending…" while a message goes out; if it fails, "Not sent · Try again".
- **Removed message:** shows "This message was removed."
- **Empty conversation:** "Say hello 💜".

## Media, uploads and statuses (P-61)

- **Photos and videos are the bubble**, edge to edge:
  - the time sits on a dark pill on the picture;
  - a caption appears under it, in the sender's colour (lip gradient for mine, tinted glass for theirs);
  - videos show a dark-glass play disc and their length.
- **Uploading:** the picture dims and a white ring fills with the percentage. Tapping the ring cancels; a cancelled upload was never sent and simply goes away.
- **Stopped upload:** a calm "Try again" pill on the picture, and "Not sent · Try again" under it. Retrying starts the upload over.
- **Status under my latest message**, each with its own icon (never colour alone, never "delivered"):
  - Uploading 42 % (a small ring);
  - Sending… (a clock);
  - Not sent · Try again (tappable);
  - Sent · 14:32 (a filled arrow);
  - Seen (a hollow arrow and the partner's tiny face, only when both said yes).
- **Marks by the time:** pinned 📍, saved to Memories 🔖 and "edited".
- **Voice notes:**
  - one player for the whole app, so starting one pauses another;
  - a waveform that fills as it plays; tap anywhere on it to jump;
  - a timer and a 1× / 1.5× / 2× chip;
  - while uploading, the play button becomes the progress ring.
- **Viewer:**
  - opens full screen over a deep wash of the picture's colours;
  - pinch or double-tap to zoom, drag while zoomed, swipe down to close, tap to hide the controls;
  - videos get a dark-glass bar with play, a scrubber you can tap, time left and sound.
  - There is no share button.
- **Attaching:** a shelf of recent pictures (photos and videos) with Camera, Video and Voice tiles opens a full-screen preview: "To Noah", a caption field and one send button.
- **Watching:** when Noah has the chat open, his character pops up above the composer with 👀 and the header reads "here now". This is presence, so it shows **only when both said yes to Seen** (P-58, U-35 open). Otherwise nobody sees anything.
- Upload progress is simulated in the prototype. In the ✦ panel, "Next upload stops" shows the retry state and "Noah opens the chat" shows watching.

## Expressions (P-62)

- **Emoji row:** eight favourites (❤️ 🥰 😂 🥺 😘 🫂 ✨ 🙏) float above the composer while typing or while the panel is open. A tap adds the emoji to the message.
- **Panel:** the smile button in the composer opens a glass panel under it with two tabs:
  - **Stickers:** Garnet, Ruby and Sapphire in each mood there is an owner image for (P-44, P-45). A tap sends the sticker at once; it shows large, with no bubble.
  - **Emoji:** grouped as Love, Smiles, Us and Little things.
- **Double-tap** any message to send ❤️ (it pops). A single tap still does its own thing.
- **Reactions:** the long-press row has five quick reactions and ＋ for twenty more. Reactions are never counted per person or compared (§5).
- The composer has no outline; focus is the glass glow.

## Hold menu and emoji board (P-63)

- **Hold a message (or right-click on the web):** the chat blurs, the message lifts where it is, and a glass reaction bar springs out above it (❤️ 🥰 😂 😮 🥺 🙏 🔥). Its chevron opens the full emoji board. A glass menu sits below: Reply, Copy, Edit, Pin, Save as memory, Details, and Delete in red. If the menu would run off the screen, everything shifts up together. A tap outside closes it.
- **Emoji board:** laid out like the iPhone's keyboard. "Search Emoji" on top (it also matches everyday words such as "coffee" or "hug"), pages that scroll sideways under a sticky category title, and a category bar below: Frequently Used, Smileys & People, Animals & Nature, Food & Drink, Activity, Travel & Places, Objects, Symbols, Flags. Long-press for skin tones. ABC returns to the keyboard; the delete key removes a whole emoji. Every Unicode 15.1 emoji is there, drawn by the phone's own font.
- **Quick emoji row:** shows while typing only. With the board open it would just repeat it.

## CHAT-02 to CHAT-08 · Sheets

- **Long-press a message:**
  - a row of six springy reactions;
  - Reply, Edit (own messages, within the edit window), Pin or Unpin, Copy;
  - Save as memory (media only), Details, Delete.
- **Delete:**
  - "Delete for you" removes it from your view only;
  - "Delete for everyone" (own messages) confirms: "This removes it for you and Noah. It can't remove screenshots or copies outside Garnet."
- **Details:** both zones' times, the edit time, and "Sent" or "Seen" by the rule above.
- **Pinned and Search:** lists; tapping a result jumps to the message and glows it.
- **Media:** the simulated picker or recorder, then "Send to Noah" with a caption field and the note "This won't be saved as a memory unless you choose to."

## CHAT-09 · Details

Route `/(tabs)/us/chat-details`.

The top shows both characters ("loving") around Noah's avatar, with his name and local time. Below that are Pinned and Shared (a media grid).

Under "Just for you" are three settings:

- **Show "Seen":** shows only when you both have it on; reads "Not chosen yet" until answered.
- **Show when I'm typing.**
- **Message alerts:** simulated in the prototype.

At the bottom: "Only the two of you can see this conversation."
