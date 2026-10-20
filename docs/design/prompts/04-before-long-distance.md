# 04 — Before long distance

Spec: §6 Stage 1, §9, A1 "Before long distance", A2 "Start Long Distance". The app is useful while the couple is still together. **No dominant days-apart counter** anywhere (non-negotiable design rule).

### PRE-01 · Pre-long-distance Home

```text
Garnet Home before long distance, iPhone 393×852, dark. Header: "Good evening, Selam" with
avatar. Hero: Garnet crystal resting, both figures ([RUBY FIGURE] idle left, [SAPPHIRE FIGURE]
idle right) close together on one plinth. Line: "Prepare your space together." A gentle setup
checklist card with 6 rows and checkmarks: Add important dates, Prepare an Open When letter,
Add a memory, Plan "when we meet again", Choose how days are revealed, Set notifications.
Bottom: subtle card "Start our long distance" with chevron. Tab bar visible.
```

**States:** nothing done · partially done · all done (checklist collapses to "Your space is ready").

### PRE-02 · Add important date

```text
Garnet sheet "Add a date that matters", dark. Fields: Title, Type chips (Birthday, Anniversary,
First met, First date, Travel, Custom), Date picker, Repeats yearly toggle, "Whose time zone?"
(shown with both local times). Primary "Save date".
```

### PRE-03 · Prepare Open When (entry)

Links to OPEN-02. Prompt: same as OPEN-02 with a "before you go" header line: "Leave something for the days apart."

### PRE-04 · Add an existing memory

Links to MEM-04 with a header "Bring a memory with you."

### PRE-05 · Day-reveal setup (U-02, U-06)

```text
Garnet "How should your days meet?" screen, dark. Three selectable cards with small icons:
"When we've both finished our day" (default), "At a set time", "When I choose". Under "At a set
time": a time row showing the time in both zones ("04:00 London · 07:00 Addis Ababa"), marked
"Provisional — cutoff not decided yet". Explainer: "Thoughts, Missing You and I Need You always
arrive right away." Primary "Save".
```

**States:** each option selected · provisional cutoff label always visible.

### PRE-06 · Notification setup

Same as SETUP-07, accessed from the checklist.

### PRE-07 · Shared identity customization

```text
Garnet "Our space" customization, dark. Live preview of the shared Garnet hero. Fields: space
name ("Our space"), shared accent (Garnet violet default, slight variations), background
(night sky / soft aurora / plain). Save / Cancel; Reset to default.
```

### PRE-08 · Start Long Distance — intro

```text
Garnet "Ready to begin our next chapter?" screen, dark, cinematic. Full-bleed night-sky
gradient. [RUBY FIGURE] (pose: hug) and [SAPPHIRE FIGURE] (pose: hug) together in the centre
on one crystal plinth. Title in display serif, body: "Your shared space is ready. When you both
confirm, Garnet will begin your long-distance chapter." Primary "I'm ready", secondary "Not yet".
```

### PRE-09 · Start Long Distance — confirmation states

```text
Garnet confirmation status screen, dark. Two avatars with rings and status under each:
"You · Confirmed ✓" and "Noah · Waiting…" with a slow pulse. Body: "Garnet begins your
chapter when you've both confirmed." Text button "Change my mind".
```

**States:** you confirmed / partner waiting · partner confirmed / you waiting (primary "Confirm") · both confirmed → PRE-10.

### PRE-10 · Our next chapter has begun (transition)

```text
Garnet chapter-begins transition, dark, 2–3 s, skippable. Ruby light from the left and sapphire
light from the right travel along two arcs and meet as a violet Garnet crystal in the centre;
the figures step apart slightly to either side, still facing each other. Title fades in:
"Our next chapter has begun. ❤️💙". Then the app settles into Home. Storyboard 5 frames,
plus the reduced-motion version (cross-fade to final frame).
```

**Never:** a "0 days apart" counter, countdowns, or sad framing.
