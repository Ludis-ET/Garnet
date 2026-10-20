# 01 — Welcome and account

Spec: §7, A1 "Welcome/account", A2 "Welcome", "Create account", "Sign in / recovery", A6 emails. All flows are **simulated**: no account is created and no email is sent (Phase 2 scope rule). Start each prompt with the [master style](./README.md#master-style-paste-first).

### AUTH-01 · Welcome

Route `/(auth)/welcome`

```text
Garnet Welcome screen, iPhone 393×852, dark. Full-height calm night-sky gradient
(#0D0B12→#3D0E2A→#0B1B4A) with a few slow light motes. Upper half: [RUBY FIGURE] (pose: wave)
on the left and [SAPPHIRE FIGURE] (pose: wave) on the right, each on a small crystal plinth,
their coloured light drifting toward a floating original Garnet crystal in the centre that glows
violet. Below: "Garnet" wordmark in the display serif, then "Two lives. One space." in secondary
text. Bottom: primary pill button "Create account" (violet accent), secondary text button
"Sign in", and a one-line privacy note: "A private space for just the two of you."
Respect safe areas. Premium, quiet, cinematic; generous negative space.
```

**States:** default · artwork unavailable (crystal only, figures replaced by soft gem silhouettes) · reduced motion (static composition) · light mode · small screen (figures scale down, buttons stay above the fold).
**Never:** a "days apart" counter, sign-up pressure, official artwork pasted in.

### AUTH-02 · Create account

Route `/(auth)/create-account`

```text
Garnet "Create account" form, iPhone 393×852, dark. Compact header with back chevron and title
"Create your account". Small Garnet crystal glyph at top. Fields with visible labels: Display
name, Email (email keyboard), Password (with show/hide), Confirm password. Helper under password:
"At least 12 characters." Terms and privacy links in footnote. Primary pill "Create account"
pinned above the keyboard. Below: "Already have an account? Sign in". Calm, roomy spacing;
inline errors appear under the specific field in danger colour with an icon.
```

**States:** empty · filled · inline errors (malformed email, passwords don't match, weak password, display name empty) with valid input retained · duplicate email ("An account may already exist for this email. Try signing in.") · submitting (button spinner, fields disabled) · service failure (toast "That didn't work. Try again." with input preserved) · success → AUTH-04 · keyboard open on a 375×667 frame.
**Never:** reveal whether an email exists beyond the neutral copy; claim a real email was sent.

### AUTH-03 · Sign in

Route `/(auth)/sign-in`

```text
Garnet "Sign in" screen, iPhone 393×852, dark. Title "Welcome back" in display serif with a
small crystal above. Fields: Email, Password (show/hide). Row: "Keep me signed in on this
device" toggle; text link "Forgot password?". Primary pill "Sign in"; secondary "Create account".
Minimal, centred, lots of air.
```

**States:** default · filled · incorrect details (generic: "Those details don't match. Try again.") · too many attempts ("Please wait a moment before trying again.") · signing in · offline banner · success → paired Home or pairing flow.
**Never:** say which field was wrong.

### AUTH-04 · Verify email

Route `/(auth)/verify-email`

```text
Garnet "Check your email" screen, iPhone 393×852, dark. A softly glowing envelope-shaped gem
capsule (original motif) centred. Title "Check your email". Body: "We sent a verification link
to s***@example.test. Open it on this phone to continue." Buttons: primary "Open email preview
(demo)" which opens the email preview lab, secondary "Resend email", text "Change email".
Small "Simulated — no email is sent" badge.
```

**States:** waiting · resent ("Sent again.") with cooldown timer on the button · verification success (crystal brightens, "Email verified", Continue) · expired link ("This link has expired. We can send a new one.") · already verified.

### AUTH-05 · Forgot password

Route `/(auth)/forgot-password`

```text
Garnet "Reset your password" screen, iPhone 393×852, dark. Short explanation: "Enter your email
and we'll send a reset link if an account exists." Email field, primary "Send reset link",
back to sign in. Calm, minimal.
```

**States:** default · submitting · sent (always the same neutral message: "If an account exists for this email, a reset link is on its way.") · offline · failure.
**Never:** confirm whether the account exists.

### AUTH-06 · Reset password (link preview)

Route `/(auth)/reset-password`

```text
Garnet "Choose a new password" screen opened from an email link, iPhone 393×852, dark. Fields:
New password, Confirm new password, helper text. Primary "Save new password". Info line:
"This signs you out on your other devices."
```

**States:** valid link · expired link · already-used link · invalid link (all three: calm explanation + "Request a new link") · weak/mismatch errors · success ("Password updated" → Sign in).

### AUTH-07 · Session expired

Route global overlay → `/(auth)/sign-in`

```text
Garnet "Session expired" full-screen state, dark. Protected content is NOT visible behind it
(solid background, no blur of private content). Small crystal, title "Please sign in again",
body "For your privacy, you've been signed out on this device.", primary "Sign in".
```

### AUTH-08 · Sign out confirmation

Dialog (see also SYS overlays)

```text
Garnet dialog "Sign out?" over a dimmed Settings screen. Body: "Drafts saved on this device
stay here until you sign back in." Buttons: "Cancel" and "Sign out".
```

**States:** default · with unsent items ("You have 2 moments waiting to send. They'll stay on this device.").
