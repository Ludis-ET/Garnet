# 03 — Identity and setup

Spec: §8 "Personal Identity Setup", A1 "Identity/setup", A2 "Identity setup". Each partner sets this up for themselves, after pairing (02). Permissions are explained before any OS prompt and are **simulated** in Phase 2.

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48), "liquid" pass** (owner directions **P-48**, **P-49**, **P-51**). The panes are more see-through, with a bright rim and a top sheen like iOS 26+ glass. Text still holds WCAG AA, because the text colours pass on the strongest aurora colour with no veil at all.

**Decisions this page touches**

- **P-51 (owner direction, 2026-10-22), for U-22:** each partner **chooses** Ruby or Sapphire, and the two partners **can never have the same side**. The first choice locks that side for the other person. U-22 stays listed until the owner changes its status. The "assigned, read-only" variant from the earlier prompt is no longer designed.
- **U-21 (open):** quiet hours are on by default (§5), but the window is undecided, so setup says "Quiet hours are on. You'll choose the hours later." and never shows invented times.
- **P-17:** lock-screen previews stay generic ("Garnet — Something new for you 💜"). The name preview in SETUP-02 is shown **in the app**, never on the lock screen.
- **ADR-0002:** time zones are IANA names, offsets come from the zone database (never "+3 hours" maths), and London's daylight saving is shown, not hidden.
- **P-52 (proposed):** display names are 1 to 40 characters and nicknames up to 30. The prototype's notification categories start **on** (the person reviews them on this screen before anything is asked of the OS).

## The idea in one line

> **Your light takes shape.**

In pairing, you were a small ruby or sapphire light. In setup that light becomes _you_. A glass **identity card** sits at the top of every step and fills in as you go: your name writes itself in, your side's colour floods the glass, your picture pops into the circle, your clock starts ticking. On the last step the card turns to sit beside your person's card, and the two glow violet together.

## Shared pieces (add to COMP-01, v2 "liquid")

- **Liquid glass pane (upgrade).** The veil is lighter (about 50 % white), with a 1-pt gradient rim that is bright at the top-left and fades at the bottom-right, a soft top sheen over the upper 40 %, and the same long, soft shadow as before. Reduce Transparency makes it solid.
- **Identity card.** A glass "pass" (radius 28, about 96 pt tall), with the avatar (56 pt, ringed in the side colour) on the left. On the right: the name (17 pt semibold), the nickname in tertiary text, a side chip ("❤️ Ruby" or "💙 Sapphire") and a live local clock ("09:03 · Addis Ababa"). Before a side is chosen the card is violet glass; choosing a side floods it with that tint in 400 ms. Each new value pops in with a bouncy spring.
- **Step capsules.** Six short liquid-glass capsules in the header: _Name · Side · Photo · Time · Look · Alerts_. The current capsule stretches wider (spring), completed ones fill with the side colour, upcoming ones stay clear. Announced as "Step 2 of 6, Side".
- **Liquid segmented control.** A glass track with a brighter glass thumb that slides between options with a spring and stretches slightly as it moves (squash and stretch). Each option is a radio button for screen readers.
- **Toggle row.** A glass grouped row with an icon in a tinted circle, a title, one line of explanation, and a switch in the side colour.
- **Simulated system prompt.** A centred card in the iOS alert style: title, body, two stacked buttons ("Allow" / "Don't Allow"), and a "Simulated system prompt" badge, so nobody mistakes it for the real OS (rule 4).
- **Side flood.** When a side is chosen, a soft radial wash of that colour spreads from the chosen card across the aurora (600 ms, then it settles at 20 %). It is still under reduced motion.

## SETUP-01 · Setup shell

Route `/(onboarding)/setup` (one route; steps are in-screen states, and progress is saved after each step so the person can leave and come back)

```text
Garnet setup shell, iPhone 393×852, Daylight Glass "liquid": porcelain canvas with soft rose /
sky / lilac aurora, very see-through glass with bright rims. Header row: 44-pt frosted circle
Back, then six short liquid-glass progress capsules "Name · Side · Photo · Time · Look · Alerts"
(current one wider and lit, done ones filled with the side colour), and a small glass pill
"Skip" on optional steps. Under the header: the glass identity card (avatar ring, name, side
chip, ticking local clock) that fills in as the steps progress. Then a large left-aligned
question (28 pt), one line of helper, the step content, and a violet (or side-coloured) lip
button "Continue" pinned above the safe area. Award-level, airy, iOS 26-style liquid glass.
```

**Motion.** Steps slide horizontally with a spring (Back reverses), and the identity card never moves: only the value that changed animates. The capsules stretch and fill with a spring. Continue gives a light haptic, and each finished step a selection haptic.
**States:** resume (opens at the first step not yet done) · saving (spinner in Continue) · offline (notice pill; entries are kept) · failure (toast, entries kept).

## SETUP-02 · Your name

```text
Step "What should Noah call you?". Glass field "Display name" prefilled "Selam" (large 20-pt
text). Glass field "Nickname (optional)" with helper "Only Noah sees this." Below, an in-app
preview card in glass styled like a gentle banner: small crystal icon, "Noah's Garnet" caption,
and the line "A little thought from Selam." — updating live as the person types (nickname wins
when set). Small caption under it: "Lock-screen previews stay private." Continue.
```

**Motion.** The preview line cross-fades as the name changes, and the identity card's name writes in letter by letter (under reduced motion it appears at once).
**States:** prefilled · empty name (inline error "Please fill this in.") · long name (shortened with … in the card; the full name stays in the field) · nickname set.

## SETUP-03 · Choose your side (P-51)

```text
Step "Choose your side". Two tall liquid-glass cards side by side (each ~165×300). Left: Ruby —
rose-tinted glass, [RUBY FIGURE] (pose: idle) standing on a soft glow, label "Ruby" with ❤️,
line "Warm, expressive, alive." Right: Sapphire — sky-tinted glass, [SAPPHIRE FIGURE] (pose:
idle), label "Sapphire" with 💙, line "Calm, dreamy, spacious." Selected card: lifts and scales
to 1.04 with a bright rim in its colour and a check badge (never colour alone); the other card
recedes to 0.96 and dims. A soft wash of the chosen colour spreads across the aurora. Footnote:
"Your person will be the other side. Together you're Garnet 💜". Continue.
```

**Motion.** Choosing gives a selection haptic, the chosen figure does a small happy hop, and the identity card floods with the side tint.
**States:** none chosen · Ruby chosen · Sapphire chosen · **side taken by the partner** (that card is frosted and locked, with a small avatar badge and "Noah is Sapphire"; the free card is ready to pick) · **both chose at once** (conflict sheet: "Noah just chose Ruby. You'll be Sapphire, the other half of Garnet." → "Be Sapphire") · artwork unavailable (gem placeholders).
**Never:** let both partners hold the same side, or decide it silently for someone who hasn't chosen.

## SETUP-04 · Your picture

```text
Step "Your picture". A large 132-pt avatar preview in a glass ring of the side colour. Under it
a liquid segmented control "Initials | Photo". Initials: four glass colour swatches in the
side's family (Ruby: rose, crimson, coral, blush / Sapphire: sky, navy, cyan, periwinkle); the
initial sits on the chosen gradient. Photo: glass button "Choose a photo" (simulated) which first
shows a rationale sheet, then a "Simulated system prompt", then a small grid of three demo
pictures to pick from. Continue; glass pill "Skip" in the header.
```

**Motion.** The avatar morphs (cross-fade plus scale pop) between initials and photo, and the swatches spring as they're selected.
**States:** initials (default) · swatch selected · photo rationale ("Garnet only uses the photo you pick. Nothing else in your library is read.") · simulated OS prompt · photo chosen · permission denied (notice: "Garnet can work without this permission. You can enable it in Settings later.").

## SETUP-05 · Your time

```text
Step "Where's home right now?". A glass row with a globe icon: "Addis Ababa" and "GMT+3 ·
09:03" with a check, and a "Change" pill. Below, a glass explainer card with two mini clocks
side by side (your city, Noah's city) whose hands animate to the current time, and the line
"Garnet shows each moment in your own time, and Noah's time when it helps." Example row:
"09:03 for you · 07:03 for Noah". When either city uses daylight saving, a small info row:
"London's time changes with UK daylight saving." Continue.
```

**Change sheet.** A glass sheet with a search field ("Search cities") and a list of cities with their current offset and time. Selecting one springs the check across and closes the sheet.
**States:** detected · searching · no results ("No matching city. Try a country or a bigger city nearby.") · selected · DST note · partner's time zone not known yet (example row shows only your time).

## SETUP-06 · Your look

```text
Step "Your look". A live mini preview of a Garnet screen inside a glass phone frame (rounded
40, 210×300), using the chosen side colour: aurora, a glass card, a lip button. Below: liquid
segmented control "Appearance: System | Light | Dark" and "Accent: Subtle | Rich". Changing
them updates the preview immediately with a soft cross-fade. Continue.
```

**States:** each appearance · each accent intensity. Appearance applies to the whole app right away. Accent intensity is a stored preference shown in the preview (the app applies it with HOME designs).

## SETUP-07 · Alerts

```text
Step "Stay close, gently". Body: "Garnet can let you know when Noah thinks of you or needs you.
Previews stay private on your lock screen." A glass grouped list of three toggle rows with
tinted icons: "Thoughts and Missing You", "Support requests", "Days and letters". A glass info
row: moon icon, "Quiet hours are on. You'll choose the hours later." A realistic glass
lock-screen notification preview: app icon (crystal), "Garnet", "now", "Something new for you
💜". Primary lip button "Turn on notifications"; text button "Not now".
```

**Flow.** Turn on → rationale sheet → simulated system prompt → enabled (the bell icon rings with a small wobble and the toast "Notifications are on.") or denied (notice: "You can turn them on later in Settings."). "Not now" moves on with notifications off.
**States:** default · rationale · simulated prompt · enabled · denied · not now.

## SETUP-08 · You're all set

```text
"You're all set" summary. Top: [GARNET FIGURE] (pose: holding the crystal), small, in a soft
violet glow (crystal only if artwork is unavailable). Your finished identity card, large, then
a glass grouped list with edit chevrons: Name, Side, Picture, Time zone, Look, Alerts (each
value on the right). Below it, Noah's card in a smaller size: his side and "Still setting up…"
or "Ready". When both cards are shown, a thin violet line of light joins them through a small
Garnet crystal. Primary "Go to our space".
```

**Motion.** The finished card settles with a soft bloom and a few sparkles, and the list rows stagger in. Tapping a row jumps back to that step with the card unchanged.
**States:** partner still setting up · partner ready · any step skipped (shown as "Not set" with the edit chevron).

## Dark variant: Night Glass

Same layouts as the light version. The side tints use deep jewel tones (ruby `#5A1730`, sapphire `#0F2A6B`) at 40 %, and the rims are `rgba(255,255,255,0.18)`.

## Accessibility checklist for these pages

- The side cards are radio buttons ("Ruby, warm, expressive, alive, selected"). A locked card says "Ruby, taken by Noah", unavailable.
- Segmented controls are radio groups; swatches are radio buttons named by colour ("Rose").
- The clock text updates once a minute and is never a live region. Mini clock hands are decorative.
- The simulated system prompt is announced as an alert and traps focus.
- Every animation has a still version, and every colour state also has a check mark, text or a lock icon.
