# 02 — Pairing

Spec: §5, §7 "Create relationship / Join relationship / Relationship confirmation", A1 "Pairing", A2 "Pairing / invite", A3 "Expired invitation". No working external invitations exist in Phase 2: an invitation is a local, **simulated** code.

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48)** (owner directions **P-48**, **P-49**). Paste the v2 master style first, then the page prompt.

**Decisions this page touches**

- **P-18 (proposed):** an invitation works once and lasts at most 24 hours; an unknown, used, expired or revoked code gets **one identical message**. The 24 hours is passed explicitly as `INVITE_POLICY_P18`, never as a silent default.
- **U-33 (open): link, code, or both.** This design uses a **short code** that can also be shared as a message. If a link is chosen later, the same invitation ticket shows the link, and PAIR-03 is only the fallback. Do not treat the code as decided.
- **U-32 (open):** pairing again after ending a pairing is not designed here.
- **Sides are not chosen yet.** Ruby and Sapphire sides are picked in setup (03, SETUP-xx), so avatars in pairing use neutral violet rings. Ruby and Sapphire appear only as the two abstract lights.

## The idea in one line

> **Two lights find each other.**

Every pairing screen is one beat of a single story. Your light (ruby, on the left) waits. A path of light reaches across. The other light (sapphire) answers. When the two meet, the Garnet crystal in the middle lights up, facet by facet, and the two figures meet. Each screen keeps the same composition, so the flow feels like one continuous scene, not five forms.

## Shared pieces (add to COMP-01, v2)

- **Light path.** Two glowing gem lights (14 pt; ruby left, sapphire right) on soft glass orbs, joined by a dotted arc of light that dips through a dim crystal in the centre. The dots flow slowly towards the centre (6 s loop). Its states:
  - _waiting_: only the ruby light is lit.
  - _found_: both lights are lit.
  - _connected_: the crystal is fully lit and blooms.

  Under reduced motion the dots don't flow.

- **Choice card.** A large glass card, 88 pt tall: an icon in a tinted glass circle, a title (17 pt semibold), one line of explanation and a chevron. Pressing squishes it to 0.97 with a spring and a light haptic. Used for the two paths on PAIR-01.
- **Invitation ticket.** A tall glass card (radius 32) with a slow holographic sheen: a soft rose → lilac → sky gradient band that sweeps across every 5 s, and is still under reduced motion. It holds the code tiles, the expiry line and the "Simulated invitation" badge. A perforated hairline (dashes) separates the code from the details, like a real ticket.
- **Code tiles.** Eight glass tiles, 40×52 pt each, in two groups of four with a dash between them. Each tile shows one character in a 26-pt semibold monospaced sans. When the code is your own, tapping it copies it: the tiles ripple left to right (a 30 ms stagger, scaling to 1.08 and back) and a "Copied" toast appears. When entering a code, the active tile shows a violet caret and a halo, and each typed character pops in.
- **Avatar.** A circle with the initial in display serif, inside a 2-pt violet ring (sides not chosen yet). An _empty_ avatar is a dashed ring that breathes slowly (scale 1.0 ↔ 1.05, 2.4 s) with "?" in tertiary text.
- **Info row.** A glass grouped list of rows. Each row has an icon in a soft tinted circle and one line of text.

The Daylight Glass parts from 01 (lip buttons, glass fields, notice pills, toasts, action sheets and the sparkle burst) are reused unchanged.

## PAIR-01 · Create our space

Route `/(onboarding)/pair`

```text
Garnet pairing start, iPhone 393×852, Daylight Glass (light porcelain canvas with a soft rose/
sky/lilac aurora). Top-right: a 44-pt frosted circle account button. Upper third: the Light
Path — a small glowing ruby gem light on the left, a dim sapphire light on the right, a dotted
arc of light dipping through a small dim faceted Garnet crystal in the centre, dots flowing
toward the centre. Below, left-aligned: large title "Create our space" (34 pt semibold sans),
body "Garnet is for exactly two people. Invite your person, and only the two of you will see
what you share." Then two large frosted glass choice cards stacked with 12 pt between them:
1) rose-tinted icon circle with a send/sparkle icon — "Invite my person" — "Create a private
invitation code"; 2) sky-tinted icon circle with a key icon — "I have an invitation" — "Enter
the code from your person". Each card has a chevron. Footnote with a small clock icon:
"Invitations expire and work once." No bottom button: the cards are the actions. Airy,
calm, award-level, iOS-quiet with Duolingo-style tactile cards.
```

**Motion.** The path draws itself on entry (dots appear left to right over 600 ms), and the cards rise in 60 ms apart with a spring. Pressing a card squishes it (0.97) with a light haptic.
**States:** default · creating the invitation (spinner on the first card, both cards locked) · offline (notice pill: "You're offline. Connect to create an invitation.") · already paired, which redirects to PAIR-07.
**Account access:** the circle button opens the sign-out sheet (AUTH-08), so nobody is ever trapped in onboarding.

## PAIR-02 · Your invitation (and the waiting moment)

Route `/(onboarding)/pair/invite`

```text
Garnet "Your invitation" screen, Daylight Glass. Back circle button. Left-aligned title "Your
invitation" and body "Share this code with your person. It's how they'll find you."
Centre: a tall frosted glass ticket (radius 32) with a slow holographic rose→lilac→sky sheen
sweeping across. Inside: the code as eight glass tiles in two groups of four with a dash
("K7QM – 4XPV"), 26-pt semibold monospaced, generously spaced; under the tiles "Tap to copy".
A perforated dashed hairline. Below it: a small clock icon + "Expires in 23 h 59 m · works
once", and a glass pill badge "Simulated invitation". Under the ticket, a waiting row: your
avatar (initial "S", violet ring) — a dotted line of light — an empty avatar (dashed ring,
breathing, "?") and the text "Waiting for your person to join…". Bottom dock: violet lip
button "Share invitation", glass secondary button "Copy code", violet text button "Revoke
invitation".
```

**Share preview (sheet).** In Phase 2 sharing is a preview: a glass sheet titled "Share preview" shows the exact message, with the **Simulated** badge and the buttons "Copy message" and "Done". Nothing leaves the device. The message: _"Selam invited you to Garnet, a private space for two. Your code: K7QM-4XPV. It works once and expires in 24 hours."_
**Motion.** The ticket springs in with a 2° tilt that settles flat, and the tiles cascade in. The empty avatar breathes and the dots flow towards it.
**States:** generated · copied (tiles ripple, toast "Copied") · share preview · waiting · expired (the ticket desaturates, the tiles turn grey, "This invitation has expired." with a lip button "Create a new one"; never a dead end) · revoke confirmation (action sheet: "Revoke this invitation?", "The code will stop working right away.", destructive "Revoke") · revoked (back to PAIR-01 with the toast "Invitation revoked.") · partner joined (see PAIR-06).

## PAIR-03 · Join with a code

Route `/(onboarding)/pair/join`

```text
Garnet "Enter your code" screen, Daylight Glass. Back circle button. Left-aligned title "Enter
your code" and body "Ask your person for the code from their Garnet app." Centre: eight
frosted glass code tiles in two groups of four with a dash; the active tile has a violet caret
and a soft violet halo; typed characters pop in. Under the tiles a glass pill "Paste" with a
clipboard icon. Bottom dock: violet lip button "Continue" (grey until all eight characters are
in). Calm and focused, one task.
```

**Behaviour.** One hidden text field drives the tiles: it uppercases, ignores spaces and dashes, and skips characters that can't appear in a code. Pasting a whole code fills every tile.
**States:** empty · typing · checking (the tiles shimmer left to right) · not valid: one identical message for unknown, used, expired or revoked codes, _"This invitation isn't valid anymore. Ask your person for a new one."_ The tiles shake once and turn rose-outlined, and the input is kept so a typo can be fixed (P-18) · offline · success, which goes to PAIR-04.

## PAIR-04 · Review the invitation

Route `/(onboarding)/pair/review`

```text
Garnet "Review invitation" screen, Daylight Glass. Centre: two avatars side by side — the
inviter "N" (violet ring) and you "S" (violet ring) — joined by a dotted arc of light that
dips through a small half-lit Garnet crystal. Title, centred: "Noah invited you" (34 pt) and
"to a private space for two." A glass grouped list with three rows, each with an icon in a
soft tinted circle: lock — "Only the two of you can see what's inside"; door — "You can leave
at any time"; shield — "No ads, and your data is never sold". Small safety footnote with an
info icon: "Only accept if you know this person." Bottom dock: violet lip button "Accept and
connect", text button "Decline".
```

**States:** default · accepting (spinner in the button) · decline confirmation (action sheet: "Decline this invitation?", "You can always ask Noah for a new one.", "Decline"), which returns to PAIR-01 · invitation no longer valid while reviewing (the same calm message as PAIR-03, then back to PAIR-01) · failure (toast).
**Never:** show the inviter's email, or anything about the inviter beyond the display name they chose.

## PAIR-05 · You're connected

Route `/(onboarding)/pair/connected`

```text
Garnet "You're connected" celebration, Daylight Glass. The jaw-drop moment. Two tall frosted
glass windows — rose-tinted with [RUBY FIGURE] (pose: happy) on the left, sky-tinted with
[SAPPHIRE FIGURE] (pose: happy) on the right — glide toward each other from the screen edges,
tilting from ±12° to ±4° until they overlap in the middle, where the Garnet crystal lights up
facet by facet (ruby, sapphire, violet core) and blooms, with a burst of soft rose, violet and
sky sparkles. Title, centred: "You're connected." and on a second line in serif italic violet
"❤️ 💙". Body: "Let's set up your space." Bottom dock: violet lip button "Continue".
```

**Motion (about 1.6 s, skippable).** The windows glide in with smooth springs (Ruby slightly livelier). On overlap the crystal facets light 120 ms apart, then the bloom and sparkles play with a success haptic, then the words rise. Tapping anywhere jumps to the final frame. Reduced motion shows the final frame at once, with no sparkles.
**States:** default · reduced motion (static final frame) · artwork unavailable (gem placeholders in the windows; still complete).
**Next:** setup (03). Until setup is designed, Continue goes to the placeholder Home.

## PAIR-06 · Your person joined (inviter side)

Shown in place on PAIR-02 when the partner accepts.

```text
Garnet in-place moment on the invitation screen, Daylight Glass: the empty breathing avatar
fills with the partner's initial "N" (pop with a bouncy spring), the dotted line between the
two avatars lights up end to end, the ticket slides away, and a glass card rises: "Noah joined
your space." with both avatars and a violet lip button "Continue", which leads to PAIR-05.
```

## PAIR-07 · Already connected

Route `/(onboarding)/pair/already`

```text
Garnet "Already connected" screen, Daylight Glass. Centre: both avatars ("S" and "N") joined by
a fully lit line of light through a lit Garnet crystal. Title "You're already connected"
(28 pt, centred). Body: "You and Noah already share a space. Garnet is for exactly two
people." Bottom dock: violet lip button "Go to my space", text button "About leaving a space".
```

**States:** default (shown when a paired person opens an invitation or the join screen).

## Dark variant: Night Glass

Same layouts as the light version, using the Night Glass tokens from 01. The sheen on the invitation ticket uses deep jewel tones at 40 %.

## Accessibility checklist for these pages

- The code is read as single characters in its groups ("K 7 Q M, 4 X P V"), never as a word. Copying announces "Code copied".
- The hidden code field has the label "Invitation code" and announces how many characters are left. The tiles are decorative, so the field carries the meaning.
- The expiry is plain text that updates at most once a minute and is never a live region. The waiting row is announced once ("Waiting for your person to join"), not repeatedly.
- The celebration can be skipped, has a still version, and never blocks the Continue button.
- Contrast and transparency rules are the same as in 01.
