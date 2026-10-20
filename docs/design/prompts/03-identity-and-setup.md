# 03 — Identity and setup

Spec: §8, A1 "Identity/setup", A2 "Identity setup". Each partner sets this up for themselves. Whether each person picks their own gem is **U-22**: design the picker, and also the read-only "assigned" variant. Permissions are explained before any OS prompt and are simulated in Phase 2.

### SETUP-01 · Setup progress shell

```text
Garnet setup flow shell, iPhone 393×852, dark. Thin segmented progress indicator at top
(5 steps), back chevron, "Skip for now" where a step is optional. Large title area, content,
and a primary pill "Continue" pinned to the bottom above the safe area.
```

### SETUP-02 · Display name and nickname

```text
Garnet setup step "What should Noah call you?", dark. Fields: Display name (prefilled), optional
Nickname with helper "Only your person sees this." Live preview card below showing how a
notification greeting reads: "A little thought from Selam." Primary "Continue".
```

**States:** default · long name (truncation rules shown) · error (empty name).

### SETUP-03 · Avatar

```text
Garnet setup step "Your picture", dark. Large circular avatar preview with a soft ring in the
viewer's side colour. Options: "Choose a photo", "Take a photo", "Use initials". Initials
avatar uses a ruby or sapphire gradient. Primary "Continue", text "Skip".
```

**States:** none chosen (initials) · photo chosen · photo permission rationale sheet · permission denied ("Garnet can work without this permission. You can enable it in Settings later.").

### SETUP-04 · Choose your side (U-22)

```text
Garnet setup step "Choose your side", dark. Two tall premium cards side by side. Left: Ruby —
warm ruby gradient, [RUBY FIGURE] (pose: idle) on a crystal plinth, label "Ruby", line "Warm,
expressive, alive." Right: Sapphire — cool sapphire gradient, [SAPPHIRE FIGURE] (pose: idle),
label "Sapphire", line "Calm, dreamy, spacious." Selected card: brighter rim light and a check
badge (not colour alone). Footnote: "Your person will be the other side. Together you're Garnet."
Primary "Continue".
```

**States:** none selected · Ruby selected · Sapphire selected · side already taken by partner (card disabled with "Noah is Sapphire") · assigned variant (read-only, if U-22 decides no choice) · artwork unavailable.

### SETUP-05 · Timezone

```text
Garnet setup step "Where's home right now?", dark. Detected timezone row "Addis Ababa (GMT+3)"
with a check, "Change" opens a searchable list. Explainer card: "Garnet shows each moment in
your own time, and your person's time when it helps." Example row: "09:03 for you · 07:03 for Noah".
```

**States:** detected · searching · selected · DST note for London ("Noah's time changes with UK daylight saving").

### SETUP-06 · Theme preview

```text
Garnet setup step "Your look", dark. Live mini-preview of the Home screen in a phone frame
using the chosen side colour. Controls: Appearance (System / Dark / Light) segmented control;
"Accent intensity" (Subtle / Rich). Primary "Continue".
```

### SETUP-07 · Notification explanation and preferences

```text
Garnet setup step "Stay close, gently", dark. Short explanation: "Garnet can let you know when
Noah thinks of you or needs you. Previews stay private on your lock screen." Three grouped toggle
rows: "Thoughts and Missing You", "Support requests", "Days and letters". A preview of a generic
lock-screen notification: "Garnet — Something new for you 💜". Primary "Turn on notifications"
(opens the rationale), secondary "Not now".
```

**States:** default · permission rationale · simulated OS prompt · denied (explain later path) · enabled.

### SETUP-08 · Setup summary

```text
Garnet "You're all set" summary, dark. Avatar with side ring, name, timezone, side, notifications
status as a short list with edit chevrons. [GARNET FIGURE] (pose: holding the crystal) small
at top, or crystal only. Primary "Go to our space".
```
