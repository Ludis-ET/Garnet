> **Source:** generated Markdown transcription of [`Garnet_Master_Mobile_Design_Specification (1).docx`](<../Garnet_Master_Mobile_Design_Specification%20(1).docx>) (owner-provided, 2026-10-19). If they ever differ, the `.docx` is the original; regenerate rather than hand-edit.

# GARNET ❤️💙

Master Mobile Design Specification

Screen-by-screen UX • Layouts • Dialogs and sheets • Notifications • Emails • Mock behavior • Design approval

> CORE PROMISE “I can't be there with you right now, but I can still be part of your day.”

Private mobile experience for two people entering a long-distance chapter. This replaces the previous Phase 2 plan with a design-first sequence: complete and review the mobile UI using local mock data before building backend functionality.

Platforms: iOS and Android • Working stack direction: React Native + Expo + TypeScript • Status: working specification; open decisions are not treated as approved.

## 0. Updated plan: design first, backend later

The earlier product plan contains extensive product and technical notes. The order of work is now explicitly changed. Do not start backend implementation as the next deliverable.

| Phase                                       | Goal                                                                                                             | Deliverable / exit gate                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1 — Product definition and discovery        | Preserve requirements, prior decisions, spike findings, risks, and security issues.                              | A clear product baseline and open-decision log.  |
| 2 — Complete mobile design + mock prototype | Design and implement every planned screen and state with local mock data only.                                   | Navigable app prototype; no backend dependency.  |
| 3 — Design review and freeze                | Review the actual prototype with both partners; revise and approve visuals, flows, copy, states, and components. | Versioned design handoff and explicit sign-off.  |
| 4 — Backend and real functionality          | Implement auth, pairing, APIs, database, storage, authorization, and sync against approved journeys.             | Security and data contracts pass required tests. |
| 5 — Integration and feature behavior        | Connect real chat, day logs, memories, Open When, notifications, email, widgets, search, offline.                | Cross-device end-to-end behavior works.          |
| 6 — Release readiness                       | Security/privacy audit, accessibility, performance, device QA, backups, monitoring, recovery, licensing checks.  | First complete version passes release gates.     |

> SCOPE RULE Phase 2 is a UI/UX and mock-prototype phase. It does not include real auth, API calls, database writes, push delivery, email sending, cloud media, or real cross-device sync.

### Final Product, UX, Feature & Build Plan

#### Private long-distance relationship app for two people

**Core idea:** “I can't be there with you right now, but I can still be part of your day.”

## 1. Product Definition

Garnet is a private two-person relationship app designed for a couple entering a long-distance chapter.

It is not a social network, public couples profile, productivity app, habit tracker, or relationship score system.

The app exists to make two ordinary lives feel connected while the people are physically apart.

The product should help answer:

| Feeling / Need                             | App response                  |
| ------------------------------------------ | ----------------------------- |
| “I want to share my life with you.”        | Continuous Day Log            |
| “I thought of you.”                        | I Thought of You              |
| “I miss you.”                              | Missing You                   |
| “I need you.”                              | I Need You                    |
| “I need to talk.”                          | I Need to Talk                |
| “I can't talk yet.”                        | I Can't Talk Yet              |
| “I want you to check on me.”               | Please Check On Me            |
| “I want to remember this.”                 | Memories                      |
| “I have something for you later.”          | Open When / Surprise Drops    |
| “Today matters.”                           | Events                        |
| “I can't wait until we're together again.” | When We Meet Again            |
| “We're still us.”                          | Shared World / Together State |

### Product philosophy

**Make distance feel smaller, not constantly visible.**

The application should not repeatedly remind the couple how many days they have been apart.

A long-distance start date can be stored and used internally, but a large “143 days apart” counter should not dominate the home screen.

The app is a bridge, not a replacement for calls, video calls, conversation, or physical presence.

## 2. Why the Name “Garnet”

The product name is Garnet.

The naming concept is inspired by the Steven Universe relationship between Ruby and Sapphire: two distinct identities becoming Garnet.

That maps naturally to the product:

- Person A → Ruby / warm red
- Person B → Sapphire / blue
- Together → Garnet / shared identity
- Two separate lives → one shared space
  The product should use the conceptual symbolism of two sides becoming one shared space without copying the application's interface directly from Steven Universe.

### Brand language

Primary name:

**Garnet**

Possible short identity:

**Garnet — our space, wherever we are.**

The brand should feel mature, intimate, elegant, dreamy, and personal rather than like a children's cartoon product.

## 3. Steven Universe Character Figures

### Required visual feature

The user wants real figures/depictions of Ruby and Sapphire represented in the application.

These should be treated as an explicit visual-design requirement, not merely a color palette.

#### Character presence

Ruby and Sapphire can appear in carefully selected parts of the experience, for example:

- Welcome screen
- Relationship setup
- Personal profile/theme setup
- Home screen
- Start Long Distance transition
- Special anniversary experience
- Shared/Together state
- Empty states
- Major emotional transitions
- Loading/transition moments
- Garnet brand identity screen

#### Personal side

The two sides can visually associate with:

Ruby

- red/garnet visual treatment
- Ruby figure
- warm lighting
- warm crystal effects
- energetic but elegant motion
  Sapphire

- blue/sapphire visual treatment
- Sapphire figure
- cool lighting
- floating/crystalline effects
- calm motion

#### Together state

When both sides are represented together:

- Ruby appears on one side.
- Sapphire appears on the other.
- Their visual energy moves toward the center.
- The center becomes the shared Garnet identity.
- The final composition should communicate “two → together.”

#### Important rights requirement

If actual Steven Universe character artwork, screenshots, official assets, or recognizable character illustrations are used in a distributable/public/commercial version, the project must have the appropriate rights/licensing or permission.

For the implementation, do not assume that privately referencing the characters gives permission to redistribute official artwork.

If licensing is unavailable, the fallback should be original characters inspired only by the high-level ruby/sapphire concept, not traced or copied artwork.

This requirement should be decided before public release.

## 4. Visual Design System

### 4.1 Person A — Ruby side

Visual language:

- Deep garnet
- Ruby red
- Burgundy
- Warm pink
- Soft crimson glow
- Crystal highlights
- Warm gradients
- Slightly energetic motion
  The Ruby side should feel warm, expressive, energetic, and alive.

### 4.2 Person B — Sapphire side

Visual language:

- Sapphire blue
- Deep navy
- Soft blue
- Cyan highlights
- Cool glow
- Blue gradients
- Floating particles
  The Sapphire side should feel calm, dreamy, spacious, and serene.

### 4.3 Shared Garnet state

Shared pages combine:

- Ruby
- Sapphire
- Violet
- Deep purple
- Garnet
- Soft luminous gradients
  The shared state should feel like the two visual systems naturally meeting.

### 4.4 Design personality

The app should feel:

- Intimate
- Elegant
- Dreamy
- Minimal
- Alive
- Personal
- Soft
- Modern
- Cinematic
- Calm
  It should NOT feel:

- Like an ERP/dashboard
- Like a social network
- Like a productivity app
- Like a generic couples template
- Like a gamified habit tracker
- Childish
- Overloaded with cards
- Filled with statistics

## 5. Account & Relationship Model

The system contains exactly one private relationship space shared by two people.

Conceptually:

Garnet Relationship│├── Person A│ ├── Account│ ├── Profile│ ├── Ruby theme│ └── Sessions/devices│└── Person B ├── Account ├── Profile ├── Sapphire theme └── Sessions/devices

There are:

- No public profiles
- No followers
- No discovery
- No public posts
- No strangers
- No relationship marketplace
- No social feed
  The relationship is the application's security boundary.

## 6. Complete User Journey

### Stage 1 — Before Long Distance

The couple gets the app while still together.

They can:

1. Create their accounts.
1. Connect the relationship.
1. Select names and avatars.
1. Assign Ruby/Sapphire sides.
1. Add important dates.
1. Add existing memories.
1. Prepare Open When messages.
1. Create future/reunion plans.
1. Configure day reveal.
1. Configure notifications.
1. Create surprise drops.
1. Customize the shared visual identity.
1. Decide when to start Long Distance.
   The app should feel useful before the separation instead of appearing only after the move.

## 7. Authentication & Relationship Connection

### Welcome

Visual:

- Garnet logo
- Ruby/Sapphire visual
- subtle character figures
- short emotional statement
- Create account
- Sign in
  Example:

**Garnet**

>

Two lives. One space.

### Create account

Fields:

- Display name
- Email
- Password
- Confirm password
  Then:

- Email verification
- Personal theme setup

### Sign in

- Email
- Password
- Remember/session option
- Forgot password

### Create relationship

Person A:

Create our space

System creates:

- Relationship
- Invitation token

### Join relationship

Person B:

- Opens invitation
- Reviews relationship identity
- Creates account
- Accepts invitation

### Relationship confirmation

Both see:

**You're connected. ❤️💙**

Then enter setup.

Invitation tokens must be:

- Random
- Short-lived
- Single-use
- Invalidated after acceptance

## 8. Personal Identity Setup

Each person chooses:

- Display name
- Profile image/avatar
- Theme side
- Optional nickname
- Notification preferences
- Timezone
  The application should visually identify:

YOURuby ❤️PARTNERSapphire 💙TOGETHERGarnet 💜

The names and pronouns should be configurable rather than hard-coded.

## 9. Start Long Distance

This is a major emotional transition.

### Entry point

Settings/setup/home:

**Start Our Long Distance**

### Confirmation flow

Screen:

**Ready to begin our next chapter?**

Explain:

Your shared space is ready. When you both confirm, Garnet will begin your Long Distance chapter.

Both people must confirm.

Possible states:

- Waiting for partner
- You confirmed
- Partner confirmed
- Both confirmed
  When both confirm:

**Our next chapter has begun. ❤️💙**

Visual transition:

Ruby ❤️ Sapphire 💙 \ / \ / \ / GARNET 💜

A short, elegant animation transitions the app into Long Distance mode.

### Important

Store:

- Start date
- Start time
- Timezone context
  But do not make a large separation counter the central home metric.

## 10. Home Screen

The Home screen is the heart of Garnet.

It should be useful within seconds.

### Structure

1. Greeting
1. Ruby/Sapphire/Garnet visual
1. Character figures where appropriate
1. Quick actions
1. Today's connection state
1. Recent moments
1. Upcoming event
1. Important waiting item
1. Subtle navigation

### Main actions

#### + Log Something

For sharing life.

#### 💭 I Thought of You

For a tiny emotional connection.

#### 🥺 Missing You

For a simple signal.

#### 🫂 I Need You

For emotional support.

These should be visually prominent.

### Home visual

A central original Garnet crystal can react to activity.

Ruby energy enters from one side.

Sapphire energy enters from the other.

When both interact with the same content, the center gently becomes violet.

## 11. Continuous Day Logging

This is one of the most important features.

A day is not one journal entry.

It is a chronological stream of small moments.

Example:

08:12 ☕ First coffee09:03 💼 Arrived at work11:47 😩 This meeting is taking forever13:15 🍝 Lunch15:42 💭 Thought about you18:06 🚇 Going home19:21 📸 Sunset21:10 🏠 Home22:34 ❤️ Missing you

The purpose is:

“I want you to know what my day looked like.”

### Entry types

- Text
- Photo
- Video
- Voice note
- Feeling
- Activity
- Food
- Work
- Place
- Custom

### Quick Log flow

Home ↓+ Log Something ↓Choose: ├── Text ├── Photo ├── Video ├── Voice ├── Feeling ├── Activity └── More ↓Save

Target:

Create a simple moment in 1–3 interactions.

Timestamp is automatic.

User can edit:

- Time
- Text
- Category
- Attached media
- Visibility

## 12. Day Timeline

Each person has a chronological day timeline.

Example:

**Her Day — London 🇬🇧**

08:12☕ Coffee09:03💼 Work12:41📸 Lunch15:42💭 Thought of you18:06🚇 Going home19:21📸 Sunset

Design principles:

- Photos should be visually important.
- Videos should feel natural.
- Voice notes should have simple playback.
- Text should be short by default.
- Timeline should feel like seeing someone's life, not reading a formal journal.

## 13. Day Reveal

The day can remain private while each person logs.

### Default behavior

Reveal when both people have finished their day.

Possible modes:

1. Both submitted
1. Specific time
1. Manual reveal

### Before reveal

**Your day is still yours for now.**

### Ready state

**Your days are ready to meet. ❤️💙**

Then both timelines become visible.

### Live exceptions

These should not wait for reveal:

- I Need You
- I Thought of You
- Missing You
- Urgent messages
- Important surprises

## 14. I Thought of You

Fastest emotional interaction.

Button:

**💭 I Thought of You**

Tap once.

Optional:

- Text
- Photo
- Voice
- Video
  Example:

“I saw someone wearing the same perfume you use.”

The partner receives a lightweight notification.

### Animation

A tiny Ruby/Sapphire particle travels toward the partner and becomes a small violet light.

The action should feel instant.

## 15. Missing You

Button:

**🥺 Missing You**

Optional choices:

- A little
- A lot
- I need a hug
  Optional message.

This is communication, not measurement.

Never create:

- Missing-you streaks
- Sadness scores
- “You missed me 37 times”
- Competition
- Relationship rankings

## 16. I Need You

A major emotional feature.

Button:

**🫂 I Need You**

Then:

**What do you need right now?**

Options:

- 😔 I'm feeling down
- 😣 I'm overwhelmed
- 🥺 I feel lonely
- 🧠 I need to talk
- 🫂 I need comfort
- 😡 Something upset me
- 😶 I don't know what's wrong
- ❤️ I just need you
  Optional attachment:

- Text
- Voice
- Photo
- Video
  Partner receives:

**She needs you 🫂**

With the selected request.

Actions:

- I'm here
- Send comfort
- Talk to her
- Call
- Video call
- Check on her later
  Call/video integration can be added later.

## 17. I Need to Talk

This is a more specific communication flow.

Options:

- Work
- Life
- Us
- Something difficult
- Something on my mind
- I don't know
- Just listen

### Just Listen

This option is important.

It communicates:

“I don't need advice right now. I need you to listen.”

## 18. Please Check On Me

A low-energy way to ask for support.

Options:

- Check on me now
- Check on me later
- Check on me tonight
- Check on me tomorrow
  The app creates a reminder for the partner.

## 19. I Can't Talk Yet

This prevents silence from being misunderstood.

Message:

**I'm not okay, but I'm not ready to talk yet.**

Optional actions:

- Check on me later
- Give me some space
- Stay close
- Send comfort

## 20. I'm Okay Now

Closes an emotional loop.

Button:

**❤️ I'm Okay Now**

Partner sees:

**She's feeling better. ❤️**

This reduces uncertainty without turning the application into emotional surveillance.

## 21. Emotional Privacy

All emotional signals are private to the relationship.

Never create:

- Mental-health scores
- Public emotional status
- Emotional rankings
- Automatic diagnosis
- “Worst month” reports
- Negative performance statistics
  The app helps two people communicate.

It does not diagnose either person.

## 22. Open When

Open When is the emotional archive for things that cannot always be said at the right moment.

Examples:

- Open when you miss me
- Open when you have a terrible day
- Open when you can't sleep
- Open when you're homesick
- Open when you're angry with me
- Open when you need to laugh
- Open when you need motivation
- Open on your first day at work
- Open when you need to hear my voice
- Open when you want to remember us

### Content

An Open When can contain:

- Letter
- Photos
- Voice recording
- Video
- Song/link
- Multiple attachments

### Unlock types

- Specific date/time
- Manually available
- Optional emotional/manual trigger
  The creator controls the unlock behavior.

### Visual

Use crystal/gem capsules.

- Ruby/garnet capsule
- Sapphire capsule
- Shared violet capsule
  Opening:

1. Tap crystal
1. Crystal glows
1. Subtle opening animation
1. Content appears

## 23. Shared Memories

A private archive of their life.

Memories can contain:

- Photos
- Videos
- Text
- Voice notes
- Dates
- Places
- Stories
- Important moments
  Possible collections:

- Before Long Distance
- First days apart
- September
- October
- Birthdays
- Anniversaries
- Trips
- Random moments

## 24. Relationship Chapters

Instead of focusing on how long they have been apart, organize the experience into chapters.

Example:

#### Before Long Distance

Preparing

#### Chapter 01

London begins

#### Chapter 02

Finding our rhythm

#### Chapter 03

Still us

Users can rename chapters.

The application should preserve the story, not turn the relationship into statistics.

## 25. Special Events

Calendar supports:

- Birthdays
- Anniversary
- Monthly milestones
- First meeting anniversary
- First date anniversary
- Custom events
- Important personal events
- Work milestones
- Travel dates
- Reunion dates
  Each event can have:

- Date
- Title
- Description
- Recurrence
- Theme
- Background
- Photos
- Scheduled messages
- Open When content
- Surprise Drops

## 26. Birthday Mode

On a birthday, the interface temporarily becomes a special experience.

Possible elements:

- Birthday person's color dominates
- Character figure
- Special crystal animation
- Birthday memories
- Birthday messages
- Scheduled surprises
- Previous birthday photos
- Optional birthday story
  It should feel like opening a special page, not receiving a generic calendar alert.

## 27. Anniversary Mode

The shared theme becomes dominant.

Ruby + Sapphire → Violet/Garnet.

Possible content:

- Relationship memories
- Photos
- Letters
- Favorite moments
- Shared timeline
- Previous anniversaries
- Future plans
- Custom message
- Character figures / shared Garnet visual
  The page can be manually curated.

## 28. Monthly Chapters

A month can become a small relationship chapter.

Example:

**October · Our Second Chapter**

Optional reflection:

- Favorite moment
- Favorite photo
- Something we learned
- Something we're looking forward to
  No mandatory monthly form.

No guilt for skipping a month.

## 29. Surprise Drops

One person prepares something hidden for the other.

Types:

- Message
- Photo
- Video
- Voice note
- Letter
- Song/link
- Future-date idea
  Schedule by:

- Date
- Time
- Event
- Birthday
- Anniversary
  Notification:

**You have something waiting for you. 🎁**

Never reveal the content in the notification.

## 30. When We Meet Again

A future-oriented shared list.

Examples:

- Recreate our first date
- Go to a restaurant
- Cook together
- Spend a whole day together
- Visit a place
- Take our first photo after London
- Try something neither of us has done
  Each plan can contain:

- Title
- Description
- Photo
- Location
- Notes
- Optional target date
  When completed:

**We finally did it. ❤️💙**

This prevents the application from becoming a museum of sadness.

## 31. Shared Places

Do not implement continuous location tracking.

Instead:

**📍 I'm here today**

A voluntary location entry can include:

- Place
- Photo
- Short note
  Purpose:

Share pieces of life, not surveillance.

## 32. Shared Soundtrack

Private collection of songs associated with:

- Memories
- Dates
- Long-distance moments
- Specific people
- Special events
  Each item can have a note:

“I listened to this on the way home and thought of you.”

Store links/metadata rather than copyrighted audio files unless appropriate rights exist.

## 33. Shared Growing World

Optional visual layer.

The relationship has a shared crystal/world.

It can gradually contain:

- Crystals
- Stars
- Light
- Plants
- Memories
- Small visual artifacts
  This is not a points system.

Never:

- Remove things because someone missed a day
- Create love points
- Create relationship scores
- Punish inactivity
- Create streak pressure
  The world represents accumulated memories.

## 34. Fusion / Together State

The visual system should have a recurring concept:

Ruby ❤️ ─────→ GARNET ←───── Sapphire 💙

Possible triggers:

- Both viewing the same memory
- Both responding to an event
- Both interacting with shared content
- Completing a milestone
- Opening a shared surprise
- Anniversary
- Reunion
  The transition should be subtle.

Avoid copying an existing Steven Universe fusion animation.

## 35. Phone Home-Screen Widget

A widget is an important part of the product.

The user should be able to interact with Garnet without opening the full application.

### Primary widget

GARNET ❤️💙+ Log something💭 Thought of You🫂 I Need YouSomething waiting for you.

The widget should be privacy-first.

Do not display sensitive emotional text by default.

Avoid:

“Your girlfriend is depressed.”

Prefer:

**Garnet ❤️**

>

Something waiting for you.

### Future widgets

#### Quick Log

One-tap logging.

#### Thought

I Thought of You.

#### Connection

I Need You.

#### Memory

Random shared memory.

#### Event

Next special event.

No default long-distance sadness counter.

## 36. Notifications

Notifications should be meaningful and restrained.

### Day

- “Your days are ready to meet. ❤️💙”
- “Her day is ready.”
  Avoid guilt.

### Emotional

- “She needs you 🫂”
- “He wants to talk.”
- “She asked you to check on her later.”
- “He’s feeling better. ❤️”

### Thought

- “She thought of you 💭”
- “He left something for you.”

### Surprise

- “You have something waiting for you. 🎁”

### Events

- Birthday
- Anniversary
- Custom events
- Scheduled surprises

### Notification settings

Per category:

- Immediate
- Quiet
- Scheduled
- Off
  Categories:

- Day reveals
- Thoughts
- Missing You
- Emotional support
- Open When
- Surprises
- Events
- Memories

## 37. Notification Privacy

Sensitive content must not appear on a lock screen unless explicitly enabled.

Default:

**You have something from Garnet ❤️**

Optional detailed previews can be enabled.

## 38. Main Navigation

Recommended:

HOMEDAYSUSMOMENTSOUR WORLD

Settings/profile can be accessed separately.

### HOME

The emotional center.

### DAYS

- My Day
- Partner's Day
- Reveal
- Timeline

### US

- Thought of You
- Missing You
- Emotional support
- Shared connection

### MOMENTS

- Open When
- Surprises
- Birthdays
- Anniversaries
- Events

### OUR WORLD

- Memories
- Chapters
- Future plans
- Soundtrack
- Places
- Shared crystal/world

## 39. Complete Screen Inventory

### Authentication

1. Welcome
1. Create account
1. Sign in
1. Verify email
1. Forgot password
1. Reset password
1. Create relationship
1. Join relationship
1. Relationship confirmation

### Before Long Distance

1. Setup relationship
1. Personal identity/theme
1. Character/theme preview
1. Important dates
1. Prepare Open When
1. Add memories
1. Configure reveal
1. Configure notifications
1. Start Long Distance confirmation

### Home

1. Home
1. Quick Log
1. Thought of You
1. Missing You
1. I Need You

### Days

1. Days overview
1. My Day
1. Partner's Day
1. Day reveal
1. Day entry detail
1. Add/edit entry

### Emotional

1. I Need You selector
1. I Need to Talk
1. Please Check On Me
1. I Can't Talk Yet
1. I'm Okay Now
1. Emotional event detail

### Open When

1. Open When library
1. Create Open When
1. Open When detail
1. Unlock experience

### Memories

1. Memories
1. Memory detail
1. Create memory
1. Timeline/chapter

### Events

1. Events calendar
1. Event detail
1. Birthday mode
1. Anniversary mode
1. Monthly chapter
1. Create custom event

### Surprises

1. Surprise library
1. Create surprise
1. Surprise reveal

### Future

1. When We Meet Again
1. Add future plan
1. Complete future plan

### Shared world

1. Our World
1. Shared crystal/world
1. Soundtrack
1. Places

### Settings

1. Profile
1. Theme
1. Character/visual settings
1. Notification settings
1. Privacy
1. Security
1. Devices/sessions
1. 2FA/passkeys
1. Data export
1. Delete account/relationship

## 40. UX Principles

### Speed

Most frequent actions should take 1–3 interactions.

### Emotional continuity

The application should never make someone reconstruct a thought they were trying to send.

### Auto-save

Draft:

- Text
- Voice
- Surprise
- Open When
- Memory
  should be preserved.

### Background uploads

Media should upload without blocking the rest of the interface.

### Retry

Failed media should remain available for retry.

### Optimistic UI

Safe text actions can appear immediately while the request completes.

### Loading

Use skeletons and meaningful loading states rather than blank screens.

### Error language

Instead of:

500 INTERNAL_SERVER_ERROR

Use:

**Something went wrong ❤️**

>

Your moment is still safe. Try again.

For uploads:

**Couldn't upload this photo yet.**

>

We'll keep trying.

Never lose user-created content because of temporary failure.

## 41. Offline Support

The app should support poor connectivity.

### Text

Allow offline day entries.

### Media

Queue uploads.

Show:

Uploading...

Then:

Saved ❤️

### Sync

When connection returns:

- Sync queued entries
- Prevent duplicates
- Resolve conflicts
- Preserve timestamps
- Never silently discard user content

## 59. Complete Emotional Flow Example

#### Scenario

One person is having a difficult day in London.

They open Garnet.

HOME ↓🫂 I Need You ↓😣 I'm overwhelmed ↓Optional voice note ↓Send

Partner receives:

**She needs you 🫂**

They tap:

**I'm here**

The first person receives:

**He's here for you. ❤️**

Later:

Please Check On Me ↓Tonight

Later:

**❤️ I'm Okay Now**

The partner receives:

**She's feeling better. ❤️**

This entire sequence is part of the relationship story without becoming a public or statistical emotional record.

## 60. Complete Daily Flow Example

#### Morning

Open Garnet↓+ Log↓☕ Coffee

#### Work

- Log↓💼 Arrived at work

#### Lunch

- Log↓📸 Photo

#### Random thought

💭 I Thought of You↓“I saw something that reminded me of you.”

This sends immediately.

#### Evening

- Log↓🚇 Going home

#### Night

Day↓Finish day

When both are finished:

**Your days are ready to meet. ❤️💙**

Each person can then experience the other's complete day.

## 61. Complete Open When Flow

Before the move:

MOMENTS↓OPEN WHEN↓Create↓“Open when you miss me”↓Write letter↓Add photos↓Add voice note↓Choose unlock rule↓Save

Later:

**Something has been waiting for you.**

Open:

Crystal↓Glow↓Open↓Letter + photos + voice

## 62. Complete Surprise Flow

MOMENTS↓SURPRISES↓Create Surprise↓Choose content↓Choose recipient↓Choose date/time↓Lock

At unlock:

**You have something waiting for you. 🎁**

The contents remain hidden until opened.

## 63. Complete Anniversary Flow

Notification↓Open Garnet↓Anniversary Mode

Visual:

- Ruby
- Sapphire
- Violet
- Garnet crystal
- Character figures if licensed/approved
  Content:

1. Anniversary message
1. Favorite memory
1. Shared photos
1. Previous memories
1. Letter
1. Future plan
1. “When We Meet Again”
   The experience should feel like a special chapter.

## 64. Complete Reunion Flow

When they eventually meet:

OUR WORLD↓When We Meet Again↓Plans↓Complete first plan

Animation:

**We finally did it. ❤️💙**

The app should preserve the long-distance chapter as part of their shared history rather than treating the separation as the entire identity of the product.

## 65. MVP Definition

The first usable release should prioritize the features that create the core emotional loop.

### MVP — Must Have

- Two-person relationship
- Authentication
- Relationship invitation
- Ruby/Sapphire themes
- Garnet visual identity
- Start Long Distance
- Home
- Continuous Day Logging
- Photos
- Voice notes
- Chronological timeline
- Day reveal
- I Thought of You
- Missing You
- I Need You
- I Need to Talk
- Please Check On Me
- I Can't Talk Yet
- I'm Okay Now
- Open When
- Memories
- Events
- Birthdays
- Anniversaries
- Surprise Drops
- When We Meet Again
- Push notifications
- Privacy/security foundations
- Mobile-first experience

### Post-MVP

- Advanced widgets
- Shared growing world
- Soundtrack
- Places
- Passkeys
- Richer character experiences
- Advanced reunion experience
- Calling/video integrations

## 67. Testing Strategy

### Unit tests

- Business rules
- Day reveal logic
- Authorization
- Event recurrence
- Notification preferences
- Unlock rules

### Integration tests

- Authentication
- Relationship membership
- Media access
- Day reveal
- Emotional signals
- Open When unlock
- Notifications

### Security tests

- IDOR/BOLA
- Unauthorized relationship access
- Session revocation
- Password reset abuse
- Rate limiting
- Upload validation
- XSS
- Injection

### E2E

Test:

1. Create relationship
1. Partner joins
1. Prepare Open When
1. Start Long Distance
1. Log a day
1. Reveal days
1. Send Thought
1. Send Missing You
1. Send I Need You
1. Resolve emotional state
1. Birthday
1. Anniversary
1. Surprise
1. Reunion plan
1. Complete reunion plan

## 68. Launch Security Checklist

Before release:

- HTTPS
- Strong password hashing
- Email verification
- Secure reset
- Session revocation
- Relationship authorization
- Private media
- Signed media URLs
- Rate limiting
- Input validation
- Secure headers
- CSRF protection where applicable
- XSS protection
- SQL injection protection
- Secret management
- Dependency scanning
- Audit/security logs
- Backup strategy
- Restore testing
- Account deletion
- Data export
- Privacy policy
- Terms of use
- Character artwork/licensing review

## 69. Product Success Criteria

Garnet succeeds if:

1. Logging a moment takes seconds.
1. Seeing the other person's day feels intimate rather than intrusive.
1. Saying “I need you” is easier than writing a difficult message.
1. The home screen does not constantly make distance feel sad.
1. Special dates genuinely feel special.
1. The application feels distinctly like the two people using it.
1. Ruby and Sapphire identities are obvious but elegant.
1. Character figures feel integrated rather than pasted onto the interface.
1. Shared experiences visually blend the two identities.
1. Private relationship data is properly protected.
1. The app works well across Ethiopia/London timezones.
1. After months apart, the couple has a meaningful digital story of what they experienced together.
1. When they reunite, Garnet remains valuable as their shared memory archive.

## 70. Final Feature Set

### Essential

- Private two-person relationship
- Secure authentication
- Relationship invitation
- Start Long Distance
- Home
- Ruby identity
- Sapphire identity
- Garnet shared identity
- Character figures
- Continuous Day Logging
- Photos
- Video
- Voice notes
- Chronological timeline
- Delayed day reveal
- I Thought of You
- Missing You
- I Need You
- I Need to Talk
- Please Check On Me
- I Can't Talk Yet
- I'm Okay Now
- Open When
- Memories
- Chapters
- Birthdays
- Anniversaries
- Custom events
- Surprise Drops
- When We Meet Again
- Notifications
- Phone widgets
- Private media
- Strong authorization
- Privacy controls
- Original gemstone animations

### Later

- Shared growing world
- Soundtrack
- Places
- Advanced widgets
- Passkeys
- Calling/video integrations
- Richer reunion experience
- Expanded character experiences

## 71. The Core Experience in One Diagram

GARNET 💜 Private shared space │ ┌────────────────┼────────────────┐ │ │ │ RUBY ❤️ SHARED SAPPHIRE 💙 Person A US Person B │ │ │ │ │ │ My Day Memories Their Day Thoughts Events Thoughts Feelings Open When Feelings Life Surprises Life │ │ │ └────────────────┼────────────────┘ │ WHEN WE MEET AGAIN │ ❤️💙

## 72. Final Product Principle

Garnet should not constantly tell the couple:

“You are far apart.”

Instead, it should quietly enable:

“This happened to me today.”

“I thought of you.”

“I miss you.”

“I need you.”

“I have something waiting for you.”

“Remember this?”

“Today matters.”

“I can't wait until we do this together.”

And eventually:

**“We finally did it. ❤️💙”**

The application should feel like a small private world that the two people continue building together.

## 73. Final Identity

Name: Garnet

Core metaphor:

Two people. Two colors. One shared space.

Visual language:

Ruby ❤️ + Sapphire 💙 → Garnet/Violet 💜

Emotional purpose:

Presence across distance.

Product promise:

**I can't be there with you right now, but I can still be part of your day.**

Non-negotiable design rule:

**The app should make distance feel smaller, not make distance constantly visible.**

## APPENDIX A — Design-first screen-by-screen build contract

The preceding product specification preserves the original feature language and journeys. This appendix translates that product direction into the specific screen inventory, layout rules, overlay behavior, mock behavior, notification/email templates, and sign-off criteria needed to build the prototype.

### A1. Required route and screen inventory

| Area                 | Every screen/state required in mock prototype                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome/account      | Welcome; Create account; Sign in; Forgot password; Reset-password preview; Verify email; verification success; session expired; sign-out confirmation; account form errors.                                                                                                                                                                             |
| Pairing              | Create our space; invitation generated; copy/share preview; invitation pending; join from invite; review relationship identity; accept/decline; expired/revoked/invalid invite; already-paired conflict; connected success.                                                                                                                             |
| Identity/setup       | Display name; avatar selection; personal Ruby/Sapphire/neutral side choice if approved; nickname; timezone; theme preview; notification explanation/preferences; setup summary.                                                                                                                                                                         |
| Before long distance | Pre-long-distance home; setup checklist; add important date; prepare Open When; add existing memory; day-reveal setup; notification setup; shared identity customization; start transition; each confirmation state; waiting for partner; both-confirmed state.                                                                                         |
| Home                 | Default; first-use; empty recent moments; upcoming event; waiting item; quick-log sheet; emotional action sheet; profile menu; offline banner; notification permission banner.                                                                                                                                                                          |
| Days/logging         | Days list/calendar; day detail/timeline; add/edit/detail log; media preview; mock voice note recording; media picker; mood/activity picker; reveal waiting/ready/recap; day boundary explainer; filter/search results; deleted/unavailable entry.                                                                                                       |
| Emotional connection | Thought compose/sent/received; Missing You compose/sent/received; I Need You; I Need to Talk choice; Just Listen; Please Check On Me; I Can’t Talk Yet; I’m Okay Now; signal history/detail; privacy explanation; muted/failed/pending states.                                                                                                          |
| Chat                 | Conversation list; conversation; composer; reply preview; reaction picker; message details; edit; delete-for-self; delete-for-everyone; pinned messages; in-chat search/results/no results; read receipt settings; typing/online preview; pending/failed message; empty conversation; conversation details.                                             |
| Open When            | List; locked letter; create; edit draft; prompt/category; body editor; media attach; unlock condition; date/time; recipient preview; sealed state; eligible state; opening confirmation/animation; opened letter; expired/removed; access denied.                                                                                                       |
| Memories             | Timeline; collections; collection detail; create/edit memory; memory detail; media viewer; voice note player; add to collection; save chat media as memory; remove from collection; delete confirmation; search/filter; empty collection; unavailable media.                                                                                            |
| Events/chapters      | Event list/calendar/detail; create/edit event; birthday; anniversary; monthly chapter; relationship chapters/list/detail; reminder preferences; celebration state; shared/local time display; timezone clarification.                                                                                                                                   |
| Surprises            | List; create; choose content; reveal condition; preview; scheduled/locked; notification preview; open; expired/cancelled; unavailable/delivery error.                                                                                                                                                                                                   |
| Future/shared world  | When We Meet Again list/create/detail; shared places list/map placeholder/detail; soundtrack list/detail; shared growing world; together/fusion state; world customization.                                                                                                                                                                             |
| Search               | Universal search; recent queries; grouped results; filters; no results; cleared history; private draft exclusion; sealed letter privacy; deleted/unavailable result; result detail.                                                                                                                                                                     |
| Settings/account     | Settings home; profile; edit profile; appearance; personalization; nicknames/greetings; background; notification preferences; quiet hours; preview privacy; privacy; read receipts; timezone/day boundary; offline/sync; sessions/devices; password; export; delete account; unpair/end relationship; about/legal/licensing; feedback; reset demo data. |
| System/overlays      | Quick-action sheet; confirmation/destructive dialog; discard changes; permission rationale/denied; offline/pending-sync banner; recoverable snackbar; fatal error; empty/loading/skeleton; session expired; media progress/retry; app update/restart notice.                                                                                            |

### A2. Page layout and interaction specifications

| Page/family                    | Layout and behavior requirements                                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome                        | Full-height calm background; Garnet wordmark; optional Ruby/Sapphire composition; “Two lives. One space.”; primary Create account; secondary Sign in; short privacy line. Artwork unavailable and reduced-motion variants. Routes work locally; no account is created. |
| Create account                 | Fields: display name, email, password, confirm password. Visible labels, email keyboard, password visibility, inline validation, legal links, submit/loading/success/error. Simulate duplicate email, malformed email, mismatch, weak password and service failure.    |
| Sign in / recovery             | Email/password; forgot password; create account. Recovery response must not reveal whether an account exists. Reset preview includes valid, expired, used and invalid link states. Mock emails only; no real send.                                                     |
| Pairing / invite               | Private two-person explanation; local fake invite; copy/share preview; expiry and single-use explanation; waiting status; join review screen; accept/decline; expired/revoked/invalid states. Never use real invitation tokens.                                        |
| Identity setup                 | Display name, avatar/initials, personal side/theme, optional nickname, timezone, notification controls and theme preview. Explain permissions before requesting; in mock phase all permissions are simulated.                                                          |
| Start Long Distance            | Explain chapter transition; both partners confirm; show own-confirmed, partner-confirmed, waiting and both-confirmed states. Transition is short and skippable. No dominant days-apart counter.                                                                        |
| Home                           | Order: greeting/profile; shared hero; compact emotional actions; quick log; recent moments; one upcoming event if present; safe waiting item; five-tab navigation. No relationship score, streak, or guilt language.                                                   |
| Days list                      | Chronological list or calendar-plus-list selected consistently; today shortcut; date labels; previews of moments; filters/search. Empty, unrevealed, revealed, unavailable and loading states.                                                                         |
| Day timeline                   | Time-ordered entries with type, author, text preview, media thumbnail, visibility state and contextual menu. Types: text, photo, video, voice note, feeling, activity, food, work, place, custom. Preserve typed text when media selection is cancelled.               |
| Quick log                      | Bottom sheet for text/type/optional media/mood; Save and More options. Save updates Home and Days immediately in mock state. Draft autosave is local and explicitly labelled “on this device”.                                                                         |
| Day reveal                     | Before reveal: explain state without exposing partner content. Ready state: calm CTA. Recap combines both timelines chronologically. Emotional signals bypass day reveal. Cutoff hour remains open; 03:00–05:00 London was only a suggestion.                          |
| Emotional signal compose       | Fast sheet, one optional note, Send/Cancel; one-tap signal can be available for simple signals. Show sent/received/muted/pending/failure states. Never imply recipient was notified unless confirmed by real delivery later.                                           |
| Chat list/conversation         | Private one-to-one list; recent preview and time; conversation with message grouping, date separators, composer above keyboard, scroll-to-latest, reply, reactions, edit, pin, delete and search states. No public contacts.                                           |
| Chat media                     | Only curated photos, video and voice notes; no generic file attachments. Preview media and destination. Sending in chat does not automatically create a memory.                                                                                                        |
| Open When list/locked          | Show safe prompt/title, sender, status and eligibility. Never show body or protected attachments while sealed. Locked detail has no peek action. Search, email, notification, accessibility and logs must not reveal body.                                             |
| Open When create/open          | Create: prompt/category, body, curated attachments, unlock condition, date/time, recipient preview, save draft/seal. Eligible: explicit Open action; brief optional animation; opened content shows timestamp and allowed attachments. UI mock is not security proof.  |
| Memories/collections           | Timeline plus curated collections; collection cover/title/description; create memory with caption/date/media/tags/destination; viewer controls; explicit “Save as memory” action from chat; distinguish remove-from-collection from delete-memory.                     |
| Events/chapters                | List/calendar; create/edit title/type/date/timezone/description/cover/reminder; birthday and anniversary treatments; monthly recap without score; chapter title/date editable. Display timezone where confusion is possible.                                           |
| Surprise drops                 | List safe title/status; create content and reveal condition; sender preview of recipient view; locked state hides contents; open state reveals content. Cancellation and edit-after-open semantics must be decided.                                                    |
| Future plans                   | List/group by date or theme; allow flexible “someday” or date range; plan title/note/place/linked event or memory; no deadline pressure or countdown as main metric.                                                                                                   |
| Shared places/soundtrack/world | Places are saved memories, not continuous location tracking. Soundtrack lists title/artist/artwork and permitted external link. Shared world changes for intentional moments, not app usage. Character art rights remain unresolved.                                   |
| Search                         | Search messages, day entries, envelope titles/prompts, media metadata, events and milestones subject to authorization. Group results by type. Exclude private drafts; never index sealed body; no stale deleted result.                                                |
| Settings                       | Grouped sections: Account; Personalization; Notifications; Privacy & Safety; Shared Space; Data & Storage; Help/About. Toggles explain what partner can see. Preview changes; save/cancel behavior consistent.                                                         |
| Account lifecycle              | Export before irreversible deletion; delete account, unpair relationship and delete an individual item are separate. Explain effects and confirmation. Exact fate of shared content after departure remains open.                                                      |
| Widget previews                | Small/medium/large shared hero, memory, quick action, today, event, lock-screen concept. Safe content only; show freshness where stale data matters; consequential actions open app or require confirmation.                                                           |
| Universal states               | Empty, loading, slow, offline, pending, failed, retry, permission denied, expired, unauthorized, deleted, no results, unavailable media, session expired, duplicate action, long text and compact-screen/keyboard states.                                              |

### A3. Dialog, sheet, menu, and banner catalog

| Overlay                           | Entry point         | Content and behavior                                                                                                                                    |
| --------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick Log sheet                   | Home/Days           | Text, type, optional media/mood; Save, More options, Cancel. Update timeline and Home; preserve draft on cancel where appropriate.                      |
| Emotional action sheet            | Home/US             | Choose signal, optional note, Send/Cancel. Never send a meaningful signal accidentally.                                                                 |
| Media source sheet                | Log/chat/memory     | Photos, video, voice note; explain permission; mock picker only.                                                                                        |
| Mood/activity picker              | Log compose         | Categorized options, selected state, clear selection.                                                                                                   |
| Reaction picker                   | Message             | Small reaction palette; update/remove mock reaction.                                                                                                    |
| Message context menu              | Message long press  | Reply, React, Edit if eligible, Pin, Delete; ownership and state control options.                                                                       |
| Delete for me                     | Chat                | Clarify only current view is removed.                                                                                                                   |
| Delete for everyone               | Chat                | Explain effects and that screenshots/external copies cannot be recalled; later implementation must handle replies, indexes, caches and offline devices. |
| Discard changes                   | Any form            | Keep editing / Discard; only if meaningful unsaved data would be lost.                                                                                  |
| Open letter confirmation          | Open When           | Show safe prompt and eligibility; Open / Not now; body unavailable until eligible and opened.                                                           |
| Delete letter/memory              | Content detail      | State whether item, media and collection links are removed.                                                                                             |
| Save chat media as memory         | Media detail        | Choose collection, caption/title, Save/Cancel; explicit action.                                                                                         |
| Event date/time picker            | Event               | Date/time/timezone and reminder preview; validate ambiguous time.                                                                                       |
| Start long-distance confirmation  | Setup               | Explain both-person confirmation and waiting state.                                                                                                     |
| End relationship/unpair           | Privacy             | Consequences, export option, confirmation phrase, final cancel/confirm; content lifecycle decision must be closed before backend.                       |
| Delete account                    | Account             | Explain consequences; export option; explicit destructive confirmation.                                                                                 |
| Notification permission rationale | Setup/settings      | Explain benefit; Not now / Continue to OS prompt; simulate in prototype.                                                                                |
| Media permission rationale        | Media action        | Explain why access is needed; allow cancel and limited access state.                                                                                    |
| Clear search history              | Search/settings     | Clarify scope; Clear/Cancel.                                                                                                                            |
| Reset demo data                   | Prototype settings  | Restore seeded data; clearly prototype-only.                                                                                                            |
| Sign out                          | Account             | Clarify local draft handling; cancel/sign out.                                                                                                          |
| Expired invitation                | Pairing             | Explain expiry and request new invitation; no dead end.                                                                                                 |
| Session expired                   | Global              | Hide protected content; return to sign in.                                                                                                              |
| Offline/pending action            | Global              | Explain local-only vs waiting state and retry; never claim delivery.                                                                                    |
| Permission denied                 | Media/notifications | Explain OS settings path and alternative flow.                                                                                                          |
| Edit personalization              | Settings            | Live preview; Save/Cancel; reset default.                                                                                                               |
| Reminder options                  | Event               | Reminder time/channel/category; avoid duplicates.                                                                                                       |

### A4. Toasts, banners, empty states, and error copy

| Pattern           | Example copy                                                                    | Rule                                          |
| ----------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| Success           | “Saved to your day.”                                                            | Brief; saved item remains visible in context. |
| Local draft       | “Draft saved on this device.”                                                   | Never imply cloud sync.                       |
| Pending           | “Waiting to sync when you’re back online.”                                      | Only if true later; label simulated in mock.  |
| Recoverable error | “That didn’t work. Try again.”                                                  | Preserve input and offer retry.               |
| Offline           | “You’re offline. Some changes may wait to sync.”                                | Explain what remains available.               |
| Permission denied | “Garnet can work without this permission. You can enable it in Settings later.” | Only where accurate.                          |
| Removed           | “Removed from this view.”                                                       | Describe exact scope.                         |
| No results        | “Nothing found. Try another word or filter.”                                    | Offer query/filter edit.                      |
| Empty timeline    | “Your days will gather here, one small moment at a time.”                       | Warm invitation, never guilt.                 |
| Unavailable       | “This item isn’t available here.”                                               | Do not leak protected/deleted content.        |

### A5. Notification catalogue and settings

| Category                 | Title pattern                         | Body pattern                              | Privacy rule                                                        |
| ------------------------ | ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Thought                  | A little thought from {sender}.       | “A little thought from {sender}.”         | Show note only if sender included it and recipient allows previews. |
| Missing You              | A little closer, even from afar       | {sender} is missing you.                  | No urgency language; category independently muteable.               |
| I Need You               | A message from {sender}               | They sent you a support signal.           | No automatic escalation; recipient settings apply.                  |
| I Need to Talk           | When you have a moment                | {sender} would like to talk.              | No emergency implication or forced response timer.                  |
| Please Check On Me       | A gentle check-in request             | {sender} asked you to check in.           | If reminders are approved, respect quiet hours and deduplicate.     |
| I Can’t Talk Yet         | A note from {sender}                  | {sender} can’t talk just now.             | Avoid rejection framing.                                            |
| I’m Okay Now             | A little reassurance                  | {sender} let you know they’re okay.       | Optional; sensitive details hidden on lock screen.                  |
| New chat message         | Message from {sender}                 | {message_preview}                         | Preview setting controls body text.                                 |
| Reply/reaction           | A response to your message            | {sender} replied/reacted.                 | Can combine or mute.                                                |
| Day reveal               | Your day is ready to revisit          | Your shared day is ready.                 | No countdown/guilt copy.                                            |
| Open When eligible       | A letter is ready when you are        | {safe_prompt_or_generic_copy}             | Never reveal body.                                                  |
| Surprise drop            | Something for you                     | {safe_title_or_generic_copy}              | Respect sender’s secrecy choice.                                    |
| Event reminder           | Coming up: {event_title}              | {date_time_context}                       | Correct timezone and per-event setting.                             |
| Birthday/anniversary     | A day that matters to you both        | Your {event_type} is today.               | Respect event and reminder preferences.                             |
| Partner joined           | You’re connected                      | {partner_display_name} joined your space. | Only after confirmed acceptance.                                    |
| Invitation               | You’ve been invited to a shared space | Open Garnet to review the invitation.     | Do not expose token in preview.                                     |
| Security/account         | A change to your account              | Review this activity in Garnet.           | Keep detail inside authenticated app.                               |
| Media ready              | Your memory is ready                  | A media item finished processing.         | Use only if useful; avoid noisy alerts.                             |
| Optional memory reminder | Save this moment if you’d like        | Optional gentle reminder.                 | Off/low frequency; no guilt.                                        |
| Service notice           | A Garnet update                       | Important service information.            | Reserve for genuine service messages.                               |

#### Notification preferences screen

- Group controls: Messages; Emotional signals; Days and memories; Open When and surprises; Events; Account/security; Optional reminders.
- Each person controls categories independently. Optional sound, vibration, banner and badge settings appear only where supported.
- Quiet hours include start/end and optional days if approved. Do not silently bypass quiet hours: Garnet is not an emergency service.
- Preview privacy options: Full content / sender and category only / generic. Recommended default is privacy-preserving.
- Reminder intensity: Off / Gentle / Custom where useful. Avoid repeated nudges and guilt.
- Every setting has a simulated notification preview. No real OS settings change in mock phase.
- If OS permission is denied, show how to enable it later while keeping unrelated app features usable.
- Never claim recipient was notified without confirmed delivery. Deep links re-check access and must not reveal stale cached content.

### A6. Email template library and responsive rules

Phase 2 includes designed email previews, not real sending. Each template must have mobile and desktop previews, a plain-text version, images-blocked state, expired/invalid link states, and a clear fallback URL. Never include passwords or sealed letter body content in email.

| Type                    | Subject                                | Body                                                                                                      | CTA               | Footer                                                             | Implementation note                                                       |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Verify email            | Verify your email for Garnet           | You’re one step away from setting up your private space.                                                  | Verify email      | If you didn’t create this account, you can ignore this message.    | Real implementation: expiring verification token; verified sender/domain. |
| Password reset          | Reset your Garnet password             | We received a request to reset the password for this account. If it was you, use the secure button below. | Reset password    | If you didn’t request this, no action is needed. The link expires. | Single-use token; do not disclose account existence in app response.      |
| Relationship invitation | You’ve been invited to Garnet          | Someone invited you to join a private two-person space. Review who invited you before accepting.          | Review invitation | Only accept if you recognize the person. Invitation links expire.  | No private content in email; secure single-use invite.                    |
| Partner joined          | You’re connected on Garnet             | Your partner has joined your shared space. Open Garnet to continue setup.                                 | Open Garnet       | If this wasn’t expected, review account and relationship settings. | Send only after server-confirmed acceptance.                              |
| Security alert          | Review a change to your Garnet account | A security-related change occurred on your account. Open Garnet to review details.                        | Review activity   | If you don’t recognize this activity, secure your account.         | Keep sensitive details out of email.                                      |
| Optional event reminder | Coming up: {event_title}               | A date you chose to remember is coming up on {date}.                                                      | View event        | You control event reminders in Garnet settings.                    | Only when opted in; deduplicate push/email.                               |
| Open When ready         | A letter is ready when you are         | A letter has reached its opening condition. Open Garnet to read it.                                       | Open Garnet       | The letter’s contents are kept inside Garnet.                      | Never include body or attachments.                                        |
| Surprise ready          | Something is waiting for you           | A surprise is ready to open in Garnet.                                                                    | Open surprise     | The sender’s privacy choice controls what appears in previews.     | Keep surprise contents out of email.                                      |
| Export ready            | Your Garnet export is ready            | The export you requested is ready to download securely.                                                   | Download export   | This link expires. Keep the file private.                          | Authorized short-lived download; no public bucket.                        |
| Account deletion        | Confirm your Garnet account deletion   | You requested account deletion. Review the consequences before confirming.                                | Review deletion   | If you did not request this, do not confirm it.                    | Opening email must not delete account; require secure confirmation.       |
| Service notice          | An update about Garnet                 | There is an important update about the service or your account.                                           | View update       | Only use for genuinely important service messages.                 | Separate operational notices from relationship notifications.             |

#### Shared email visual system

- Header: Garnet wordmark and restrained Garnet accent. No large copyrighted character art by default.
- One-column responsive layout, readable type, high contrast, CTA works in common mobile mail clients, no essential text embedded in images.
- Footer explains why the recipient received the email, offers help/privacy routes, and includes appropriate security context.
- Use descriptive link text and meaningful alt text; include a plain-text equivalent.
- Never include passwords, private drafts, emotional signal details, Open When body, or surprise body in email by default.
- Provide fallback URL/text when CTA cannot be used; design invalid, expired, already-used and signed-out states.
- Preview lab must label email as simulated and must not send any real message.

### A7. Widget and system experience matrix

| Widget              | Variants                                              | Tap behavior / guardrail                                                  |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Shared-space hero   | Small/medium/large; Garnet visual and short greeting. | Open Home; no score or large separation counter.                          |
| Shared memory       | Photo/voice/memory preview and optional date.         | Open memory only after authorization; obey preview privacy.               |
| Quick action        | Thought, Missing You, Quick Log.                      | Open app/composer; consequential signal requires deliberate confirmation. |
| Today/day log       | Today label and safe recent entries.                  | Open Days; respect unrevealed/private state.                              |
| Event               | Next event title/date in compact or large layout.     | Open event; show correct timezone.                                        |
| Lock-screen concept | Compact icon/label and safe summary.                  | No sensitive content by default.                                          |

Create static mock previews for all sizes, light/dark themes, long/short content, missing images, private-preview mode, and stale-data state. Real widgets and refresh behavior are later implementation.

### A8. Motion, sound, haptics, and reduced motion

| Moment               | Design language                         | Guardrail                                     |
| -------------------- | --------------------------------------- | --------------------------------------------- |
| Ruby                 | Warm, energetic, subtle glow/particles. | Short and restrained; no constant animation.  |
| Sapphire             | Calm, floating, cool glow.              | Not sluggish or distracting.                  |
| Garnet together      | Warm/cool movement meets into violet.   | Reserved for milestones/selected transitions. |
| Thought              | Small light/heart pulse.                | Brief; does not block action.                 |
| Missing You          | Gentle inward glow.                     | No alarming shake or urgent flash.            |
| I Need You/Talk      | Grounded acknowledgement.               | Does not imply emergency dispatch.            |
| Open When            | Controlled envelope reveal.             | No body until eligible and explicitly opened. |
| Birthday/anniversary | Short celebratory flourish.             | Skippable.                                    |
| Routine save         | Subtle checkmark/fade.                  | No oversized celebration.                     |

Respect Reduce Motion. No meaning may depend on sound/haptics. Motion timings should be tokenized and finalized during design QA. Avoid infinite particle loops or repeated attention grabs.

### A9. Time, privacy, and content visibility

| Visibility type       | Design rule                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Personal draft        | Author only; never partner-facing, shared timeline, notification, or partner search.              |
| Shared immediately    | Visible to both after save subject to authorization.                                              |
| Personal until reveal | Author sees before reveal; shared after configured reveal.                                        |
| Emotional signal      | Follows approved signal delivery; not blocked by day reveal.                                      |
| Sealed content        | Safe prompt/title may be visible; body and protected media unavailable until eligible and opened. |
| Deleted/unavailable   | Do not resurrect from cache; show safe unavailable state.                                         |

- London is the shared reference timezone in the current plan, not an assumption that both people live there. Show local time and shared context where needed.
- The exact shared-day cutoff remains open; 03:00–05:00 London was a suggestion only.
- Account deletion, unpairing, and deleting a single item are separate actions. Provide export before irreversible actions where appropriate.
- Deletion must eventually propagate through search, caches, collections, resurfacing and offline devices.
- External screenshots/downloads cannot be recalled; say so when explaining delete-for-everyone.
- Open When API authorization gap is a known blocker from prior closeout; UI concealment is not sufficient. Server authorization and negative tests are mandatory later.

### A10. Mock prototype architecture and fixtures

Use React Native + Expo + TypeScript as the working direction, subject to auditing the current repository. UI components call typed mock repositories rather than importing hard-coded arrays. Later, replace mock repositories with API adapters without rewriting screen components.

| Mock entity         | Suggested fields                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| DemoUser            | id, displayName, emailLabel, avatar, personalSide, nickname, timezone, theme, notificationPreferences.                            |
| Relationship        | id, partnerIds, displayName, sharedTheme, longDistanceStatus, startAt, sharedTimezone, dayBoundarySetting.                        |
| DayEntry            | id, authorId, createdAt, type, text, mediaRefs, mood, visibilityType, status, editedAt.                                           |
| Message             | id, senderId, createdAt, text, replyToId, reactions, editedAt, deletedFor, deliveryState, pinned.                                 |
| EmotionalSignal     | id, senderId, type, note, createdAt, state, safePreview, simulatedDeliveryState.                                                  |
| OpenWhenLetter      | id, authorId, safePrompt, bodyMock, mediaRefs, unlockType, unlockAt, state, openedAt; never render body in locked recipient view. |
| Memory/Collection   | id, title, caption, date, mediaRefs, collectionIds, tags, coverRef, memoryIds.                                                    |
| Event               | id, title, type, startsAt, timezone, description, reminderSettings, theme.                                                        |
| Surprise/FuturePlan | safeTitle, bodyMock, unlockCondition, state, targetDateOrRange, placeRef, linkedItems.                                            |
| NotificationPreview | id, category, title, body, privacyMode, createdAt, deepLinkTarget, simulatedDeliveryState.                                        |
| EmailPreview        | id, templateType, subject, preheader, body, CTA, fallbackText, state.                                                             |
| SearchResult        | id, itemType, safeTitle, safeSnippet, date, authorized, sealed, deleted, targetRoute.                                             |

- Create/edit/delete a local day entry and reflect it in Home and Days.
- Create a mock message; reply, react, edit, pin, search, and simulate delete scopes.
- Trigger each emotional signal and preview notification copy under different privacy settings.
- Create a letter; preview locked state; simulate unlock; open only through intended flow.
- Create a memory and collection; explicitly save chat media as memory.
- Create/edit an event and preview notification/email content.
- Change theme, nickname, quiet hours, read receipts, preview privacy and timezone; previews update.
- Search across allowed seeded content while excluding private drafts and sealed body text.
- Simulate offline, pending, failure, retry and expired-session states without losing input.
- Reset demo data to a predictable baseline.

### A11. Accessibility and responsive QA

- Use semantic labels for controls, images, media players, and status indicators.
- Never rely on color alone for identity, selected state, error, or privacy.
- Respect font scaling, reduced motion, screen readers, focus order, keyboard behavior and safe areas.
- Use comfortable touch targets and avoid too many tiny actions in message rows.
- Provide captions/transcripts or accessible descriptions where feasible for media.
- Check contrast in light/dark themes and Ruby/Sapphire accent combinations.
- Test narrow and wide phone screens, long names/text, keyboard open, missing images, and system bars.

### A12. Design freeze checklist

☐ Every screen in the inventory exists or is explicitly excluded with approval.

☐ Every route has entry points, exits, primary/secondary actions and back behavior.

☐ Every form has validation, success, cancel and error states.

☐ Every dialog, sheet, menu, toast and banner has a trigger and dismissal rule.

☐ Every notification category has title/body, privacy behavior, settings control and deep link.

☐ Every email template has subject, body, CTA, fallback, footer, responsive layout and expired/invalid states.

☐ All primary journeys work without backend services.

☐ Mock data is consistent across Home, Days, Chat, Memories, Events, Search and preview lab.

☐ Sealed body is not exposed in locked screen, search, notification, email, accessibility or logs.

☐ Private drafts never appear in partner-facing mock views or universal search.

☐ Actions provide feedback and preserve input on recoverable failure.

☐ Light/dark themes, personal/shared variants and reduced motion are reviewed.

☐ Compact/large phone layouts are checked for clipping, keyboard and safe-area problems.

☐ Copy is intimate and non-coercive; no score, guilt streak or usage ranking.

☐ Simulated behavior is clearly distinguished from real delivery/authentication/sync.

☐ Character-art/licensing status is documented; no assumption of redistribution rights.

☐ Open security/privacy blockers and unresolved lifecycle decisions are handed forward.

☐ Both partners review the clickable prototype and record requested revisions.

☐ Design tokens, component rules, routes, mock contracts and open decisions are versioned.

### A13. Open decisions register

| Decision                             | Status                                           | Handling                                                                        |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Day reveal cutoff                    | Open; 03:00–05:00 London was only a suggestion.  | Keep configurable; approve before shared-day logic.                             |
| Shared content after unpair/deletion | Open.                                            | Define export, ownership, retention and access before backend.                  |
| Steven Universe character rights     | Open.                                            | Desired creative direction remains; resolve rights before public distribution.  |
| Exact color/type/spacing tokens      | To finalize in prototype.                        | Tokenize and review with both partners.                                         |
| Open When unlock types               | Partly open.                                     | Design common date/event/manual paths; approve supported set.                   |
| Read receipt labels/defaults         | Flexible per-person controls agreed.             | Finalize labels and exactly what each state communicates.                       |
| Message edit/delete rules            | Privacy-first and memory-aware direction agreed. | Set edit window, scopes, quote behavior, index cleanup and offline propagation. |
| Calls                                | Planned later.                                   | Do not promise call functionality in the mock unless explicitly added.          |
| AI-assisted search                   | Later possibility.                               | Design universal search without promising AI behavior.                          |
| Shared Spark/grace day               | Concept exists; exact behavior open.             | Avoid streak/score until criteria are explicitly approved.                      |
| Notification defaults                | Adaptive per-person controls agreed.             | Review privacy-preserving defaults and category settings.                       |
| Media provider/region                | Not selected.                                    | Resolve during backend/security phase, not as a visual assumption.              |

### A14. Handoff package after design sign-off

- Approved screen inventory and route map.
- Screen specifications with layouts, actions, exact copy and all key states.
- Design tokens and reusable component library.
- Overlay catalog and interaction rules.
- Notification matrix and email template set.
- Mock data schemas and typed repository interfaces.
- Walkthroughs for onboarding, pairing, day logging/reveal, emotional signals, chat, Open When, memories, events, surprises, search and privacy.
- Accessibility/reduced-motion requirements.
- Open decision register and explicit exclusions.
- Security acceptance criteria including server-side Open When authorization.
- Both partners’ sign-off and a list of accepted changes.

> HANDOFF RULE Backend APIs and data models should fit the approved journeys. Do not redesign the user experience merely to suit implementation convenience.

### A15. Final next step

Audit the current repository and compare existing code against this inventory. Then implement the mobile mock prototype with seeded local data and a preview lab for notifications and emails. Review every screen and state with both partners. Only after sign-off should backend implementation become the active phase.
