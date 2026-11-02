# 16 — System overlays and universal states

Spec: A1 "System/overlays", A3 (catalogue), A4 (copy), A2 "Universal states", §9 (required state coverage), §10 (mobile quality). Every overlay has a trigger and a dismissal rule. Destructive actions explain their exact scope and use a precisely named confirm button.

### SYS-01 · Overlay catalogue board

```text
Garnet overlay catalogue board (dark and light), each shown over a dimmed screen with its
trigger noted: Quick Log sheet; Emotional action sheet; Media source sheet; Mood/activity
picker; Reaction picker; Message context menu; Delete for me; Delete for everyone; Discard
changes ("Keep editing" / "Discard"); Open letter confirmation; Delete letter/memory (states
what is removed); Save chat media as memory; Event date/time picker with timezone; Start
long-distance confirmation; End relationship/unpair (consequences, export, confirmation
phrase); Delete account; Notification permission rationale ("Not now" / "Continue"); Media
permission rationale (with limited access); Clear search history; Reset demo data; Sign out;
Expired invitation; Session expired; Offline/pending action; Permission denied (Settings path +
alternative); Edit personalization (live preview, Save/Cancel/Reset); Reminder options.
Bottom sheets: grabber, title, swipe-down to dismiss (except mid-destructive flows).
Dialogs: centred, title, body, max two actions, destructive in danger colour, Cancel first.
Android: hardware back closes the top overlay.
```

### SYS-02 · Toasts and banners

```text
Garnet feedback patterns board: toast "Saved to your day." (with subtle check); local draft
"Draft saved on this device."; pending "Waiting to sync when you're back online." (labelled
simulated); recoverable error "That didn't work. Try again." with Retry; offline banner "You're
offline. Some changes may wait to sync."; permission denied "Garnet can work without this
permission. You can enable it in Settings later."; removed "Removed from this view."; app update
notice "A new version is ready — restart when you like." Toasts sit above the tab bar, auto-dismiss
in 4 s (errors stay until dismissed), and are announced to screen readers.
```

### SYS-03 · Empty, loading, slow and skeleton

```text
Garnet states board: skeletons for a timeline, a grid and a detail page (soft shimmer, static in
reduced motion); slow state after 3 s ("Still working on it…"); empty states with a small
[FIGURE] slot or crystal, one warm line and one action: Days "Your days will gather here, one
small moment at a time.", Memories "Your story starts with one memory.", Letters "Leave something
for the days apart.", Search "Nothing found. Try another word or filter."
```

### SYS-04 · Errors and edge states

```text
Garnet error and edge states board: fatal error screen "Something went wrong ❤️ — Your moment is
still safe. Try again."; unavailable "This item isn't available here." (no details); unauthorized
(same copy, no leak); expired link; duplicate action ("Already sent."); media progress and retry;
long text and long names truncation; compact 375×667 screen with keyboard open; session expired
(content hidden). Plain language, input always preserved.
```

### SYS-05 · Tab bar and headers

```text
Garnet navigation board: frosted glass tab bar (Home, Days, Us, Moments, Our World), thin line
icons, selected tab filled with the active accent and a label; badge style for new items (a dot,
never a count of emotional signals). Headers: large title collapsing to compact on scroll, back
behaviour, iOS swipe-back and Android back noted.
```

### SYS-06 · Demo / prototype affordances

```text
Garnet prototype affordances: a small "Simulated" badge style for fake sends and emails, the
developer settings panel (simulate offline, simulate failures, latency slider, reset demo data),
and the notification/email preview lab entry. Clearly secondary, never mistaken for real features.
```

## Built (P-70)

- **SYS-03:** skeletons in glass (timeline, grid, detail) on the main screens, still under reduced motion, with "Still working on it…" after 3 s.
- **SYS-04:** a calm error state with Try again on Home and Us.
- **SYS-01, SYS-02:** a live board under Settings › Prototype › Overlays & states, with every overlay (tap outside to close), every toast, loading, error, unavailable and empty states.
- **SYS-05:** badges are this person's own counts. The bell never counts emotional signals; a new signal only lights a dot.
