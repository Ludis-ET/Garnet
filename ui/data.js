/**
 * GARNET UI PROTOTYPE — PROMPT CATALOG & SPEC DATA
 * Exhaustive database of all 17 prompt areas and COMP-01
 */

const GARNET_DATA = {
  categories: [
    {
      id: "comp",
      title: "Global Design System",
      file: "README.md",
      prompts: [
        {
          id: "COMP-01",
          title: "Global Component Sheet",
          route: "/design-system/components",
          states: ["dark-mode", "light-mode", "ruby-accent", "sapphire-accent"],
          guardrails: ["Touch targets ≥ 48 pt", "WCAG 2.2 AA contrast", "No color-only status"],
          prompt: "Using the Garnet master style, design a component sheet on a 1440-wide board, dark and light: buttons (primary pill with accent fill, secondary outline, tertiary text, destructive, icon button; default/pressed/disabled/loading), text field and text area (label, helper, error, focused, filled, password reveal), toggle, segmented control, select row, list row (with chevron, with toggle, destructive), avatar (photo, initials, ruby/sapphire ring), chip/tag, media tile (photo, video with duration, voice note with waveform, uploading with progress, failed with retry), card (quiet hairline), bottom sheet (grabber, title, content, actions), dialog (title, body, cancel, confirm, destructive confirm), toast/snackbar (success, error with retry), banner (offline, permission, pending), skeleton blocks, empty state (figure slot + line + action), error state, 'Only you' privacy badge, 'Simulated' demo badge, tab bar (5 tabs: Home, Days, Us, Moments, Our World; selected/unselected), header (large title, compact, with back), segmented page tabs, date separator, timestamp with local + partner time."
        }
      ]
    },
    {
      id: "01-auth",
      title: "01 · Welcome & Account",
      file: "01-welcome-and-account.md",
      prompts: [
        {
          id: "AUTH-01",
          title: "Welcome",
          route: "/(auth)/welcome",
          states: ["default", "artwork-unavailable", "reduced-motion"],
          guardrails: ["No days apart counter", "No signup pressure", "No official artwork pasted in"],
          prompt: "Garnet Welcome screen, iPhone 393×852, dark. Full-height calm night-sky gradient (#0D0B12→#3D0E2A→#0B1B4A) with a few slow light motes. Upper half: [RUBY FIGURE] (pose: wave) on the left and [SAPPHIRE FIGURE] (pose: wave) on the right, each on a small crystal plinth, their coloured light drifting toward a floating original Garnet crystal in the centre that glows violet. Below: 'Garnet' wordmark in the display serif, then 'Two lives. One space.' in secondary text. Bottom: primary pill button 'Create account' (violet accent), secondary text button 'Sign in', and a one-line privacy note: 'A private space for just the two of you.'"
        },
        {
          id: "AUTH-02",
          title: "Create account",
          route: "/(auth)/create-account",
          states: ["empty", "filled", "inline-errors", "submitting", "duplicate-email"],
          guardrails: ["Never reveal whether an email exists beyond neutral copy", "Never claim a real email was sent"],
          prompt: "Garnet 'Create account' form, iPhone 393×852, dark. Compact header with back chevron and title 'Create your account'. Small Garnet crystal glyph at top. Fields with visible labels: Display name, Email (email keyboard), Password (with show/hide), Confirm password. Helper under password: 'At least 12 characters.' Terms and privacy links in footnote. Primary pill 'Create account' pinned above the keyboard. Below: 'Already have an account? Sign in'."
        },
        {
          id: "AUTH-03",
          title: "Sign in",
          route: "/(auth)/sign-in",
          states: ["default", "filled", "incorrect-details", "too-many-attempts", "signing-in"],
          guardrails: ["Never say which field was wrong", "Generic error messages only"],
          prompt: "Garnet 'Sign in' screen, iPhone 393×852, dark. Title 'Welcome back' in display serif with a small crystal above. Fields: Email, Password (show/hide). Row: 'Keep me signed in on this device' toggle; text link 'Forgot password?'. Primary pill 'Sign in'; secondary 'Create account'. Minimal, centred, lots of air."
        },
        {
          id: "AUTH-04",
          title: "Verify email",
          route: "/(auth)/verify-email",
          states: ["waiting", "resent", "verified-success", "expired-link"],
          guardrails: ["Badge 'Simulated — no email is sent'"],
          prompt: "Garnet 'Check your email' screen, iPhone 393×852, dark. A softly glowing envelope-shaped gem capsule (original motif) centred. Title 'Check your email'. Body: 'We sent a verification link to s***@example.test. Open it on this phone to continue.' Buttons: primary 'Open email preview (demo)' which opens the email preview lab, secondary 'Resend email', text 'Change email'. Small 'Simulated — no email is sent' badge."
        },
        {
          id: "AUTH-05",
          title: "Forgot password",
          route: "/(auth)/forgot-password",
          states: ["default", "submitting", "sent-confirmation", "offline"],
          guardrails: ["Never confirm whether the account exists"],
          prompt: "Garnet 'Reset your password' screen, iPhone 393×852, dark. Short explanation: 'Enter your email and we'll send a reset link if an account exists.' Email field, primary 'Send reset link', back to sign in. Calm, minimal."
        },
        {
          id: "AUTH-06",
          title: "Reset password (link preview)",
          route: "/(auth)/reset-password",
          states: ["valid-link", "expired-link", "weak-mismatch", "success"],
          guardrails: ["Signs out on other devices notice"],
          prompt: "Garnet 'Choose a new password' screen opened from an email link, iPhone 393×852, dark. Fields: New password, Confirm new password, helper text. Primary 'Save new password'. Info line: 'This signs you out on your other devices.'"
        },
        {
          id: "AUTH-07",
          title: "Session expired",
          route: "/(auth)/session-expired",
          states: ["default"],
          guardrails: ["Protected content NOT visible behind it (solid background, no blur)"],
          prompt: "Garnet 'Session expired' full-screen state, dark. Protected content is NOT visible behind it (solid background, no blur of private content). Small crystal, title 'Please sign in again', body 'For your privacy, you've been signed out on this device.', primary 'Sign in'."
        },
        {
          id: "AUTH-08",
          title: "Sign out confirmation",
          route: "/(dialog)/sign-out",
          states: ["default", "with-unsent-items"],
          guardrails: ["Drafts stay on device reassurance"],
          prompt: "Garnet dialog 'Sign out?' over a dimmed Settings screen. Body: 'Drafts saved on this device stay here until you sign back in.' Buttons: 'Cancel' and 'Sign out'."
        }
      ]
    },
    {
      id: "02-pair",
      title: "02 · Pairing",
      file: "02-pairing.md",
      prompts: [
        {
          id: "PAIR-01",
          title: "Create our space",
          route: "/(onboarding)/pair",
          states: ["default"],
          guardrails: ["Invitations expire and work once (P-18)"],
          prompt: "Garnet pairing intro, iPhone 393×852, dark. Title in display serif: 'Create our space'. Body: 'Garnet is for exactly two people. Invite your person, and only the two of you will see what you share.' Visual: two small gem lights (ruby left, sapphire right) with a dotted path between them toward a dim Garnet crystal in the centre. Primary 'Invite my person'; secondary 'I have an invitation'."
        },
        {
          id: "PAIR-02",
          title: "Invitation generated",
          route: "/(onboarding)/pair/invite",
          states: ["generated", "waiting", "expired", "revoked"],
          guardrails: ["Simulated invitation badge", "Single-use 24h expiration"],
          prompt: "Garnet 'Your invitation' screen, dark. A ruby-to-violet glowing invitation card with a short code in large, spaced, readable monospace (e.g. 'GRNT-4KQ7') and the line 'Expires in 24 hours · works once'. Actions: primary 'Share invitation', secondary 'Copy code'. Below: waiting state row 'Waiting for your person to join…' with a slow pulse."
        },
        {
          id: "PAIR-03",
          title: "Join from invitation",
          route: "/(onboarding)/pair/join",
          states: ["empty", "typing", "checking", "invalid-expired"],
          guardrails: ["Identical calm message on invalid/expired/used"],
          prompt: "Garnet 'Join your person' screen, dark. Field 'Invitation code' with large spaced input, paste button, primary 'Continue'. Help text: 'Ask your person for the code from their Garnet app.'"
        },
        {
          id: "PAIR-04",
          title: "Review relationship identity",
          route: "/(onboarding)/pair/review",
          states: ["default", "accepting", "declining"],
          guardrails: ["Safety footnote: Only accept if you know this person"],
          prompt: "Garnet 'Review invitation' screen, dark. Centre: inviter's avatar with a ruby ring and display name 'Noah' (inviter-chosen), and the line 'invited you to a private space for two.' Info list with icons: 'Only the two of you can see what's inside', 'You can leave at any time', 'Garnet never shares your data'. Buttons: primary 'Accept and connect', secondary 'Decline'."
        },
        {
          id: "PAIR-05",
          title: "Connected",
          route: "/(onboarding)/pair/connected",
          states: ["default", "artwork-unavailable", "reduced-motion"],
          guardrails: ["Celebration moment with both lights meeting in centre"],
          prompt: "Garnet 'You're connected' celebration, dark. [RUBY FIGURE] (pose: happy) left and [SAPPHIRE FIGURE] (pose: happy) right, their lights meeting in the centre as the Garnet crystal lights up violet with a short soft bloom. Title: 'You're connected. ❤️💙'. Body: 'Let's set up your space.' Primary 'Continue'."
        },
        {
          id: "PAIR-06",
          title: "Partner accepted (inviter side)",
          route: "/(onboarding)/pair/partner-accepted",
          states: ["default"],
          guardrails: ["Calm full-width card with both avatars"],
          prompt: "Garnet in-app moment for the inviter when the partner accepts, dark: a calm full-width card 'Selam joined your space.' with both avatars (ruby and sapphire rings) and 'Continue setup'."
        },
        {
          id: "PAIR-07",
          title: "Already paired conflict",
          route: "/(onboarding)/pair/conflict",
          states: ["default"],
          guardrails: ["Exactly two people rule explained calmly"],
          prompt: "Garnet 'Already connected' screen, dark. Body: 'You're already in a space with Noah. Garnet is for exactly two people.' Buttons: 'Go to my space' (primary), 'Learn about leaving a space' (text link to Settings → Shared space)."
        }
      ]
    },
    {
      id: "03-setup",
      title: "03 · Identity & Setup",
      file: "03-identity-and-setup.md",
      prompts: [
        {
          id: "SETUP-01",
          title: "Setup progress shell",
          route: "/(onboarding)/setup/shell",
          states: ["step-1", "step-3", "step-5"],
          guardrails: ["Thin 5-step progress indicator", "Skip for now where optional"],
          prompt: "Garnet setup flow shell, iPhone 393×852, dark. Thin segmented progress indicator at top (5 steps), back chevron, 'Skip for now' where a step is optional. Large title area, content, and a primary pill 'Continue' pinned to the bottom above the safe area."
        },
        {
          id: "SETUP-02",
          title: "Display name and nickname",
          route: "/(onboarding)/setup/name",
          states: ["default", "with-nickname", "long-name", "error-empty"],
          guardrails: ["'Only your person sees this' helper"],
          prompt: "Garnet setup step 'What should Noah call you?', dark. Fields: Display name (prefilled), optional Nickname with helper 'Only your person sees this.' Live preview card below showing how a notification greeting reads: 'A little thought from Selam.' Primary 'Continue'."
        },
        {
          id: "SETUP-03",
          title: "Avatar",
          route: "/(onboarding)/setup/avatar",
          states: ["initials", "photo-chosen", "permission-sheet"],
          guardrails: ["Side ring in ruby or sapphire gradient"],
          prompt: "Garnet setup step 'Your picture', dark. Large circular avatar preview with a soft ring in the viewer's side colour. Options: 'Choose a photo', 'Take a photo', 'Use initials'. Initials avatar uses a ruby or sapphire gradient. Primary 'Continue', text 'Skip'."
        },
        {
          id: "SETUP-04",
          title: "Choose your side (U-22)",
          route: "/(onboarding)/setup/side",
          states: ["ruby-selected", "sapphire-selected", "side-taken", "assigned-variant"],
          guardrails: ["Status not by colour alone (rim light + check badge)"],
          prompt: "Garnet setup step 'Choose your side', dark. Two tall premium cards side by side. Left: Ruby — warm ruby gradient, [RUBY FIGURE] (pose: idle) on a crystal plinth, label 'Ruby', line 'Warm, expressive, alive.' Right: Sapphire — cool sapphire gradient, [SAPPHIRE FIGURE] (pose: idle), label 'Sapphire', line 'Calm, dreamy, spacious.' Selected card: brighter rim light and a check badge (not colour alone). Footnote: 'Your person will be the other side. Together you're Garnet.' Primary 'Continue'."
        },
        {
          id: "SETUP-05",
          title: "Timezone",
          route: "/(onboarding)/setup/timezone",
          states: ["detected", "dst-note-london"],
          guardrails: ["Shows both local times (Addis Ababa GMT+3 & London)"],
          prompt: "Garnet setup step 'Where's home right now?', dark. Detected timezone row 'Addis Ababa (GMT+3)' with a check, 'Change' opens a searchable list. Explainer card: 'Garnet shows each moment in your own time, and your person's time when it helps.' Example row: '09:03 for you · 07:03 for Noah'."
        },
        {
          id: "SETUP-06",
          title: "Theme preview",
          route: "/(onboarding)/setup/theme",
          states: ["dark-rich", "dark-subtle", "light-mode"],
          guardrails: ["Live mini-preview in phone frame"],
          prompt: "Garnet setup step 'Your look', dark. Live mini-preview of the Home screen in a phone frame using the chosen side colour. Controls: Appearance (System / Dark / Light) segmented control; 'Accent intensity' (Subtle / Rich). Primary 'Continue'."
        },
        {
          id: "SETUP-07",
          title: "Notification preferences",
          route: "/(onboarding)/setup/notifications",
          states: ["default", "permission-rationale", "enabled"],
          guardrails: ["Preview shows generic lock-screen notification by default"],
          prompt: "Garnet setup step 'Stay close, gently', dark. Short explanation: 'Garnet can let you know when Noah thinks of you or needs you. Previews stay private on your lock screen.' Three grouped toggle rows: 'Thoughts and Missing You', 'Support requests', 'Days and letters'. A preview of a generic lock-screen notification: 'Garnet — Something new for you 💜'. Primary 'Turn on notifications' (opens the rationale), secondary 'Not now'."
        },
        {
          id: "SETUP-08",
          title: "Setup summary",
          route: "/(onboarding)/setup/summary",
          states: ["default", "artwork-unavailable"],
          guardrails: ["Edit chevrons on all fields"],
          prompt: "Garnet 'You're all set' summary, dark. Avatar with side ring, name, timezone, side, notifications status as a short list with edit chevrons. [GARNET FIGURE] (pose: holding the crystal) small at top, or crystal only. Primary 'Go to our space'."
        }
      ]
    },
    {
      id: "04-pre-ld",
      title: "04 · Before Long Distance",
      file: "04-before-long-distance.md",
      prompts: [
        {
          id: "PRE-01",
          title: "Pre-long-distance Home",
          route: "/(pre)/home",
          states: ["checklist-incomplete", "checklist-done"],
          guardrails: ["No days apart counter anywhere", "Useful while still together"],
          prompt: "Garnet Home before long distance, iPhone 393×852, dark. Header: 'Good evening, Selam' with avatar. Hero: Garnet crystal resting, both figures ([RUBY FIGURE] idle left, [SAPPHIRE FIGURE] idle right) close together on one plinth. Line: 'Prepare your space together.' A gentle setup checklist card with 6 rows and checkmarks: Add important dates, Prepare an Open When letter, Add a memory, Plan 'when we meet again', Choose how days are revealed, Set notifications. Bottom: subtle card 'Start our long distance' with chevron."
        },
        {
          id: "PRE-02",
          title: "Add important date",
          route: "/(pre)/date-sheet",
          states: ["default"],
          guardrails: ["Show both local times on timezone choice"],
          prompt: "Garnet sheet 'Add a date that matters', dark. Fields: Title, Type chips (Birthday, Anniversary, First met, First date, Travel, Custom), Date picker, Repeats yearly toggle, 'Whose time zone?' (shown with both local times). Primary 'Save date'."
        },
        {
          id: "PRE-05",
          title: "Day-reveal setup (U-02, U-06)",
          route: "/(pre)/day-reveal-setup",
          states: ["finished-together", "at-set-time", "when-i-choose"],
          guardrails: ["Provisional cutoff note explicitly shown", "Signals always arrive immediately"],
          prompt: "Garnet 'How should your days meet?' screen, dark. Three selectable cards with small icons: 'When we've both finished our day' (default), 'At a set time', 'When I choose'. Under 'At a set time': a time row showing the time in both zones ('04:00 London · 07:00 Addis Ababa'), marked 'Provisional — cutoff not decided yet'. Explainer: 'Thoughts, Missing You and I Need You always arrive right away.' Primary 'Save'."
        },
        {
          id: "PRE-07",
          title: "Shared identity customization",
          route: "/(pre)/customization",
          states: ["default", "soft-aurora", "plain-dark"],
          guardrails: ["Live preview of shared Garnet hero"],
          prompt: "Garnet 'Our space' customization, dark. Live preview of the shared Garnet hero. Fields: space name ('Our space'), shared accent (Garnet violet default, slight variations), background (night sky / soft aurora / plain). Save / Cancel; Reset to default."
        },
        {
          id: "PRE-08",
          title: "Start Long Distance — intro",
          route: "/(pre)/start-intro",
          states: ["default"],
          guardrails: ["Figures in hug pose together on plinth"],
          prompt: "Garnet 'Ready to begin our next chapter?' screen, dark, cinematic. Full-bleed night-sky gradient. [RUBY FIGURE] (pose: hug) and [SAPPHIRE FIGURE] (pose: hug) together in the centre on one crystal plinth. Title in display serif, body: 'Your shared space is ready. When you both confirm, Garnet will begin your long-distance chapter.' Primary 'I'm ready', secondary 'Not yet'."
        },
        {
          id: "PRE-09",
          title: "Start Long Distance — confirmation states",
          route: "/(pre)/start-confirm",
          states: ["you-confirmed-waiting", "partner-confirmed", "both-confirmed"],
          guardrails: ["Both must confirm to begin", "No pressure / can change mind"],
          prompt: "Garnet confirmation status screen, dark. Two avatars with rings and status under each: 'You · Confirmed ✓' and 'Noah · Waiting…' with a slow pulse. Body: 'Garnet begins your chapter when you've both confirmed.' Text button 'Change my mind'."
        },
        {
          id: "PRE-10",
          title: "Our next chapter has begun (transition)",
          route: "/(pre)/transition",
          states: ["transition-animation", "reduced-motion-final"],
          guardrails: ["Never a '0 days apart' counter or sad framing"],
          prompt: "Garnet chapter-begins transition, dark, 2–3 s, skippable. Ruby light from the left and sapphire light from the right travel along two arcs and meet as a violet Garnet crystal in the centre; the figures step apart slightly to either side, still facing each other. Title fades in: 'Our next chapter has begun. ❤️💙'. Then the app settles into Home."
        }
      ]
    },
    {
      id: "05-home",
      title: "05 · Home Screen",
      file: "05-home.md",
      prompts: [
        {
          id: "HOME-01",
          title: "Home (default)",
          route: "/(tabs)/home",
          states: ["default", "first-use-empty", "with-event", "with-waiting", "offline-banner", "permission-banner", "skeleton", "artwork-unavailable"],
          guardrails: ["No streak numbers", "No relationship scores", "No guilt language"],
          prompt: "Garnet Home, iPhone 393×852, dark, premium and calm. Header: 'Good morning, Selam' in display serif, small line 'It's 09:12 for you · 07:12 for Noah', avatar button (opens profile menu). Hero (about 40% of the height): the original Garnet crystal floating, ruby glow entering from the left, sapphire glow from the right, meeting as violet in the core; [GARNET FIGURE] (pose: holding the crystal) optional behind it, softly lit. Below the hero, a row of 3 compact emotional action buttons with icon + label: '💭 Thought of You', '🥺 Missing You', '🫂 I Need You' (pills, glass surface). Then a wide primary '＋ Log something' button. Section 'Today' with the last 3 moments as minimal rows (time, icon, short text, thumbnail). One quiet card 'Coming up: Noah's birthday · in 4 days'. One safe waiting item: 'Something is waiting for you 💜' (no content). Tab bar: Home (selected), Days, Us, Moments, Our World."
        },
        {
          id: "HOME-02",
          title: "Hero reacts to activity",
          route: "/(tabs)/home/hero-reactions",
          states: ["ruby-drifting", "sapphire-drifting", "core-violet-glow"],
          guardrails: ["Subtle, under 1 s, never blocking"],
          prompt: "Three storyboard frames of the Garnet Home hero reacting: (1) after Selam logs a moment, a small ruby light drifts into the crystal; (2) when Noah's thought arrives, a sapphire light drifts in; (3) when both interact with the same memory, the core softly turns violet for 1 s. Subtle, under 1 s each, never blocking. Include the reduced-motion version (static glow change)."
        },
        {
          id: "HOME-03",
          title: "Quick log sheet",
          route: "/(sheet)/quick-log",
          states: ["empty", "typing", "photo-attached", "saving", "toast-saved"],
          guardrails: ["Autosave hint: Draft saved on this device", "Visible to Noah after days meet notice"],
          prompt: "Garnet 'Log something' bottom sheet over a dimmed Home, dark. Grabber, title 'What's happening?' Large single-line text field with placeholder 'A small moment…'. Row of type chips: Text, Photo, Video, Voice, Feeling, Activity, Food, Work, Place, More. Optional mood picker row of 6 soft emoji chips. Footer: 'Visible to Noah after your days meet' with a change link (visibility), text button 'More options', primary 'Save'. Autosave hint: 'Draft saved on this device.'"
        },
        {
          id: "HOME-04",
          title: "Emotional action sheet",
          route: "/(sheet)/emotional-actions",
          states: ["default"],
          guardrails: ["Nothing sends on a single accidental tap"],
          prompt: "Garnet emotional actions sheet (from the 'Us' quick actions), dark. Title 'Send something to Noah'. Large rows with icon, title and one-line meaning: Thought of You, Missing You, I Need You, I Need to Talk, Please Check On Me, I Can't Talk Yet, I'm Okay Now. Each row opens its compose sheet. Nothing sends on a single accidental tap."
        },
        {
          id: "HOME-05",
          title: "Profile menu",
          route: "/(menu)/profile",
          states: ["default"],
          guardrails: ["Reset demo data prototype affordance", "Notification preview lab link"],
          prompt: "Garnet profile menu popover from the Home avatar, dark. Rows: profile (avatar + name + side), 'Settings', 'Notification preview lab', 'Reset demo data' (prototype badge), 'Sign out'."
        }
      ]
    },
    {
      id: "06-days",
      title: "06 · Days & Logging",
      file: "06-days-and-logging.md",
      prompts: [
        {
          id: "DAYS-01",
          title: "Days overview",
          route: "/(tabs)/days",
          states: ["list-view", "calendar-month", "empty-state", "unrevealed-partner"],
          guardrails: ["Accessibility: text labels alongside side-coloured dots"],
          prompt: "Garnet Days tab, iPhone 393×852, dark. Large title 'Days'. Segmented control 'List · Calendar'. 'Today' shortcut chip. List of day rows grouped by week: date label ('Tue 3 Nov'), two tiny side-coloured dots (ruby, sapphire) showing who logged (with text labels for accessibility), a preview line of 2–3 moment icons, a small photo thumbnail if present, and a status tag: 'Revealed', 'Waiting to meet', or 'Your day so far'. Search and filter icons top right."
        },
        {
          id: "DAYS-02",
          title: "My Day timeline",
          route: "/(tabs)/days/[date]",
          states: ["populated", "empty-day", "with-draft-entry", "upload-failed"],
          guardrails: ["Private drafts show 'Only you' badge", "Vertical timeline with ruby accent"],
          prompt: "Garnet 'My day' timeline, dark, ruby accent (viewer is Ruby). Header: 'Today · Addis Ababa', segmented 'My day · Noah's day · Together'. Vertical timeline: left column times (08:12, 09:03…), thin ruby line with small dots, each entry a quiet row: icon + short text ('☕ First coffee'), photos as large rounded media (photos are visually important), video with duration badge, voice note with a waveform and play button. Each row has a '…' context menu. Private drafts show an 'Only you' badge. Floating '＋' button bottom right. Bottom: 'Finish my day' text button."
        },
        {
          id: "DAYS-03",
          title: "Partner's Day (Noah)",
          route: "/(tabs)/days/[date]/partner",
          states: ["revealed", "not-yet-revealed", "empty"],
          guardrails: ["Not revealed: 'Noah's day is still theirs for now.' — NO blame or guilt"],
          prompt: "Garnet 'Noah's day' timeline, dark, sapphire accent, 'London 🇬🇧' in the header with both local times shown on each entry ('15:42 · 18:42 for you'). Same layout as My day, read-only, no context menu except 'Save as memory' and 'React'."
        },
        {
          id: "DAYS-04",
          title: "Day reveal — waiting / ready / recap",
          route: "/(tabs)/days/reveal",
          states: ["waiting-neutral", "ready-to-meet", "merged-recap"],
          guardrails: ["Never show 'Noah hasn't finished yet'", "Use neutral: 'Your days will meet when you're both ready.'"],
          prompt: "Three Garnet screens, dark. (1) Waiting: 'Your day is still yours for now.' with the crystal half lit ruby; 'Noah hasn't finished yet' is NOT shown — use neutral 'Your days will meet when you're both ready.' (2) Ready: crystal lit violet, title 'Your days are ready to meet. ❤️💙', primary 'See our day'. (3) Recap: one merged chronological timeline, ruby entries on the left edge and sapphire on the right edge of a central violet line, times in viewer's zone, photos large."
        },
        {
          id: "DAYS-05",
          title: "Entry detail",
          route: "/(tabs)/days/entry/[id]",
          states: ["photo-entry", "text-entry", "voice-entry", "read-only-after-reveal"],
          guardrails: ["Visibility explicitly noted (Shared with Noah / Only you)"],
          prompt: "Garnet day entry detail, dark. Full-width media (if any), text, type chip, time with both zones, author avatar, visibility state ('Shared with Noah' / 'Only you' / 'After your days meet'). Actions: Edit, Change visibility, Delete (destructive), Save as memory."
        },
        {
          id: "DAYS-06",
          title: "Add / edit entry (full)",
          route: "/(tabs)/days/new-moment",
          states: ["new-moment", "editing", "time-edit-disabled-note"],
          guardrails: ["Preserve typed text if media cancelled", "Time editing open decision U-11 note"],
          prompt: "Garnet 'New moment' full screen, dark. Type selector chips at top. Text area. Media row (add photo, video, voice). Mood chips. Time row (defaults to now; editing time is open decision U-11 — show the control as disabled with a note). Visibility selector. Primary 'Save', Cancel. Typed text is preserved if media selection is cancelled."
        },
        {
          id: "DAYS-07",
          title: "Media picker (mock)",
          route: "/(sheet)/media-picker",
          states: ["grid-select", "permission-rationale"],
          guardrails: ["Badge 'Simulated picker'"],
          prompt: "Garnet media source sheet, dark: rows 'Photo library', 'Take photo', 'Record video', 'Voice note', each with an icon. Then a mock grid picker with 12 neutral sample photos, multi-select with numbered checks, 'Add 2' primary. Badge 'Simulated picker'."
        },
        {
          id: "DAYS-08",
          title: "Voice note recording (mock)",
          route: "/(sheet)/voice-recorder",
          states: ["recording", "playback-scrubber"],
          guardrails: ["Waveform animation, ruby glow record button"],
          prompt: "Garnet voice note recorder sheet, dark: large circular record button with ruby glow, live waveform, timer '0:12', controls Cancel / Stop / Send. After stop: playback with scrubber, 'Record again', 'Save'."
        },
        {
          id: "DAYS-09",
          title: "Mood and activity picker",
          route: "/(sheet)/mood-activity",
          states: ["feelings-tab", "activity-tab"],
          guardrails: ["Soft labelled emoji chips with text"],
          prompt: "Garnet picker sheet, dark: tabs 'Feeling' and 'Activity'. Feeling grid of soft labelled emoji chips (Calm, Happy, Tired, Busy, Excited, Low…); activity list (Coffee, Work, Commute, Food, Gym, Study, Outside, Home). Selected chip shows check + fill. 'Clear' and 'Done'."
        },
        {
          id: "DAYS-10",
          title: "Day boundary explainer",
          route: "/(sheet)/day-boundary",
          states: ["default"],
          guardrails: ["Provisional: the exact time hasn't been decided yet"],
          prompt: "Garnet info sheet 'When does a day end?', dark. Diagram of one shared day shown on two clocks: London 04:00 → 04:00 and Addis Ababa 07:00 → 07:00 (06:00 in summer). Note 'Provisional: the exact time hasn't been decided yet.' Close button."
        },
        {
          id: "DAYS-11",
          title: "Filter and search results",
          route: "/(tabs)/days/filter",
          states: ["filtered-results", "no-results"],
          guardrails: ["No results copy: 'Nothing found. Try another word or filter.'"],
          prompt: "Garnet Days filter sheet: chips for type (photo, voice, feeling…), person (me / Noah / both), date range. Results list grouped by day with matching moments highlighted. 'No results' state: 'Nothing found. Try another word or filter.'"
        }
      ]
    },
    {
      id: "07-us",
      title: "07 · Us: Emotional Connection",
      file: "07-us-emotional.md",
      prompts: [
        {
          id: "US-01",
          title: "Us tab",
          route: "/(tabs)/us",
          states: ["default", "pinned-support-card", "offline"],
          guardrails: ["Signals are communication, not measurement (no counts, streaks, or scores)"],
          prompt: "Garnet 'Us' tab, iPhone 393×852, dark, Garnet violet accent. Large title 'Us'. Top: both avatars (ruby ring 'Selam', sapphire ring 'Noah') with a thin violet line between them and each person's local time. Grid of signal tiles, 2 columns, premium glass tiles with icon + label: Thought of You, Missing You, I Need You, I Need to Talk, Please Check On Me, I Can't Talk Yet, I'm Okay Now, and a wide tile 'Messages' (opens chat). Below: 'Recent between you' — 3 quiet rows from signal history (no counts)."
        },
        {
          id: "US-02",
          title: "I Thought of You",
          route: "/(sheet)/signal/thought",
          states: ["compose", "sent-animation", "received-card"],
          guardrails: ["No 'seen' or 'delivered' pressure"],
          prompt: "Three Garnet screens, dark. (1) Compose sheet: big tappable '💭 Send a thought' button, optional note field 'Add a few words (optional)', optional photo/voice/video chips, Cancel. (2) Sent: a tiny ruby particle travels upward and becomes a small violet light; text 'Sent 💭'. No 'seen'. (3) Received (partner's view, in-app card): 'A little thought from Noah 💭' with the note if included and the time in both zones; actions 'Send one back' and 'Save as memory'."
        },
        {
          id: "US-03",
          title: "Missing You",
          route: "/(sheet)/signal/missing-you",
          states: ["compose-chips", "sent-glow", "received-card"],
          guardrails: ["Never 'You missed me 37 times', no graphs or comparisons"],
          prompt: "Garnet Missing You compose sheet, dark: three soft choice chips 'A little', 'A lot', 'I need a hug', optional note, 'Send'. Sent state: gentle inward glow, 'Sent 🥺'. Received card: 'Noah is missing you.' with the chosen chip as text, actions 'Send a hug back', 'Message'."
        },
        {
          id: "US-04",
          title: "I Need You — selector",
          route: "/(sheet)/signal/need-you",
          states: ["selector", "selected-voice", "sent"],
          guardrails: ["Footnote: 'Garnet isn't an emergency service' with help link"],
          prompt: "Garnet 'What do you need right now?' screen, dark, grounded and calm (no alarm red). List of large selectable rows with emoji + label: I'm feeling down · I'm overwhelmed · I feel lonely · I need to talk · I need comfort · Something upset me · I don't know what's wrong · I just need you. Optional attachments row (text, voice, photo, video). Primary 'Send to Noah'. Footnote: 'Garnet isn't an emergency service.' with link to help resources."
        },
        {
          id: "US-05",
          title: "I Need You — received",
          route: "/(tabs)/home/support-received",
          states: ["new-support-card", "responded-state"],
          guardrails: ["Calm card, no alarm sirens, no call buttons in Phase 2"],
          prompt: "Garnet received support request (partner view), dark. Calm card at top of Home/Us: 'Selam sent you a support signal 🫂' and the selected need ('I'm overwhelmed'), note/voice if included, time in both zones. Actions: 'I'm here' (primary), 'Send comfort', 'Message'. Secondary: 'Check on Selam later'. No call buttons in Phase 2."
        },
        {
          id: "US-06",
          title: "I Need to Talk + Just Listen",
          route: "/(sheet)/signal/need-to-talk",
          states: ["just-listen-selected", "received-card"],
          guardrails: ["Highlight: 'I don't need advice right now. I need you to listen.'"],
          prompt: "Garnet 'I need to talk' sheet, dark. Topic chips: Work, Life, Us, Something difficult, Something on my mind, I don't know, Just listen. Selecting 'Just listen' shows a highlighted explanation: 'I don't need advice right now. I need you to listen.' Optional note, 'Send'. Received view: 'Noah would like to talk — just listen.' with actions 'I'm here', 'Message'."
        },
        {
          id: "US-07",
          title: "Please Check On Me",
          route: "/(sheet)/signal/check-on-me",
          states: ["options-selected", "pending-reminder"],
          guardrails: ["Time shown in partner's zone: 'Around 21:00 for Noah'"],
          prompt: "Garnet 'Please check on me' sheet, dark. Options: Now, Later today, Tonight, Tomorrow, each with the time shown in the partner's zone ('Tonight · around 21:00 for Noah'). Note 'Garnet will remind Noah gently, respecting quiet hours.' Send."
        },
        {
          id: "US-08",
          title: "I Can't Talk Yet",
          route: "/(sheet)/signal/cant-talk-yet",
          states: ["compose-card", "received-card"],
          guardrails: ["No rejection framing, gentle comfort"],
          prompt: "Garnet 'I can't talk yet' sheet, dark. Prewritten message card: 'I'm not okay, but I'm not ready to talk yet.' Optional chips: Check on me later · Give me some space · Stay close · Send comfort. Send. Received copy: 'Selam can't talk just now.' with 'Send comfort', 'Give space'."
        },
        {
          id: "US-09",
          title: "I'm Okay Now",
          route: "/(sheet)/signal/okay-now",
          states: ["compose", "resolved-banner"],
          guardrails: ["Closes the open support card peacefully"],
          prompt: "Garnet 'I'm okay now' one-tap confirmation, dark: soft warm glow, '❤️ Let Noah know you're okay now', optional note, Send. Partner view: 'Selam let you know they're okay. ❤️' — closes the open support card."
        },
        {
          id: "US-10",
          title: "Signal history and detail",
          route: "/(tabs)/us/history",
          states: ["populated", "empty", "privacy-sheet"],
          guardrails: ["No totals, no frequency charts, privacy note"],
          prompt: "Garnet signal history list, dark: chronological, grouped by day, each row icon + 'You sent a thought' / 'Noah sent a support signal' + time. Detail view shows the note/media and responses. No totals, no charts. Footnote: 'Only the two of you can see this.'"
        }
      ]
    },
    {
      id: "08-chat",
      title: "08 · Private Chat",
      file: "08-chat.md",
      prompts: [
        {
          id: "CHAT-00",
          title: "Conversation list",
          route: "/(tabs)/us/messages",
          states: ["populated", "empty-no-messages"],
          guardrails: ["Single conversation row only (no contacts, no new chat button)"],
          prompt: "Garnet Messages list, iPhone 393×852, dark. Because the space is private, the list has a single conversation row: Noah's avatar (sapphire ring), name, last message preview (respecting privacy settings), time, an unread dot for the viewer. Beneath, quiet shortcuts: 'Pinned', 'Shared media', 'Search messages'. No contacts, no 'new chat' button."
        },
        {
          id: "CHAT-01",
          title: "Conversation",
          route: "/(tabs)/us/chat",
          states: ["populated", "empty-chat", "typing-preview", "failed-retry"],
          guardrails: ["Ruby-tinted surface for own bubbles, sapphire-tinted for Noah", "No figures on chat screens"],
          prompt: "Garnet private conversation, iPhone 393×852, dark. Compact header: Noah's avatar with sapphire ring, name, local time '18:42 in London', info button. Messages grouped by sender with soft bubbles: mine in a ruby-tinted surface, Noah's in a sapphire-tinted surface (also distinguished by alignment, not colour alone). Date separators ('Today'). A reply preview inside a bubble, reactions as small pills under bubbles, an edited label, a pinned banner at top ('1 pinned'). Composer above the keyboard: '＋' media, text field 'Message', voice-note button, send."
        },
        {
          id: "CHAT-02",
          title: "Message context menu & reactions",
          route: "/(tabs)/us/chat/context",
          states: ["reaction-palette", "reply-quote"],
          guardrails: ["6 soft emoji palette, lifted bubble on blur"],
          prompt: "Garnet message long-press state, dark: message lifted, blurred background, reaction palette of 6 soft emoji above it, menu below: Reply, React, Edit (own, if eligible), Pin, Copy, Save as memory (media), Delete. Then the reply composer state showing a quoted preview with ×."
        },
        {
          id: "CHAT-03",
          title: "Edit message",
          route: "/(tabs)/us/chat/edit",
          states: ["editing-bar", "edited-label"],
          guardrails: ["Clear 'edited' badge on modified bubble"],
          prompt: "Garnet edit-message state: composer shows 'Editing message' bar with the original text, Cancel and Save; edited bubble later shows 'edited'."
        },
        {
          id: "CHAT-04",
          title: "Delete for me / for everyone",
          route: "/(dialog)/chat-delete",
          states: ["delete-dialog", "removed-placeholder"],
          guardrails: ["Explains it cannot remove screenshots outside Garnet"],
          prompt: "Two Garnet dialogs, dark. 'Delete for you?' — 'This removes the message from your view only.' Cancel / Delete for me. 'Delete for everyone?' — 'This removes it for you and Noah. It can't remove screenshots or copies outside Garnet.' Cancel / Delete for everyone (destructive). Result bubble: 'This message was removed.'"
        },
        {
          id: "CHAT-05",
          title: "Pinned messages",
          route: "/(sheet)/chat/pinned",
          states: ["populated", "empty"],
          guardrails: ["Tap to jump, swipe to unpin"],
          prompt: "Garnet pinned messages sheet: list of pinned messages with date, tap to jump, swipe to unpin. Empty: 'Pin a message to keep it close.'"
        },
        {
          id: "CHAT-06",
          title: "In-chat search",
          route: "/(tabs)/us/chat/search",
          states: ["results", "no-results"],
          guardrails: ["Matches highlighted with date step-through"],
          prompt: "Garnet in-chat search: search field in header, results list with highlighted terms and dates, up/down to step through matches in the conversation. No results: 'Nothing found. Try another word.'"
        },
        {
          id: "CHAT-07",
          title: "Message details",
          route: "/(sheet)/chat/details",
          states: ["default"],
          guardrails: ["Shown only as 'Sent' (no 'seen' unless read receipts enabled U-35)"],
          prompt: "Garnet message details sheet: sent time in both zones, edited time, delivery state shown only as 'Sent' (no 'seen'/'read' unless the read-receipt setting is on for both — U-35)."
        },
        {
          id: "CHAT-08",
          title: "Media sheet & preview",
          route: "/(sheet)/chat/media",
          states: ["preview-before-send"],
          guardrails: ["Note: Won't be saved as memory unless you choose to"],
          prompt: "Garnet chat media sheet: Photo, Video, Voice note (mock picker). Preview screen before sending: media large, caption field, destination 'Chat with Noah', Send. Note: 'This won't be saved as a memory unless you choose to.'"
        },
        {
          id: "CHAT-09",
          title: "Conversation details",
          route: "/(tabs)/us/chat/info",
          states: ["default"],
          guardrails: ["Read receipts off by default (U-35)"],
          prompt: "Garnet conversation details screen: shared media grid (photos/videos/voice), pinned messages row, search row, notification setting for messages, read receipts setting (U-35, off by default), typing indicator setting."
        }
      ]
    },
    {
      id: "09-open",
      title: "09 · Open When Letters",
      file: "09-open-when.md",
      prompts: [
        {
          id: "OPEN-01",
          title: "Open When library",
          route: "/(tabs)/moments/open-when",
          states: ["populated-for-me", "populated-from-me", "empty-for-me", "empty-from-me"],
          guardrails: ["Privacy rule: Never show body text, attachment counts, or blurred peek"],
          prompt: "Garnet Open When library, iPhone 393×852, dark. Large title 'Open When'. Segmented control 'For me · From me'. Grid of 2 columns of gem capsules (original 3D motif): ruby, sapphire or violet capsule per sender, each on a soft reflective floor, with the safe prompt underneath in the serif ('Open when you miss me'), sender name, and a status chip: 'Sealed', 'Ready to open' (gentle pulse) or 'Opened'. Floating 'Write a letter' button."
        },
        {
          id: "OPEN-02",
          title: "Create — prompt & category",
          route: "/(tabs)/moments/open-when/new/prompt",
          states: ["suggestion-chips", "custom-prompt"],
          guardrails: ["10 curated empathy suggestions + write your own"],
          prompt: "Garnet 'Write an Open When letter' step 1, dark. Title 'Open when…'. Suggestion chips: you miss me, you have a terrible day, you can't sleep, you're homesick, you're angry with me, you need to laugh, you need motivation, on your first day at work, you need to hear my voice, you want to remember us — plus 'Write your own'. Selected chip shows the full prompt in the serif."
        },
        {
          id: "OPEN-03",
          title: "Create — body & attachments",
          route: "/(tabs)/moments/open-when/new/body",
          states: ["writing", "with-attachments"],
          guardrails: ["Paper-like surface, word count hidden, autosave indicator"],
          prompt: "Garnet letter editor, dark, writing-focused: paper-like surface with generous margins, serif body text, word count hidden, formatting kept minimal. Attachment row: photos, voice recording, video, song link (curated only). Autosave indicator 'Draft saved on this device'. Top right 'Next'."
        },
        {
          id: "OPEN-04",
          title: "Create — unlock condition & preview",
          route: "/(tabs)/moments/open-when/new/seal",
          states: ["condition-anytime", "condition-date", "recipient-preview"],
          guardrails: ["Confirmation: Once sealed, you can't edit it"],
          prompt: "Garnet 'When can Noah open it?' step, dark. Options: 'Anytime' (manual), 'On a date and time' (picker showing both zones), 'On an event' (pick from events). Then 'What Noah will see before opening': a preview of the sealed capsule with only the prompt and 'From Selam'. Buttons 'Save draft' and primary 'Seal letter'. Confirmation: 'Once sealed, you can't edit it.'"
        },
        {
          id: "OPEN-05",
          title: "Sealed letter (recipient view)",
          route: "/(tabs)/moments/open-when/[id]/sealed",
          states: ["locked-until-date", "eligible-ready", "sender-view-u34"],
          guardrails: ["No peek, no preview, no blurred text"],
          prompt: "Garnet sealed letter detail, dark, cinematic. A single gem capsule centred, softly glowing seam, floating above a reflective floor. Prompt in large serif: 'Open when you miss me'. 'From Noah · sealed 30 Aug'. Status: 'Opens on 5 January · 06:00 for you' or, if eligible, primary 'Open letter'. No peek, no preview, no blurred text. Back button."
        },
        {
          id: "OPEN-06",
          title: "Opening confirmation & animation",
          route: "/(tabs)/moments/open-when/[id]/opening",
          states: ["confirm-dialog", "capsule-unsealing-storyboard"],
          guardrails: ["Short ≤ 1.5s skippable, light spills out, reduced motion support"],
          prompt: "Garnet 'Open this letter now?' dialog: the prompt, 'From Noah', buttons 'Not now' / 'Open'. Then the opening storyboard (5 frames, ≤ 1.5 s, skippable): capsule glows → seam splits → light spills out → halves rest apart → letter rises into view. [SAPPHIRE FIGURE] (pose: writing a letter) may appear small at the end."
        },
        {
          id: "OPEN-07",
          title: "Opened letter",
          route: "/(tabs)/moments/open-when/[id]/opened",
          states: ["default", "with-media-attachments"],
          guardrails: ["Paper surface, serif body, opened timestamp, reply action"],
          prompt: "Garnet opened letter, dark. Paper-like surface, serif body text, author signature line '— Noah', opened time 'Opened today at 21:04'. Attachments below: photos gallery, voice note player with waveform, video, song link card. Actions: 'Save as memory', 'Reply with a thought'."
        },
        {
          id: "OPEN-08",
          title: "Unavailable, removed, access denied",
          route: "/(tabs)/moments/open-when/unavailable",
          states: ["default"],
          guardrails: ["No details about why or what it contained"],
          prompt: "Garnet unavailable letter state, dark: soft empty capsule outline, 'This item isn't available here.' No details about why or what it contained. Button 'Back to letters'."
        }
      ]
    },
    {
      id: "10-mem",
      title: "10 · Memories",
      file: "10-memories.md",
      prompts: [
        {
          id: "MEM-01",
          title: "Memories timeline",
          route: "/(tabs)/our-world/memories",
          states: ["populated-masonry", "empty-state", "skeleton"],
          guardrails: ["Calm masonry, serif month headers, quotes"],
          prompt: "Garnet Memories, iPhone 393×852, dark, Garnet violet accent. Large title 'Memories'. Segmented 'Timeline · Collections'. Timeline: month headers in serif ('October · Chapter 02'), a calm masonry of large rounded photo tiles, voice-note tiles with waveform, text memories as quiet serif quotes, each with date. Search and filter icons. Floating 'Add memory'."
        },
        {
          id: "MEM-02",
          title: "Collections",
          route: "/(tabs)/our-world/memories/collections",
          states: ["grid"],
          guardrails: ["2-column cover cards, item count in small caption"],
          prompt: "Garnet Collections grid, dark: 2-column cover cards with large cover photo, title in serif ('Before Long Distance', 'First days apart', 'Birthdays', 'Trips', 'Random moments'), item count in small caption. 'New collection' card with dashed outline."
        },
        {
          id: "MEM-03",
          title: "Collection detail",
          route: "/(tabs)/our-world/memories/collection/[id]",
          states: ["populated", "empty"],
          guardrails: ["Hero cover with description over soft gradient"],
          prompt: "Garnet collection detail: hero cover with title and description over a soft gradient, edit button, then the collection's memories as a grid. Actions menu: Edit collection, Add memories, Delete collection."
        },
        {
          id: "MEM-04",
          title: "Create / edit memory",
          route: "/(tabs)/our-world/memories/new",
          states: ["form", "uploading-progress"],
          guardrails: ["Place is optional, never automatic"],
          prompt: "Garnet 'New memory' screen, dark. Media area (add photos/videos/voice), title, caption/story text area, date picker, place (optional, never automatic), tags chips, destination 'Add to collection' selector. Primary 'Save memory'. Autosave 'Draft saved on this device.'"
        },
        {
          id: "MEM-05",
          title: "Memory detail",
          route: "/(tabs)/our-world/memories/[id]",
          states: ["default"],
          guardrails: ["Full-bleed media, story text, author avatar, collections chips"],
          prompt: "Garnet memory detail: full-bleed media, title in serif, date and place, story text, who added it (avatar), collections it belongs to as chips. Actions: Edit, Add to collection, Remove from this collection, Delete memory."
        },
        {
          id: "MEM-06",
          title: "Media viewer",
          route: "/(viewer)/media",
          states: ["photo-zoom", "video-playback"],
          guardrails: ["Share disabled by default for privacy"],
          prompt: "Garnet full-screen media viewer: black background, swipe between items, pinch to zoom, caption and date at the bottom, close button, share disabled by default (private). Video with simple controls; voice note with large waveform."
        },
        {
          id: "MEM-07",
          title: "Voice note player",
          route: "/(sheet)/voice-player",
          states: ["playback"],
          guardrails: ["Large waveform scrubber, speed controls"],
          prompt: "Garnet voice note player sheet: large waveform with scrubber, play/pause, speed (1×, 1.5×), transcript area 'Transcript not available' placeholder, author and date."
        },
        {
          id: "MEM-08",
          title: "Save as memory (from chat/days)",
          route: "/(sheet)/save-as-memory",
          states: ["form-sheet"],
          guardrails: ["Toast after: 'Saved to Memories'"],
          prompt: "Garnet 'Save as memory' sheet: media preview, title field, caption, choose collection list, Save / Cancel. Toast after: 'Saved to Memories.'"
        },
        {
          id: "MEM-09",
          title: "Remove from collection vs delete",
          route: "/(dialog)/memory-actions",
          states: ["remove-dialog", "delete-dialog"],
          guardrails: ["Scope clearly stated: Removes from collection vs Delete for both"],
          prompt: "Two Garnet dialogs. 'Remove from 'Trips'?' — 'The memory stays in your Memories.' Cancel / Remove. 'Delete this memory?' — 'It will be removed for you and Noah, including its photos and collection links. Copies saved outside Garnet aren't affected.' Cancel / Delete (destructive)."
        },
        {
          id: "MEM-10",
          title: "Search & filter",
          route: "/(tabs)/our-world/memories/filter",
          states: ["results", "no-results"],
          guardrails: ["Type chips, person, date range"],
          prompt: "Garnet Memories filter: type chips (photos, videos, voice, text), person, collection, date range; results grid; no-results state."
        }
      ]
    },
    {
      id: "11-events",
      title: "11 · Events & Chapters",
      file: "11-events-and-chapters.md",
      prompts: [
        {
          id: "EVT-01",
          title: "Events — list & calendar",
          route: "/(tabs)/moments/events",
          states: ["list-view", "calendar-grid", "empty"],
          guardrails: ["Coloured gem icon per type (ruby/sapphire/violet)"],
          prompt: "Garnet Events, iPhone 393×852, dark. Large title 'Moments' with segmented 'Events · Open When · Surprises' (this is the Events tab). Toggle 'List · Calendar'. List: upcoming events as elegant rows with a coloured gem icon per type (birthday ruby/sapphire by person, anniversary violet, travel, custom), title, date, 'in 4 days', and the time in both zones for timed events. Calendar: month grid with small gem markers, today ring. Floating 'Add event'."
        },
        {
          id: "EVT-02",
          title: "Event detail",
          route: "/(tabs)/moments/events/[id]",
          states: ["default"],
          guardrails: ["Date and time in both zones"],
          prompt: "Garnet event detail: cover image or gradient, title, type, date and time with both zones ('Sat 14 Nov · 19:00 London · 22:00 Addis Ababa'), description, linked memories/letters/surprises chips, reminder summary. Actions: Edit, Reminders, Delete."
        },
        {
          id: "EVT-03",
          title: "Create / edit event",
          route: "/(tabs)/moments/events/new",
          states: ["form"],
          guardrails: ["Validation for ambiguous DST clock change times"],
          prompt: "Garnet 'New event' form: title, type chips, date, time (optional), timezone selector with clear labels, repeats (none / yearly / monthly), description, cover, reminder row. Validation for ambiguous times (e.g. a time that doesn't exist during the UK clock change). Save / Cancel."
        },
        {
          id: "EVT-04",
          title: "Reminder options",
          route: "/(sheet)/event-reminders",
          states: ["options"],
          guardrails: ["Dedupe note: 'One reminder per time'"],
          prompt: "Garnet reminder sheet: on the day, 1 day before, 1 week before, custom; channel note 'In-app and notifications (simulated)'; dedupe note 'You'll get one reminder per time.'"
        },
        {
          id: "EVT-05",
          title: "Birthday mode (Noah)",
          route: "/(celebration)/birthday",
          states: ["recipient-view", "sender-view", "artwork-unavailable"],
          guardrails: ["Dominant sapphire theme, [SAPPHIRE FIGURE] celebrating"],
          prompt: "Garnet Birthday mode, dark, celebratory but elegant. The birthday person's colour dominates (e.g. sapphire for Noah). Hero: [SAPPHIRE FIGURE] (pose: celebrating) on a crystal plinth with a short sparkle flourish (skippable). Title 'Happy birthday, Noah' in serif. Sections: birthday message from Selam, scheduled surprise ('Something is waiting for you 🎁' — content hidden), previous birthday photos carousel, birthday memories."
        },
        {
          id: "EVT-06",
          title: "Anniversary mode",
          route: "/(celebration)/anniversary",
          states: ["default"],
          guardrails: ["Violet theme, both figures together with crystal"],
          prompt: "Garnet Anniversary mode, dark, shared Garnet violet dominates. Hero: [RUBY FIGURE] and [SAPPHIRE FIGURE] (pose: together) with their lights meeting into the Garnet crystal. Title 'A day that matters to you both'. Curated sections: anniversary message, favourite memory, shared photos, a letter, previous anniversaries, 'When we meet again' plan."
        },
        {
          id: "EVT-07",
          title: "Monthly chapter",
          route: "/(tabs)/our-world/chapter/[month]",
          states: ["reflection-prompts"],
          guardrails: ["All prompts optional ('Skip' always visible), no statistics"],
          prompt: "Garnet monthly chapter page 'October · Our second chapter', dark. Optional reflection prompts as gentle cards: Favourite moment, Favourite photo, Something we learned, Something we're looking forward to. Each is optional ('Skip' always visible). No statistics."
        },
        {
          id: "EVT-08",
          title: "Relationship chapters list & detail",
          route: "/(tabs)/our-world/chapters",
          states: ["story-list", "chapter-detail"],
          guardrails: ["Vertical story list, editable titles"],
          prompt: "Garnet chapters list: vertical story list 'Before Long Distance — Preparing', 'Chapter 01 — London begins', 'Chapter 02 — Finding our rhythm', 'Chapter 03 — Still us', each with a cover photo and date range; rename action. Detail: chapter cover, title (editable), dates, memories, letters."
        },
        {
          id: "EVT-09",
          title: "Celebration banner",
          route: "/(banner)/celebration",
          states: ["anniversary-banner"],
          guardrails: ["Short sparkle once, never repeated nagging"],
          prompt: "Garnet small celebration banner on Home for today's event: 'Your anniversary is today 💜' with 'Open' — short sparkle once, never repeated nagging."
        }
      ]
    },
    {
      id: "12-surp",
      title: "12 · Surprises",
      file: "12-surprises.md",
      prompts: [
        {
          id: "SUR-01",
          title: "Surprise library",
          route: "/(tabs)/moments/surprises",
          states: ["populated-for-me", "empty-for-me", "from-me"],
          guardrails: ["Contents hidden until opened, safe titles only"],
          prompt: "Garnet Surprises, iPhone 393×852, dark. Segmented 'For me · From me'. Elegant gift-like gem capsules (violet ribbon of light), each with a safe title ('Something for you'), sender, and status chip: 'Scheduled', 'Ready', 'Opened', 'Cancelled'. Floating 'Create surprise'."
        },
        {
          id: "SUR-02",
          title: "Create — choose content",
          route: "/(tabs)/moments/surprises/new/type",
          states: ["type-selection"],
          guardrails: ["Message, Photo, Video, Voice note, Letter, Song, Future-date"],
          prompt: "Garnet 'Create a surprise' step 1: content type cards — Message, Photo, Video, Voice note, Letter, Song link, Future-date idea. Then the editor for the chosen type."
        },
        {
          id: "SUR-03",
          title: "Reveal condition",
          route: "/(tabs)/moments/surprises/new/condition",
          states: ["date-time", "event-trigger", "safe-title-toggle"],
          guardrails: ["Secrecy choice: safe title or fully generic"],
          prompt: "Garnet 'When should Noah get it?' step: Date and time (both zones), On an event (birthday, anniversary, custom), Right away. Secrecy option: 'Show a title before opening' toggle with a safe title field, or keep fully generic."
        },
        {
          id: "SUR-04",
          title: "Sender preview",
          route: "/(tabs)/moments/surprises/new/preview",
          states: ["preview"],
          guardrails: ["Shows locked recipient view + notification preview"],
          prompt: "Garnet 'What Noah will see' preview: the locked capsule exactly as the recipient sees it, the notification preview ('You have something waiting for you. 🎁'), and the opened view. Buttons: Back, primary 'Lock surprise'."
        },
        {
          id: "SUR-05",
          title: "Scheduled / locked (both sides)",
          route: "/(tabs)/moments/surprises/[id]/locked",
          states: ["sender-view", "recipient-view"],
          guardrails: ["Recipient view shows no contents and no hints"],
          prompt: "Garnet locked surprise detail: capsule with a soft lock glyph, 'Opens on Noah's birthday · 14 Nov'. Sender view adds provisional actions 'Edit' and 'Cancel surprise' (labelled 'Rules not final'). Recipient view shows no contents and no hints."
        },
        {
          id: "SUR-06",
          title: "Open surprise",
          route: "/(tabs)/moments/surprises/[id]/open",
          states: ["open-dialog", "unwrapping-reveal", "opened-content"],
          guardrails: ["Ribbon of light unwraps, ≤ 1.5s, skippable"],
          prompt: "Garnet surprise opening: 'Open your surprise?' Not now / Open; short reveal animation (capsule ribbon of light unwraps, ≤ 1.5 s, skippable), then the content full-screen with 'Save as memory' and 'Send a thought back'. Reduced-motion version."
        },
        {
          id: "SUR-07",
          title: "Expired, cancelled, unavailable, error",
          route: "/(tabs)/moments/surprises/edge-states",
          states: ["cancelled", "unavailable", "delivery-error"],
          guardrails: ["Calm copy, no blame"],
          prompt: "Garnet surprise edge states: cancelled ('This surprise was withdrawn.'), unavailable ('This item isn't available here.'), simulated delivery error for the sender ('Couldn't schedule this yet. Try again.'). Calm, no blame."
        }
      ]
    },
    {
      id: "13-world",
      title: "13 · Future & Our World",
      file: "13-future-and-our-world.md",
      prompts: [
        {
          id: "WORLD-01",
          title: "Our World tab",
          route: "/(tabs)/our-world",
          states: ["default", "early-world", "artwork-unavailable"],
          guardrails: ["Never empty, changes for intentional moments only, no streaks"],
          prompt: "Garnet 'Our World' tab, iPhone 393×852, dark, Garnet violet. Top: the shared growing world — a small floating crystal island (original 3D motif) with a few gems, stars and soft light, gently rotating; [RUBY FIGURE] and [SAPPHIRE FIGURE] (pose: idle) tiny on either side of the island. Below, a calm list of large entry cards: Memories, Chapters, When We Meet Again, Soundtrack, Places."
        },
        {
          id: "WORLD-02",
          title: "Shared world detail & customization",
          route: "/(tabs)/our-world/island",
          states: ["detail-inspect", "customize-sheet"],
          guardrails: ["Tap artefact: 'This star appeared when you saved Sunset in London'"],
          prompt: "Garnet shared world full screen: the crystal island larger, tap an artefact to see the memory it came from ('This star appeared when you saved Sunset in London'). Customize sheet: choose island style, sky, light colour; Save / Cancel / Reset."
        },
        {
          id: "WORLD-03",
          title: "Together / fusion state",
          route: "/(overlay)/together-fusion",
          states: ["overlay-active", "reduced-motion"],
          guardrails: ["Original motion (do not copy show animation), ≤ 1.2s skippable"],
          prompt: "Garnet together moment overlay, dark: ruby light from the left and sapphire light from the right meet in the centre and form a violet Garnet crystal; [GARNET FIGURE] (pose: together) appears softly behind the crystal. Line: 'Together, even from afar.' Triggers: both viewing the same memory, both responding to an event, completing a plan, anniversary, reunion."
        },
        {
          id: "FUT-01",
          title: "When We Meet Again — list",
          route: "/(tabs)/our-world/meet-again",
          states: ["populated", "empty", "all-completed"],
          guardrails: ["No countdown as hero metric, by date or theme"],
          prompt: "Garnet 'When we meet again' list, dark, warm and hopeful. Grouping toggle 'By date · By theme'. Plan cards with optional photo, title in serif ('Recreate our first date'), note, place chip, target 'Someday' or a date range ('Dec–Jan'). Completed plans section collapsed with a check. Floating 'Add a plan'."
        },
        {
          id: "FUT-02",
          title: "Add / edit plan",
          route: "/(tabs)/our-world/meet-again/new",
          states: ["form"],
          guardrails: ["Date: Someday / Date / Date range, link to event"],
          prompt: "Garnet 'New plan' form: title, description, photo, place (optional), date: Someday / Date / Date range, link to an event or memory, notes. Save / Cancel."
        },
        {
          id: "FUT-03",
          title: "Plan detail & complete",
          route: "/(tabs)/our-world/meet-again/[id]",
          states: ["detail", "celebration-completed"],
          guardrails: ["Completion moment: 'We finally did it. ❤️💙'"],
          prompt: "Garnet plan detail with 'Mark as done together' primary. Completion moment: both figures (pose: celebrating), crystal glow, title 'We finally did it. ❤️💙', prompt 'Add a photo of the moment' (optional) → saves as a memory."
        },
        {
          id: "PLACE-01",
          title: "Places list & detail",
          route: "/(tabs)/our-world/places",
          states: ["list-with-map-placeholder", "place-detail", "checkin-sheet"],
          guardrails: ["Never continuous location or live position tracking"],
          prompt: "Garnet 'Places' — saved places as memories: list with place name, photo, date and note; a simple illustrated map placeholder (not a live map, not tracking). '📍 I'm here today' button creates a voluntary place entry: place name, photo, short note. Detail screen with photo and note."
        },
        {
          id: "SONG-01",
          title: "Soundtrack list & detail",
          route: "/(tabs)/our-world/soundtrack",
          states: ["song-list", "add-song-sheet"],
          guardrails: ["External links only, no in-app audio files"],
          prompt: "Garnet 'Our soundtrack': list of songs with artwork thumbnail, title, artist, and a personal note ('I listened to this on the way home and thought of you.'), who added it, linked memory/date. Detail opens an external link card ('Open in your music app'). Add-song form: link, title, artist, note. No in-app audio."
        }
      ]
    },
    {
      id: "14-srch",
      title: "14 · Search",
      file: "14-search.md",
      prompts: [
        {
          id: "SEARCH-01",
          title: "Universal search",
          route: "/search",
          states: ["recent-searches", "active-results", "filtered", "no-results", "offline-device-only"],
          guardrails: ["Never leak sealed letter bodies, private drafts, or deleted item text"],
          prompt: "Garnet universal search, iPhone 393×852, dark. Search field with cancel. Below, before typing: 'Recent' queries with remove buttons and 'Clear history'. While typing: results grouped by type with small headers — Messages, Moments, Letters, Memories, Events — each row with icon, safe title, a short safe snippet with the match highlighted, and date. Filter chips row (type, person, date). Sealed letters appear only as their prompt with a 'Sealed' chip and no snippet."
        },
        {
          id: "SEARCH-02",
          title: "Clear search history",
          route: "/(dialog)/clear-search",
          states: ["confirm-dialog"],
          guardrails: ["'This clears recent searches on this device.'"],
          prompt: "Garnet dialog 'Clear search history?' — 'This clears recent searches on this device.' Cancel / Clear."
        }
      ]
    },
    {
      id: "15-set",
      title: "15 · Settings & Account",
      file: "15-settings-and-account.md",
      prompts: [
        {
          id: "SET-01",
          title: "Settings home",
          route: "/settings",
          states: ["default"],
          guardrails: ["Danger zone separated at bottom (End space, Delete account)"],
          prompt: "Garnet Settings, iPhone 393×852, dark. Profile header row (avatar with side ring, name, 'Ruby'). Grouped inset lists with section headers: Account (Profile, Email & password, Devices & sessions), Personalization (Appearance, Theme & side, Nicknames & greetings, Background), Notifications (Notifications, Quiet hours, Lock-screen previews), Privacy & Safety (Privacy, Read receipts, What Noah can see), Shared space (Day reveal, Time zone & day boundary, Start / manage long distance), Data & storage (Offline & sync, Export my data), Help & about (Help, About & licensing, Send feedback), Prototype (Reset demo data — badge 'Prototype')."
        },
        {
          id: "SET-02",
          title: "Profile & edit profile",
          route: "/settings/profile",
          states: ["view", "edit"],
          guardrails: ["Masked email, side ring, timezone"],
          prompt: "Garnet Profile: avatar, display name, nickname, email (masked), side, timezone; Edit opens a form with Save / Cancel and discard-changes behaviour."
        },
        {
          id: "SET-03",
          title: "Appearance, theme & side",
          route: "/settings/appearance",
          states: ["default"],
          guardrails: ["Live preview of Home, accent intensity"],
          prompt: "Garnet Appearance: System/Dark/Light, accent intensity, live preview of Home; Theme & side (see SETUP-04 cards); Background choices for the shared hero (night sky, aurora, plain). Save / Cancel, 'Reset to default'."
        },
        {
          id: "SET-04",
          title: "Nicknames and greetings",
          route: "/settings/greetings",
          states: ["default"],
          guardrails: ["Live preview of greeting line"],
          prompt: "Garnet 'Nicknames & greetings': my nickname for Noah, greeting style (Good morning / custom), live preview of the Home greeting and a notification line."
        },
        {
          id: "SET-05",
          title: "Notification preferences",
          route: "/settings/notifications",
          states: ["categories-list"],
          guardrails: ["Preview button shows simulated notification for each setting"],
          prompt: "Garnet Notifications: groups Messages; Emotional signals; Days and memories; Open When and surprises; Events; Account and security; Optional reminders. Each category row has a mode selector Immediate / Quiet / Scheduled / Off, and sound / vibration / badge sub-toggles where supported."
        },
        {
          id: "SET-06",
          title: "Quiet hours",
          route: "/settings/quiet-hours",
          states: ["enabled-window"],
          guardrails: ["Never bypassed for support signals (Garnet isn't emergency)"],
          prompt: "Garnet Quiet hours: toggle (on by default), start and end time pickers in local time with the partner's equivalent shown, optional days, note 'Garnet isn't an emergency service, so quiet hours are never bypassed.' Default window is open (U-21): show 22:00–07:00 labelled 'Suggested'."
        },
        {
          id: "SET-07",
          title: "Lock-screen preview privacy",
          route: "/settings/preview-privacy",
          states: ["options-with-mockups"],
          guardrails: ["Generic default: 'Garnet — Something new for you 💜'"],
          prompt: "Garnet 'Lock-screen previews': three options with live notification mockups — Generic ('Garnet — Something new for you 💜', recommended, default), Sender and category only ('Noah · Thought'), Full content. Explanation: 'Anyone who can see your phone can see previews.'"
        },
        {
          id: "SET-08",
          title: "Reminder intensity",
          route: "/settings/reminders",
          states: ["gentle-selected"],
          guardrails: ["No repeated nudges, no guilt"],
          prompt: "Garnet 'Reminders': Off / Gentle / Custom, with example copy. No repeated nudges, no guilt."
        },
        {
          id: "SET-09",
          title: "Privacy & read receipts (U-35)",
          route: "/settings/privacy",
          states: ["default-off"],
          guardrails: ["Plain language list: what Noah sees vs never sees"],
          prompt: "Garnet Privacy: plain-language list of what Noah sees (shared moments, signals, revealed days) and never sees (your drafts, your settings, sealed letter contents). Read receipts (U-35): off by default, explanation of what turning it on shares. Typing indicator toggle."
        },
        {
          id: "SET-10",
          title: "Time zone & day boundary",
          route: "/settings/timezones",
          states: ["default"],
          guardrails: ["Labelled 'Provisional — not decided yet' (U-02)"],
          prompt: "Garnet 'Time zone & day': my timezone, Noah's timezone, the shared day boundary shown on both clocks, labelled 'Provisional — not decided yet' (U-02), and a link to the explainer (DAYS-10)."
        },
        {
          id: "SET-11",
          title: "Offline and sync (prototype)",
          route: "/settings/offline",
          states: ["status-all-synced", "simulated-offline"],
          guardrails: ["Badge 'Prototype'"],
          prompt: "Garnet 'Offline & sync': status 'Everything on this device' (simulated), pending items list, developer toggle 'Simulate offline' with a 'Prototype' badge, retry button."
        },
        {
          id: "SET-12",
          title: "Devices, sessions & password",
          route: "/settings/devices",
          states: ["sessions-list"],
          guardrails: ["2FA and Passkeys labelled 'Coming later'"],
          prompt: "Garnet 'Devices & sessions': this device (current), other devices with last active time and 'Sign out' per device, 'Sign out of all other devices'. Password: change password form. Rows 'Two-step verification — Coming later' and 'Passkeys — Coming later' (disabled)."
        },
        {
          id: "SET-13",
          title: "Export my data",
          route: "/settings/export",
          states: ["info", "preparing", "ready-download"],
          guardrails: ["Never includes Noah's private drafts"],
          prompt: "Garnet 'Export my data': what's included (your drafts, shared moments, letters you wrote or received and opened, signals, memories) and what's not (Noah's private drafts). Primary 'Prepare export'. States: preparing, ready (download, expires in 7 days), expired."
        },
        {
          id: "SET-14",
          title: "End our space (unpair)",
          route: "/settings/unpair",
          states: ["step-1-consequences", "step-2-export-first", "step-3-type-end"],
          guardrails: ["Careful tone, must type 'END' to confirm, cancel available at all steps"],
          prompt: "Garnet 'End our space' flow, dark, careful tone. Step 1: consequences in plain language and the current direction: 'You'll be asked what happens to shared memories. Noah can export first.' (provisional, P-37). Step 2: 'Export first' primary, 'Continue'. Step 3: type 'END' to confirm, final destructive button 'End our space', and Cancel at every step."
        },
        {
          id: "SET-15",
          title: "Delete my account",
          route: "/settings/delete-account",
          states: ["consequences", "confirm-phrase"],
          guardrails: ["Separate from End space, export option"],
          prompt: "Garnet 'Delete my account' flow: consequences, export option, separate from 'End our space', explicit confirmation phrase, final destructive button. Note: 'Deleting from Garnet can't erase screenshots, downloads or copies outside Garnet.' Possible grace period shown as provisional (U-23)."
        },
        {
          id: "SET-16",
          title: "Help, about & licensing",
          route: "/settings/about",
          states: ["default"],
          guardrails: ["Character artwork: rights and distribution not yet authorized disclaimer (U-10)"],
          prompt: "Garnet 'About': version, 'Prototype — no real accounts or messages', privacy and terms links, 'Character artwork: rights and distribution not yet authorized; internal prototype only' (U-10), open-source licences list, Send feedback form (text + screenshot toggle)."
        },
        {
          id: "SET-17",
          title: "Reset demo data",
          route: "/(dialog)/reset-demo",
          states: ["dialog", "toast-restored"],
          guardrails: ["Restores sample data cleanly on device"],
          prompt: "Garnet dialog 'Reset demo data?' — 'This restores the prototype's sample data on this device.' Cancel / Reset. Toast 'Demo data restored.'"
        }
      ]
    },
    {
      id: "16-sys",
      title: "16 · System Overlays & States",
      file: "16-system-overlays-and-states.md",
      prompts: [
        {
          id: "SYS-01",
          title: "Overlay catalogue board",
          route: "/system/overlays",
          states: ["dark-board", "light-board"],
          guardrails: ["Every overlay has trigger and dismissal rule, cancel first on dialogs"],
          prompt: "Garnet overlay catalogue board (dark and light), each shown over a dimmed screen with its trigger noted: Quick Log sheet; Emotional action sheet; Media source sheet; Mood/activity picker; Reaction picker; Message context menu; Delete for me; Delete for everyone; Discard changes ('Keep editing' / 'Discard'); Open letter confirmation; Delete letter/memory; Save chat media as memory; Event date/time picker; Start long-distance confirmation; End relationship/unpair; Delete account; Notification permission rationale; Media permission rationale; Clear search history; Reset demo data; Sign out."
        },
        {
          id: "SYS-02",
          title: "Toasts and banners",
          route: "/system/feedback",
          states: ["toasts-list", "banners-list"],
          guardrails: ["Toasts sit above tab bar, auto-dismiss 4s, screen reader announced"],
          prompt: "Garnet feedback patterns board: toast 'Saved to your day.' (with subtle check); local draft 'Draft saved on this device.'; pending 'Waiting to sync when you're back online.' (labelled simulated); recoverable error 'That didn't work. Try again.' with Retry; offline banner 'You're offline. Some changes may wait to sync.'; permission denied 'Garnet can work without this permission. You can enable it in Settings later.'; removed 'Removed from this view.'; app update notice 'A new version is ready — restart when you like.'"
        },
        {
          id: "SYS-03",
          title: "Empty, loading, slow & skeleton",
          route: "/system/states",
          states: ["skeletons", "empty-states", "slow-state"],
          guardrails: ["Warm copy, figure/crystal slot, one clear action"],
          prompt: "Garnet states board: skeletons for a timeline, a grid and a detail page (soft shimmer, static in reduced motion); slow state after 3 s ('Still working on it…'); empty states with a small [FIGURE] slot or crystal, one warm line and one action: Days 'Your days will gather here, one small moment at a time.', Memories 'Your story starts with one memory.', Letters 'Leave something for the days apart.', Search 'Nothing found. Try another word or filter.'"
        },
        {
          id: "SYS-04",
          title: "Errors & edge states",
          route: "/system/errors",
          states: ["fatal-error", "unavailable", "compact-keyboard"],
          guardrails: ["Plain language, input always preserved: 'Your moment is still safe.'"],
          prompt: "Garnet error and edge states board: fatal error screen 'Something went wrong ❤️ — Your moment is still safe. Try again.'; unavailable 'This item isn't available here.' (no details); unauthorized (same copy, no leak); expired link; duplicate action ('Already sent.'); media progress and retry; long text and long names truncation; compact 375×667 screen with keyboard open; session expired (content hidden)."
        },
        {
          id: "SYS-05",
          title: "Tab bar & headers",
          route: "/system/navigation",
          states: ["tab-bar-states", "collapsing-headers"],
          guardrails: ["Frosted glass, badges are dots (never numbers/counts of emotional signals)"],
          prompt: "Garnet navigation board: frosted glass tab bar (Home, Days, Us, Moments, Our World), thin line icons, selected tab filled with the active accent and a label; badge style for new items (a dot, never a count of emotional signals). Headers: large title collapsing to compact on scroll, back behaviour, iOS swipe-back and Android back noted."
        },
        {
          id: "SYS-06",
          title: "Demo / prototype affordances",
          route: "/system/prototype",
          states: ["affordances-board"],
          guardrails: ["Clearly secondary, never mistaken for real features"],
          prompt: "Garnet prototype affordances: a small 'Simulated' badge style for fake sends and emails, the developer settings panel (simulate offline, simulate failures, latency slider, reset demo data), and the notification/email preview lab entry. Clearly secondary, never mistaken for real features."
        }
      ]
    },
    {
      id: "17-labs",
      title: "17 · Notifications, Emails & Widgets",
      file: "17-notifications-emails-widgets.md",
      prompts: [
        {
          id: "NOTIF-01",
          title: "Notification centre (in-app)",
          route: "/notifications",
          states: ["populated", "empty"],
          guardrails: ["Unread dot for viewer only (never a 'seen' signal to partner)"],
          prompt: "Garnet in-app notification centre, iPhone 393×852, dark. Grouped by day; each row: category icon, title, safe body, time, unread dot (for the viewer only — never a 'seen' signal to the partner). Tap opens the target after re-checking access. 'Mark all as read'. Empty: 'You're all caught up.'"
        },
        {
          id: "NOTIF-02",
          title: "Notification preview lab",
          route: "/lab/notifications",
          states: ["generic-mode", "category-mode", "full-mode", "ios-lock", "ios-banner", "android-shade"],
          guardrails: ["Simulated badge, test all 19 notification categories"],
          prompt: "Garnet 'Notification preview lab' (prototype tool), dark. Top: privacy mode selector (Generic / Sender and category / Full) and device frame toggle (iOS lock screen, iOS banner, Android heads-up, Android shade). Below: one row per category from the catalogue; tapping renders that notification in the chosen frame. Badge 'Simulated — no notification is sent'."
        },
        {
          id: "EMAIL-01",
          title: "Email preview lab",
          route: "/lab/emails",
          states: ["verify-email", "password-reset", "invite-partner", "security-alert", "export-ready", "mobile-width", "desktop-width", "plain-text"],
          guardrails: ["No passwords, no emotional signal details in any email"],
          prompt: "Garnet 'Email preview lab' (prototype tool): list of templates; each opens with toggles Mobile / Desktop, HTML / Plain text, Images on / Images blocked, and link state Valid / Expired / Used / Invalid / Signed out. Badge 'Simulated — no email is sent'."
        },
        {
          id: "WIDGET-01",
          title: "Widget preview gallery",
          route: "/lab/widgets",
          states: ["small-widgets", "medium-widgets", "large-widgets", "lockscreen-widgets", "ios-style", "android-style"],
          guardrails: ["No streak counters, no separation counter, privacy-neutral"],
          prompt: "Garnet widget gallery (in-app previews, not real widgets), dark and light, iOS and Android styles: small, medium and large sizes for each widget below, plus long/short content, missing image, private-preview mode and stale data ('Updated 14:05'). Glassy surfaces, the Garnet crystal as the anchor, no scores, no separation counter."
        }
      ]
    }
  ]
};
