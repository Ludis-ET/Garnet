# 12 — Surprises

Spec: §29, §62, A1 "Surprises", A2 "Surprise drops". Contents stay hidden until opened: notifications, lists, widgets and search show only a safe title or generic copy ("You have something waiting for you. 🎁"). Cancellation and edit-after-open semantics are undecided (spec A2): design the sender options but label them provisional.

### SUR-01 · Surprise library

Route `/(tabs)/moments/surprises`

```text
Garnet Surprises, iPhone 393×852, dark. Segmented "For me · From me". Elegant gift-like gem
capsules (violet ribbon of light), each with a safe title ("Something for you"), sender, and
status chip: "Scheduled", "Ready", "Opened", "Cancelled". Floating "Create surprise".
```

**States:** populated · empty for me ("Surprises from Noah will wait here.") · empty from me · loading.

### SUR-02 · Create — choose content

```text
Garnet "Create a surprise" step 1: content type cards — Message, Photo, Video, Voice note,
Letter, Song link, Future-date idea. Then the editor for the chosen type.
```

### SUR-03 · Reveal condition

```text
Garnet "When should Noah get it?" step: Date and time (both zones), On an event (birthday,
anniversary, custom), Right away. Secrecy option: "Show a title before opening" toggle with a
safe title field, or keep fully generic.
```

### SUR-04 · Sender preview

```text
Garnet "What Noah will see" preview: the locked capsule exactly as the recipient sees it, the
notification preview ("You have something waiting for you. 🎁"), and the opened view. Buttons:
Back, primary "Lock surprise".
```

### SUR-05 · Scheduled / locked (both sides)

```text
Garnet locked surprise detail: capsule with a soft lock glyph, "Opens on Noah's birthday ·
14 Nov". Sender view adds provisional actions "Edit" and "Cancel surprise" (labelled
"Rules not final"). Recipient view shows no contents and no hints.
```

### SUR-06 · Open surprise

```text
Garnet surprise opening: "Open your surprise?" Not now / Open; short reveal animation
(capsule ribbon of light unwraps, ≤ 1.5 s, skippable), then the content full-screen with
"Save as memory" and "Send a thought back". Reduced-motion version.
```

### SUR-07 · Expired, cancelled, unavailable, delivery error

```text
Garnet surprise edge states: cancelled ("This surprise was withdrawn."), unavailable ("This item
isn't available here."), simulated delivery error for the sender ("Couldn't schedule this yet.
Try again."). Calm, no blame.
```
