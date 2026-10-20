# 05 — Home

Spec: §10, A1 "Home", A2 "Home", A3 "Quick Log sheet", "Emotional action sheet". Order: greeting/profile → shared hero → compact emotional actions → quick log → recent moments → one upcoming event (if any) → one safe waiting item → tab bar. Useful within seconds. **No relationship score, streak or guilt language.** Spark/grace behaviour is open (U-03, U-04, U-24): show no streak number.

### HOME-01 · Home (default)

Route `/(tabs)/home`

```text
Garnet Home, iPhone 393×852, dark, premium and calm. Header: "Good morning, Selam" in display
serif, small line "It's 09:12 for you · 07:12 for Noah", avatar button (opens profile menu).
Hero (about 40% of the height): the original Garnet crystal floating, ruby glow entering from the
left, sapphire glow from the right, meeting as violet in the core; [GARNET FIGURE] (pose: holding
the crystal) optional behind it, softly lit. Below the hero, a row of 3 compact emotional action
buttons with icon + label: "💭 Thought of You", "🥺 Missing You", "🫂 I Need You" (pills, glass
surface). Then a wide primary "＋ Log something" button. Section "Today" with the last 3 moments
as minimal rows (time, icon, short text, thumbnail). One quiet card "Coming up: Noah's birthday ·
in 4 days". One safe waiting item: "Something is waiting for you 💜" (no content). Tab bar:
Home (selected), Days, Us, Moments, Our World.
```

**States:** default · first use (no moments: "Your days will gather here, one small moment at a time." + Log something) · empty recent moments · with upcoming event · with waiting item (letter or surprise) · both shown · offline banner on top ("You're offline. Some changes may wait to sync.") · notification-permission banner ("Turn on gentle notifications?" with Not now) · loading skeleton · artwork unavailable · light mode · reduced motion (crystal static).

### HOME-02 · Hero reacts to activity

```text
Three storyboard frames of the Garnet Home hero reacting: (1) after Selam logs a moment, a small
ruby light drifts into the crystal; (2) when Noah's thought arrives, a sapphire light drifts in;
(3) when both interact with the same memory, the core softly turns violet for 1 s. Subtle,
under 1 s each, never blocking. Include the reduced-motion version (static glow change).
```

### HOME-03 · Quick log sheet

```text
Garnet "Log something" bottom sheet over a dimmed Home, dark. Grabber, title "What's happening?"
Large single-line text field with placeholder "A small moment…". Row of type chips: Text, Photo,
Video, Voice, Feeling, Activity, Food, Work, Place, More. Optional mood picker row of 6 soft emoji
chips. Footer: "Visible to Noah after your days meet" with a change link (visibility), text button
"More options", primary "Save". Autosave hint: "Draft saved on this device."
```

**States:** empty · typing · photo attached (thumbnail with remove) · saving · saved toast "Saved to your day." · cancel with text → keep draft, no dialog · discard confirmation only if media selected.

### HOME-04 · Emotional action sheet

```text
Garnet emotional actions sheet (from the "Us" quick actions), dark. Title "Send something to
Noah". Large rows with icon, title and one-line meaning: Thought of You, Missing You, I Need You,
I Need to Talk, Please Check On Me, I Can't Talk Yet, I'm Okay Now. Each row opens its compose
sheet. Nothing sends on a single accidental tap.
```

### HOME-05 · Profile menu

```text
Garnet profile menu popover from the Home avatar, dark. Rows: profile (avatar + name + side),
"Settings", "Notification preview lab", "Reset demo data" (prototype badge), "Sign out".
```
