# 01 — Welcome and account

Spec: §7, A1 "Welcome/account", A2 "Welcome", "Create account", "Sign in / recovery", A6 emails. All flows are **simulated**: no account is created and no email is sent (Phase 2 scope rule).

**Design language: [Daylight Glass](./README.md#master-style-v2--daylight-glass-p-48)** (owner direction **P-48**, 2026-10-22). It replaces the dark night-sky version of these pages. Paste the v2 master style first, then the page prompt.

## The idea in one line

> **Two lives, seen through two windows of light, overlap into one space.**

Ruby's world is a warm rose-tinted pane of glass and Sapphire's a cool sky-tinted one. Where they overlap, the glass turns lilac, which is Garnet's colour, and the crystal floats there. Each account screen keeps this idea in a quieter form: soft daylight, frosted glass, one clear action, and motion that springs like something physical.

## What makes it feel premium (applies to every page below)

| Principle                      | What it means on screen                                                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One thing per screen**       | One question, one decision, one primary button. Account creation is three short steps, not one long form (Duolingo pattern).                                                                                                                        |
| **Daylight, not darkness**     | Porcelain-white canvas with a slow, barely-moving aurora of rose, lilac and sky. Never a flat grey page and never a saturated gradient.                                                                                                             |
| **Real glass, used sparingly** | Frosted panes (backdrop blur plus a white veil plus a top highlight line) only for fields, the action dock, sheets, toasts and the hero windows. Text always sits on a veil of at least 72 % white, so contrast never depends on what is behind it. |
| **Tactile buttons**            | The primary button is a violet pill with a 4-pt "lip" under it. Pressing pushes it down onto the lip with a spring and a light haptic, which gives Duolingo's physical feel in an elegant form.                                                     |
| **Springs, not timers**        | Everything that moves uses a spring: presses, steps, progress, toasts and the sheet. Errors shake gently, and success pops with a few soft sparkles. Nothing moves without a reason, and everything has a still version.                            |
| **iOS-quiet typography**       | Large left-aligned titles (34 pt) with tight tracking, 17-pt body, and one serif-italic accent phrase per screen at most (Fraunces italic), for example _"One space."_                                                                              |
| **Kind words**                 | Short, warm copy that never blames. Errors say what to do next.                                                                                                                                                                                     |

## Shared building blocks (design once in COMP-01, v2)

- **Aurora canvas.** Porcelain `#FAF9FC` with three very soft orbs: rose `#FFD3DE` (top-left), sky `#D3E0FF` (top-right) and lilac `#E4DBFF` (lower centre), each a radial fade to transparent. Each orb drifts within about 12 pt over a 20–28 s loop. Under reduced motion the orbs hold still.
- **Glass pane.** Backdrop blur 30 plus a white veil of 72 % (fields, dock) or 60 % (decorative panes). Above it, a 1-pt inner highlight line `rgba(255,255,255,0.9)` along the top edge, a 1-pt outer hairline `rgba(24,18,48,0.07)`, and a long, soft violet-tinted shadow (y 12, blur 32, 8 %). Radii: 22 for fields, 28 for cards and the dock, 36 for the hero windows. When the system asks for **Reduce Transparency** (iOS), panes become solid white with a hairline. On Android, real backdrop blur needs a blur target, so there the veil alone frosts the pane (it still reads as glass over the soft aurora).
- **Primary button.** A pill 56 pt tall, filled with a gradient from violet `#7B55F0` to `#6741E0` (top to bottom), on a 4-pt lip `#4B2BC2`, with white 17-pt semibold label text. Pressed: it moves down 3 pt and scales to 0.98 (spring). Disabled: grey with a grey lip and `#8D879B` label text, and it still announces as disabled. Loading: a spinner replaces the label, and the label is still announced.
- **Secondary button.** A glass pill with ink text and no lip. **Text button:** violet text with a 48-pt touch area. **Destructive:** ruby-red text `#B4233C` in sheets.
- **Glass field.** A visible label in 13-pt secondary text above the field, then a glass input 56 pt tall with 17-pt text. Focus: the hairline becomes violet and a 4-pt soft violet halo fades in. Error: the hairline becomes ruby-red, an alert icon appears with the message under the field, and the field shakes once (8 pt, 3 cycles; none under reduced motion).
- **Grouped fields (iOS inset group).** Several fields in one glass card separated by hairlines, each with a small label inside the row above its input. Used on Sign in and Reset.
- **Glass circle button.** 44 pt round glass with a chevron, used for Back.
- **Progress bar.** 6 pt tall on a glass track, filled with the Together gradient (rose, violet, sky). It springs to its new width on each step.
- **Progress gem.** The Garnet crystal, 56 pt, whose facets light up one step at a time: the ruby facet first, then the sapphire facet, then the violet core. It is an original motif, so it can go anywhere.
- **Checklist row.** A circle that springs into a check mark, plus text, for example "At least 12 characters". The state is shown by the icon _and_ the text colour, never by colour alone.
- **Notice pill.** A glass capsule with an icon and one line of text: info (violet icon), error (ruby icon) or success (green icon).
- **Toast.** A glass capsule that drops from under the status bar with a spring, in the style of iOS's Dynamic Island, and stays 4 s (errors stay until dismissed). It is announced to screen readers.
- **Action sheet.** A glass sheet that springs up from the bottom with a grabber. Its actions are full-width rows, with Cancel in its own pane below (iOS pattern).
- **Sparkle burst.** 10–14 tiny four-point sparkles in rose, violet and sky. They pop outward 40–70 pt and fade within 700 ms. Used only for success moments, and never under reduced motion.
- **Haptics (device only).** Light on primary presses, selection on toggles and step changes, success on verify and account created, and warning on errors.

## AUTH-01 · Welcome

Route `/(auth)/welcome`

```text
Garnet Welcome screen, iPhone 393×852, Daylight Glass (light). Porcelain-white canvas with a soft
aurora: rose glow top-left, sky-blue glow top-right, lilac glow low in the centre, all very pale.
Top: small centred lock-up, a tiny faceted Garnet crystal (20 pt) + "Garnet" in an elegant serif
(20 pt). Hero (upper half): two tall frosted-glass "windows" (150×210 pt, corner radius 36),
tilted −7° and +7°, overlapping by ~28 pt in the middle. The left window is tinted rose and holds
[RUBY FIGURE] (pose: wave) standing on a soft contact shadow; the right window is tinted sky blue
and holds [SAPPHIRE FIGURE] (pose: wave). Where the two panes overlap the glass turns lilac and
the original Garnet crystal (56 pt) floats there with a soft violet bloom. Below, centred:
"Two lives." in a large clean sans (40 pt, near-black) and on the next line "One space." in a
serif italic (40 pt, violet #7B55F0). Then one line of secondary text: "A private place for the
two of you to share the small moments of each day." Bottom: a full-width violet pill button
"Get started" with a darker 4-pt lip under it (tactile, Duolingo-like), then a text button
"I already have an account", then a tiny lock icon + "A private space for just the two of you."
Lots of white space, iOS-level restraint, award-winning, calm and modern. No dark backgrounds.
```

**Motion.** On first load the two windows spring up from 40 pt below, settling their tilt (Ruby 0 ms, a little livelier; Sapphire 80 ms, calmer). The crystal pops in (scale 0.6 to 1 with a bouncy spring) at 200 ms. The words fade up at 260 ms and the dock slides up at 360 ms. While idle, the windows bob in counter-phase (4 pt, 5–6 s) and the crystal turns slowly. Tapping a window makes its figure hop, with a light haptic.
**States:** default · artwork unavailable (each window shows a soft gem silhouette; still complete) · reduced motion (static, no bob, no entrance) · reduce transparency (solid white windows with hairlines) · dark variant (Night Glass) · compact 375×667 (windows 120×168, title 32 pt, actions stay above the fold).
**Never:** a "days apart" counter, pressure to sign up, official artwork pasted in.

## AUTH-02 · Create account (three steps)

Route `/(auth)/create-account` (one route; the steps are in-screen states, and Back goes to the previous step before leaving)

```text
Garnet "Create account" flow, iPhone 393×852, Daylight Glass. Design all three steps side by side.
Top bar on every step: a 44-pt frosted circle Back button with a chevron (left) and, filling the
rest of the row, a slim 6-pt progress bar on a glass track filled with a rose→violet→sky gradient
(1/3, 2/3, 3/3). Under it, left-aligned: the small faceted Garnet crystal (56 pt) whose facets
light up one per step (ruby, then sapphire, then the violet core). Then a large left-aligned
question (28 pt semibold sans) and one line of helper text.

Step 1 — "What should we call you?" helper "This is the name your partner will see."
One large frosted glass field labelled "Display name" (17-pt text, placeholder "Your name").
Step 2 — "What's your email?" helper "We'll send a link to confirm it's you." Field "Email".
Step 3 — "Create a password" helper "Use a phrase you'll remember." Fields "Password" (with an
eye toggle) and "Confirm password". Under them a two-item checklist with springy round checks:
"At least 12 characters" and "Passwords match". A footnote: "By creating an account you agree
to the Terms and Privacy notice." (links in violet).

Bottom dock on every step, pinned above the keyboard: a full-width violet lip button ("Continue"
on steps 1–2, "Create account" on step 3); it stays grey until the step has an answer. Step 1 also
shows "Already have an account? Sign in" under the button.
Lots of air; one question at a time; feels like Duolingo's onboarding, but quiet and premium.
```

**Motion.** Steps slide horizontally with a spring (forward enters from the right; Back reverses). The progress bar springs to its new width. When a step becomes valid, its crystal facet lights up with a small bounce, and moving to the next step gives a selection haptic. Pressing Continue with a problem shows the inline error, shakes the field once and gives a warning haptic; it never silently does nothing. Checklist items spring into a check as they are met. Under reduced motion, steps cross-fade and nothing bounces.
**States:** each step empty · filled · inline error under the field with the input kept (blank name, malformed email, password too short, passwords don't match) · duplicate email (after submit the flow slides back to step 2 with a notice pill: "An account may already exist for this email. Try signing in." plus a "Sign in instead" text button) · submitting (spinner in the button, fields locked) · service failure (toast "That didn't work. Try again." with everything kept) · offline (notice pill at the top: "You're offline. Connect to continue.") · success, which goes to AUTH-04 · keyboard open on 375×667.
**Rules:** the password rule follows **P-25 (proposed, 12 characters)** and is passed explicitly, never as a silent default. Never reveal whether an email exists beyond the neutral copy, and never claim a real email was sent.

## AUTH-03 · Sign in

Route `/(auth)/sign-in`

```text
Garnet "Sign in" screen, iPhone 393×852, Daylight Glass. Calm aurora canvas. Top-left: 44-pt
frosted circle Back button. Then, left-aligned: small Garnet crystal (40 pt), large title
"Welcome back" (34 pt semibold sans, tight tracking), subtitle "Sign in to your shared space."
An iOS-style inset grouped glass card containing two rows separated by a hairline: "Email"
(small label above the input) and "Password" (with an eye toggle on the right). Under the card,
right-aligned violet text link "Forgot password?". A separate glass row: "Keep me signed in on
this device" with an iOS toggle (violet when on). Bottom dock: full-width violet lip button
"Sign in", then "New to Garnet? Create account". Minimal, airy, elegant.
```

**Motion.** A wrong combination shakes the whole grouped card gently (once, never a single field) with a warning haptic, and a notice pill springs in. Success navigates straight on.
**States:** default · filled · incorrect details (one generic message: "Those details don't match. Try again.") · too many attempts ("Please wait a moment before trying again." and the button reads "Try again in 0:27") · signing in · offline · success, which goes to Home (or to the verify step if the email isn't verified yet).
**Never:** say which field was wrong.

## AUTH-04 · Verify email

Route `/(auth)/verify-email`

```text
Garnet "Check your inbox" screen, iPhone 393×852, Daylight Glass. Centre: a frosted glass
envelope (rounded 28, 160×116 pt) floating gently, sealed with a small violet Garnet crystal; a
faint dashed arc of light rises from it with a tiny sparkle travelling along it. Title "Check
your inbox" (34 pt, centred). Body: "We sent a link to" + the masked address in a glass chip
"n***@example.test" + "Open it on this phone to continue." A small glass pill badge: "Simulated —
no email is sent". Bottom dock: violet lip button "Open email preview (demo)", a glass secondary
button "Resend email", and a violet text button "Change email".
```

**Motion.** The envelope bobs slowly and the sparkle travels along the arc every 3 s (both still under reduced motion). On verification the envelope's flap opens, the crystal rises out of it with a sparkle burst and a success haptic, and the screen cross-fades to the verified state.
**States:** waiting · resent (toast "Sent again." and a "Resend in 0:30" countdown on the secondary button) · expired link (notice pill: "This link has expired. We can send a new one.") · verified (bright crystal, title "Email verified", body "You're all set. Welcome to your space.", button "Continue") · offline · already verified, which goes straight to Continue.

## AUTH-05 · Forgot password

Route `/(auth)/forgot-password`

```text
Garnet "Forgot your password?" screen, iPhone 393×852, Daylight Glass. Back circle button.
Left-aligned large title "Forgot your password?" and body "Enter your email and we'll send a
reset link if an account exists." One glass field "Email". Bottom dock: violet lip button
"Send reset link". After sending, the field card cross-fades into a confirmation: a violet
envelope icon in a soft lilac glass circle, the neutral line "If an account exists for this
email, a reset link is on its way.", the "Simulated — no email is sent" pill, a primary
"Open reset link (demo)" and a text button "Back to sign in".
```

**States:** default · invalid email (inline) · submitting · sent (always the same neutral message) · offline · failure (toast).
**Never:** confirm whether the account exists, in copy, timing or layout.

## AUTH-06 · Reset password (from the link)

Route `/(auth)/reset-password`

```text
Garnet "Set a new password" screen opened from an email link, iPhone 393×852, Daylight Glass.
Large left-aligned title "Set a new password". A grouped glass card with "New password" (eye
toggle) and "Confirm new password". Checklist: "At least 12 characters", "Passwords match".
An info row with a small devices icon: "This signs you out on your other devices." Bottom dock:
violet lip button "Save new password".
Also design the link-problem screen: a clock icon in a soft rose glass circle, centred, with a
title ("This link has expired" / "This link was already used" / "This link isn't valid"), one
calm line that explains without repeating the title ("Reset links only work for a short time.
You can ask for a new one." / "Each reset link works once. You can ask for a new one." / "It
may be incomplete. You can ask for a new one.") and a violet lip button "Request a new link".
And the success screen: a green check that pops into a glass circle with a few sparkles,
"Password updated", "Sign in with your new password.", button "Sign in".
```

**States:** checking the link (small spinner) · valid · expired · already used · invalid · too short / mismatch (inline and checklist) · saving · success · failure (toast).

## AUTH-07 · Session expired

Route `/(auth)/session-expired` (replaces the screen; never an overlay on top of private content)

```text
Garnet "Session expired" screen, iPhone 393×852, Daylight Glass. Fully opaque aurora canvas:
nothing from the previous screen shows through and there is no blur of private content. Centre:
a 72-pt glass circle with a lock icon in violet. Title "Please sign in again" (28 pt, centred),
body "For your privacy, you've been signed out on this device." Bottom dock: violet lip button
"Sign in".
```

## AUTH-08 · Sign out (action sheet)

Opened from the account button (later from Settings, SET-xx).

```text
Garnet "Sign out?" iOS-style glass action sheet, iPhone 393×852, Daylight Glass, rising from
the bottom over a softly dimmed and blurred screen (the user's own screen, never the partner's
private content). Sheet: grabber, a small door/arrow icon in a soft rose glass circle, title
"Sign out?", body "Drafts saved on this device stay here until you sign back in." A full-width
row "Sign out" in ruby red (destructive), and below in its own glass pane a bold "Cancel".
```

**Motion.** The sheet springs up and the scrim fades in. Swiping down or tapping the scrim cancels.
**States:** default · with unsent items (body: "You have 2 moments waiting to send. They'll stay on this device.") · signing out (spinner in the row).

## Dark variant: Night Glass

Every page above also gets a dark frame. The canvas is `#0E0C14` with the same three orbs in deep jewel tones (`#5A1730`, `#2C1F6E`, `#0F2A6B`, at 55 %). Glass is a dark veil `rgba(22,19,32,0.66)` with a `rgba(255,255,255,0.10)` highlight line, and text uses the dark tokens. The layout and motion are the same as the light version. The prototype opens in Daylight (light) by default, and the prototype controls can switch to dark or follow the system (P-48).

## Accessibility checklist for these pages

- Contrast is measured against the **worst case**: the glass veil composited over the strongest orb colour. Body and labels need ≥ 4.5:1 and large titles ≥ 3:1. The contrast tests check this.
- Reduce Transparency means solid panes. Reduced motion means no aurora drift, no bob, no shake and no sparkles; steps cross-fade.
- Every control has a role and label, with touch targets ≥ 48 pt. The progress bar announces "Step 2 of 3". Errors are announced (live region), and checklist items announce "met" or "not met".
- Dynamic Type up to 200 %: titles wrap, and the dock scrolls with the content on small screens instead of covering fields.
