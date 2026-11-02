# 09 — Open When

Spec: §22, §61, A1 "Open When", A2, A3 "Open letter confirmation", A8, A9.

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), liquid pass, minimal.** Redesign: **P-59**. Letters are **glass-paper envelopes closed with a gem seal in the author's colour**, replacing the capsule motif.

**Privacy rule on every surface:** a sealed letter shows only its safe prompt, sender, status and eligibility. It never shows the body, attachments, a peek, blurred text or a count of any kind. This applies in lists, search, notifications, emails, widgets, accessibility labels and routes.

- State model: `draft → sealed → opening → opened` (+ removed).
- Hiding in the UI is not authorization; the server fix is blocker B-90.
- Whether the author may re-read a sealed letter is open (**U-34**), so the body is never shown to them.
- Who may delete a letter is open (**U-31**).

## OPEN-01 · Letters (in Moments)

Routes `/(tabs)/moments` (the Open When segment) and `/(tabs)/moments/open-when`.

```text
"Moments" with a liquid segmented control "Events · Open When", then "For me · From me". Two
columns of glass cards: an envelope (sealed: still; ready: the gem seal glows and the envelope
floats; opened: flap up, letter showing; draft: dashed outline with a pencil), the prompt in
serif ("Open when you miss me"), "From Noah", a status chip ("Ready to open", "Sealed",
"Sealed for Noah", "Opened", "Draft"). A lip button "Write a letter".
```

**Empty states:** your character dreaming over a letter, with "Letters from Noah will rest here until you need them." or "Leave something for the days apart."

## OPEN-02 to OPEN-08

The create flow (prompt → letter → when it may open), the sealed letter, the opening storyboard, the opened letter and the unavailable state keep their structure. They now use the envelope:

- **Opening:** the flap lifts and the letter rises, driven by the opening progress; under reduced motion it cross-fades.
- **Colour:** each envelope and its tints are in its author's colour from setup (P-57). Earlier code hard-coded the demo users' colours.

## OPEN-03 · The letter paper (P-62)

- **Paper:** you write on a sheet of tinted, ruled paper (cream, rose, sky or lilac) with a margin line. The text sits on the rules.
- **Wording:** it opens with "Dear Noah," and is signed "— Selam" (the setup names).
- **Type:** a small toolbar picks the hand (serif, italic or clean). The ink is always dark on light paper, in both schemes. There is no outline and no word count.
- **Attachments:** a strip under the paper holds photos, a voice note and a song. The author names the song; the app never quotes or plays a show song.
- **Seal and discard:** both confirm in a glass sheet, not a system alert.
- The "Open when…" prompt of your own is a glass text field.

## OPEN-03 and OPEN-07 · The same paper, larger (P-71)

- The sheet is larger (21 pt on 36 pt rules) and **grows with each line**; it never scrolls inside itself.
- The chosen paper and hand are saved with the letter, and the letter is **read on the same paper** once opened, with "Opened …" under the signature. Your own draft shows on its paper too.
- A sealed letter never carries its paper or words (`viewLetter`). A letter surprise uses the same paper once opened.

## OPEN-02 and OPEN-04 · Glass forms (P-63)

- **Frame:** the shared glass frame, with Back, "Step n of 3" over a progress bar, and a glass Next pill. The plain aurora sits behind it, never a colour flood.
- **Step 1:** a large serif "Open when…" and a glass envelope preview that updates as you choose: "For Noah · from Selam". The suggested moments are glass chips, each with a small emoji. "Write your own…" opens a glass text field.
- **Step 3:** each unlock option is a glass card with an emoji and a radio mark. The preview shows only the sealed envelope.
- **Names:** every name on these screens is the real setup name, with nothing hard-coded. The opened letter is signed by its author, with the opening time on both clocks.
