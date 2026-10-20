# 02 — Pairing

Spec: §5, §7, A1 "Pairing", A2 "Pairing / invite", A3 "Expired invitation". No working external invite links exist in Phase 2: invites are local previews (**P-18** proposed rules: single-use, ≤ 24 h, generic invalid message). Open: invitation delivery and lifecycle (**U-33**), re-pairing (**U-32**).

### PAIR-01 · Create our space

Route `/(onboarding)/pair`

```text
Garnet pairing intro, iPhone 393×852, dark. Title in display serif: "Create our space".
Body: "Garnet is for exactly two people. Invite your person, and only the two of you will see
what you share." Visual: two small gem lights (ruby left, sapphire right) with a dotted path
between them toward a dim Garnet crystal in the centre. Primary "Invite my person";
secondary "I have an invitation". Footnote: "Invitations expire and work once."
```

**States:** default · already paired (redirects; show the conflict screen PAIR-07 if forced).

### PAIR-02 · Invitation generated

Route `/(onboarding)/pair/invite`

```text
Garnet "Your invitation" screen, dark. A ruby-to-violet glowing invitation card with a short
code in large, spaced, readable monospace (e.g. "GRNT-4KQ7") and the line "Expires in 24 hours
· works once". Actions: primary "Share invitation", secondary "Copy code". Below: waiting
state row "Waiting for your person to join…" with a slow pulse. Text button "Revoke invitation".
Badge "Simulated invitation".
```

**States:** generated · copied (toast "Copied") · share sheet preview (iOS and Android variants) · waiting · expired (card dims: "This invitation has expired." + "Create a new one") · revoked confirmation dialog.

### PAIR-03 · Join from invitation

Route `/(onboarding)/pair/join`

```text
Garnet "Join your person" screen, dark. Field "Invitation code" with large spaced input,
paste button, primary "Continue". Help text: "Ask your person for the code from their Garnet app."
```

**States:** empty · typing · checking · invalid / expired / used (one identical calm message: "This invite isn't valid anymore — ask your person for a new one.").

### PAIR-04 · Review relationship identity

Route `/(onboarding)/pair/review`

```text
Garnet "Review invitation" screen, dark. Centre: inviter's avatar with a ruby ring and display
name "Noah" (inviter-chosen), and the line "invited you to a private space for two."
Info list with icons: "Only the two of you can see what's inside", "You can leave at any time",
"Garnet never shares your data". Buttons: primary "Accept and connect", secondary "Decline".
Safety footnote: "Only accept if you know this person."
```

**States:** default · declining confirmation · accepting (button loading).

### PAIR-05 · Connected

Route `/(onboarding)/pair/connected`

```text
Garnet "You're connected" celebration, dark. [RUBY FIGURE] (pose: happy) left and
[SAPPHIRE FIGURE] (pose: happy) right, their lights meeting in the centre as the Garnet crystal
lights up violet with a short soft bloom. Title: "You're connected. ❤️💙". Body: "Let's set up
your space." Primary "Continue". Short, skippable animation.
```

**States:** default · reduced motion (static final frame) · artwork unavailable.

### PAIR-06 · Partner accepted (inviter side)

```text
Garnet in-app moment for the inviter when the partner accepts, dark: a calm full-width card
"Selam joined your space." with both avatars (ruby and sapphire rings) and "Continue setup".
```

### PAIR-07 · Already paired conflict

```text
Garnet "Already connected" screen, dark. Body: "You're already in a space with Noah. Garnet
is for exactly two people." Buttons: "Go to my space" (primary), "Learn about leaving a space"
(text link to Settings → Shared space).
```
