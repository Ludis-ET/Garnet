# Garnet — page design prompts

Design prompts for **every page, state, overlay, notification, email and widget** in the [Master Mobile Design Specification](../master-mobile-design-specification.md) (inventory A1, layouts A2, overlays A3, copy A4, notifications A5, emails A6, widgets A7, motion A8, visibility A9).

Use them in your design tool of choice (Figma AI / Figma Make, Uizard, Galileo, v0, or an image model for hero art). After a page is designed and you approve it, we implement it in `apps/mobile` exactly as designed (backlog gate **B-04**: no page is coded before its design exists).

## How to use a prompt

1. Paste the master style once per session (or at the top of each prompt if your tool forgets context): **[v2 Daylight Glass](#master-style-v2--daylight-glass-p-48)** for pages already redesigned under P-48 to P-56 (01, 02, 03, 05, 06 and 07 so far), otherwise **[v1](#master-style-paste-first)**.
2. Paste the page prompt. Each one names its frame, layout, content, states and the rules it must not break.
3. Design **every state listed** for that page. A page is not done until its empty, loading, error and edge states exist.
4. Export or link the frames and tell me the page ID (for example `HOME-01`). I'll implement it against the design, with tests.

**Frames.** Primary: **iPhone 16 Pro, 393 × 852 pt**, light (Daylight Glass) for v2 pages and dark for v1 pages. Then the other scheme, and a compact phone (**375 × 667**) for any screen with forms or long content. Android check: **412 × 915 dp** (Material back behaviour, no iOS-only gestures).

## Character figures (read before designing)

The intended experience uses the **actual _Steven Universe_ characters Ruby, Sapphire and Garnet** as premium 2D figures from owner-generated images (owner directions **P-30**, **P-45**). Rights and distribution authorization are **unresolved (U-10)**, so:

- Prompts refer to figures with slots: **`[RUBY FIGURE]`**, **`[SAPPHIRE FIGURE]`**, **`[GARNET FIGURE]`**, plus a pose from the [pose inventory](../../characters/art-brief.md#pose-and-expression-inventory).
- **The app's figures (P-45):** generated with [gemini-character-prompt.md](../gemini-character-prompt.md) and kept in the git-ignored `apps/mobile/assets/characters/`. For internal design work, use those same images in the slots so designs match the app.
- In the design tool, place **your own rights-cleared figure render** into the slot, or a neutral silhouette stand-in. **Don't ask a tool to recreate official artwork**, and don't paste screenshots from the show into designs that will be shared.
- Every screen must still work and look complete **without** the figure (the app ships a crystal placeholder; P-31 safeguards). Design the "artwork unavailable" variant wherever a figure appears.
- The **Garnet crystal**, gem capsules, shards and light are **original** 3D motifs and can be generated freely.
- Figures appear only where the spec places them (spec §3): Welcome, setup, identity/theme, Home hero, anniversary, together/fusion moments, selected empty states, major emotional transitions, loading moments and the brand screen. **Never** on dense working screens (chat, forms, settings lists).

---

## Master style v2 — Daylight Glass (P-48)

> **Update (P-55):** the logo is the **Garnet mark** (Garnet's face from the owner's image in a glass disc with a ruby → violet → sapphire ring), not the crystal. Personal pages, sheets and forms show the viewer's own gem and a warm (Ruby) or cool (Sapphire) canvas; shared pages show Garnet and the mixed canvas.

Owner direction **P-48** (2026-10-22): white, iOS-quiet, glassy, award-level polish with Duolingo-smooth, springy interaction. It applies to the pages redesigned so far ([01 — Welcome and account](./01-welcome-and-account.md) [02 — Pairing](./02-pairing.md), [03 — Identity and setup](./03-identity-and-setup.md), [05 — Home](./05-home.md), [06 — Days and logging](./06-days-and-logging.md) and [07 — Us](./07-us-emotional.md), P-49, P-51, P-53, P-56); the other pages keep v1 until they are redesigned. Product rules, copy voice, privacy and accessibility from v1 all still apply.

```text
GARNET — MASTER STYLE v2 "DAYLIGHT GLASS"
Product: a private iOS/Android app for exactly two partners in a long-distance relationship.
Promise: "I can't be there with you right now, but I can still be part of your day."
Metaphor: Ruby (warm rose, one partner) + Sapphire (calm sky blue, the other) → Garnet (violet,
together). Signature image: two panes of tinted glass overlapping into lilac.

Feel: light, airy, intimate, modern, award-winning. Apple-level restraint (iOS 18+ quiet
typography, inset grouped lists, large titles) + Duolingo-level tactility (one question per
screen, chunky-but-elegant buttons, springy feedback, small celebrations). NOT a dashboard,
social network, productivity app, habit tracker, generic couples template or anything childish.
No statistics, scores, streaks or "days apart" counters.

Canvas: porcelain white #FAF9FC with a very soft aurora: rose #FFD3DE (top-left), sky #D3E0FF
(top-right), lilac #E4DBFF (low centre), each a radial fade, drifting a few points over ~24 s.
Glass panes: backdrop blur 30 + white veil 72 % (text-bearing) or 60 % (decorative), 1-pt top
highlight rgba(255,255,255,0.9), 1-pt hairline rgba(24,18,48,0.07), long soft violet shadow
(y 12, blur 32, 8 %). Radii: 22 fields, 28 cards/dock/sheets, 36 hero panes, pills for buttons.
Text: #15131C primary, #575266 secondary, #6B6579 tertiary (all ≥ 4.5:1 on glass over any orb).
Accents: Garnet violet #7B55F0 (primary), Ruby #9E1636 text / #E5486A decoration,
Sapphire #1A3FA8 text / #4F7BFF decoration, success #1E7A57, danger #B4233C.
Primary button: violet pill #7B55F0→#6741E0 on a 4-pt lip #4B2BC2, white label; pressed sinks
onto the lip. Gradient "Together" rose→violet→sky only for progress and ceremonies.
Dark variant "Night Glass": canvas #0E0C14, orbs #5A1730 / #2C1F6E / #0F2A6B at 55 %, glass
rgba(22,19,32,0.66) with a rgba(255,255,255,0.10) highlight; same layouts.

Typography: clean sans for UI and titles (Inter / SF Pro style): large title 34/41 semibold
with −0.6 tracking, title 28/34, headline 17/22 semibold, body 17/24, callout 16/21,
footnote 13/18, caption 12/16. One serif-italic accent phrase per screen at most (Fraunces
italic), e.g. "One space." Left-aligned titles on working screens; centred only on hero and
status screens.

Space: 4-pt grid, 20-pt gutters, 28–36 pt between groups, touch targets ≥ 48 pt.
Iconography: thin 1.75-pt rounded line icons; icons in soft tinted glass circles for status.

Motion: springs everywhere (press: snappy; layout/progress: smooth; success: bouncy). Steps
slide; toasts drop from the top like iOS's Dynamic Island; sheets spring up; errors shake once;
success pops a few rose/violet/sky sparkles. Haptics on device. Every motion has a still
version for reduced motion; Reduce Transparency makes glass solid.

Characters: [RUBY FIGURE], [SAPPHIRE FIGURE], [GARNET FIGURE] slots as in v1 (owner images,
P-45; never official artwork), placed inside or in front of glass panes; never on dense forms.
Copy, privacy and accessibility rules: as in v1.
```

## Master style (paste first)

```text
GARNET — MASTER STYLE
Product: a private iOS/Android app for exactly two partners in a long-distance relationship.
Promise: "I can't be there with you right now, but I can still be part of your day."
Metaphor: Ruby (warm red, one partner) + Sapphire (calm blue, the other) → Garnet (violet, together).

Feel: premium, minimal, intimate, elegant, dreamy, cinematic, calm, alive. Think a luxury
jewellery brand's app crossed with a quiet journaling app. NOT a dashboard, social network,
productivity app, habit tracker, generic couples template, or anything childish or cartoonish.
No statistics walls, no scores, no streak counters, no "days apart" counter as a hero metric.

Canvas: dark-first. Background #0D0B12 (near-black with a violet tint). Surfaces #14111B and
#1B1724. Hairlines #241F30. Text #F7F5FA (primary), #CFC9D9 (secondary), #8B8399 (tertiary).
Light mode: background #F7F5FA, surface #FFFFFF, text #0D0B12 / #4A4358.
Accents — Ruby #E8536F (dark) / #9E1636 (light); Sapphire #5B8CFF / #1A3FA8;
Garnet violet #9A7BFF / #7B55F0. Glow colours: ruby #D7264A, sapphire #2F66F5, cyan #7FE3FF.
Signature gradients (heroes and ceremonies only): Ruby #4A0A1C→#D7264A→#F7A8B8;
Sapphire #0B1B4A→#2F66F5→#7FE3FF; Together #D7264A→#7B55F0→#2F66F5; Night sky #0D0B12→#3D0E2A→#0B1B4A.
Each screen uses ONE dominant accent: the viewer's own side on personal pages, Garnet violet on shared pages.

Typography: an elegant high-contrast display serif for titles and emotional lines (e.g. Fraunces
or Cormorant style), a clean humanist sans for UI (e.g. Inter / SF Pro style).
Scale (pt): display 34/40 semibold, title 24/30, headline 19/25, body 16/23, callout 15/21,
footnote 13/18, caption 12/16. Generous line height, sentence case, no all-caps paragraphs.

Space and shape: 4-pt grid; 16 pt screen gutters; 24–32 pt between sections; radii 14 (cards),
20 (sheets), 28 (hero cards), pill buttons. Touch targets ≥ 48 pt. Lots of negative space.
Cards are rare and quiet: soft 1-pt hairline or a very soft glow, never heavy drop shadows.
Glass: subtle frosted surfaces over gradients for sheets and the tab bar.

3D: the original Garnet crystal is the hero object — a faceted gem with internal light,
subsurface glow, caustics and soft bloom. Ruby energy enters from the left (warm), Sapphire
from the right (cool), meeting as violet in the centre. Gem capsules (ruby, sapphire, violet)
hold letters and surprises. Particles are sparse and slow.
Figures: premium collectible-figure renders (soft-touch vinyl / satin resin finish), studio
softbox key light plus a coloured rim light in the character's colour, shallow depth of field,
standing on a small faceted crystal plinth. Figures are always placed in a [FIGURE] slot.

Iconography: thin 1.75-pt rounded line icons, filled only for the selected tab. Emoji are
allowed as a warm accent in copy but never as the only label of an action.

Motion (annotate, don't overdo): quick 180 ms, standard 260 ms, gentle 420 ms, ceremony 900 ms.
Ruby motion slightly lively, Sapphire calm and floating, Garnet meeting in the centre.
Every animated moment needs a reduced-motion version (cross-fade or static).

Copy voice: warm, short, never guilt or pressure. Use names, not pronouns
("Noah thought of you"). Never "seen", "read", "ignored", "missed" (as blame), "last chance".
Privacy: lock-screen and widget previews are generic by default. Sealed letters and surprises
never show their contents. Private drafts are marked "Only you".

Accessibility: WCAG 2.2 AA contrast, status never by colour alone (pair with icon/text),
Dynamic Type up to 200 %, labelled controls, reduced motion respected.
Navigation: bottom tab bar with 5 tabs — Home, Days, Us, Moments, Our World. Profile/settings
from the avatar in the Home header.
```

## Crystal and figure art direction (for hero art)

Use these when producing the hero assets themselves: 3D for the original crystal motifs (Blender, Spline, Cinema 4D or an image model), 2D illustration for the figures.

```text
GARNET 3D — CRYSTAL HERO
A single original faceted gemstone, slightly elongated octahedral cut, floating above a
reflective black-violet floor. Inner light shifts: warm ruby glow from the left, cool sapphire
glow from the right, blending to violet in the core. Physically based glass/gem material,
dispersion and caustics, soft bloom, faint dust motes. Studio lighting: large soft key from
above-front, ruby rim light left, sapphire rim light right. 50 mm lens, f/2.8, shallow depth
of field. Background deep #0D0B12 with a subtle night-sky gradient. Minimal, luxurious, calm.
Deliver transparent PNG/WebP at 1024 and 2048 px, plus a static frame for reduced motion.

FIGURE STAGING — use with your rights-cleared [RUBY/SAPPHIRE/GARNET FIGURE] artwork
Premium 2D illustration, front view, full body. Clean vector shapes with soft gradients, a fine
darker line in each figure's own colour, a gentle highlight on the face, a soft coloured aura
behind (ruby #D7264A / sapphire #2F66F5 / violet #7B55F0) and a soft contact shadow.
Clean dark backdrop, no props, no text. Match the app's character images (docs/design/gemini-character-prompt.md).
Poses (art brief C-01…C-12): idle, wave, happy, listening, hug, holding the crystal, cosy nap,
thinking, writing a letter, celebrating, together (fusion moment), waving goodnight.
Never sad, angry or abandoned. Deliver transparent PNG at 1x/2x/3x, 3:4 aspect, plus a
square crop, and keep each pose as a separate replaceable file.

GEM CAPSULES — Open When and Surprises (original motif)
A small rounded gem capsule, like a jewel-cut locket, in ruby, sapphire or violet. Closed:
softly glowing seam. Eligible: gentle pulse of light. Opening: seam splits with light spilling
out. Opened: two halves resting apart, light settled. Same lighting as the crystal hero.
```

## Global components (design once, reuse everywhere)

`COMP-01` — **component sheet.** Prompt:

```text
Using the Garnet master style, design a component sheet on a 1440-wide board, dark and light:
buttons (primary pill with accent fill, secondary outline, tertiary text, destructive, icon
button; default/pressed/disabled/loading), text field and text area (label, helper, error,
focused, filled, password reveal), toggle, segmented control, select row, list row (with
chevron, with toggle, destructive), avatar (photo, initials, ruby/sapphire ring), chip/tag,
media tile (photo, video with duration, voice note with waveform, uploading with progress,
failed with retry), card (quiet hairline), bottom sheet (grabber, title, content, actions),
dialog (title, body, cancel, confirm, destructive confirm), toast/snackbar (success, error with
retry), banner (offline, permission, pending), skeleton blocks, empty state (figure slot +
line + action), error state, "Only you" privacy badge, "Simulated" demo badge, tab bar
(5 tabs: Home, Days, Us, Moments, Our World; selected/unselected), header (large title,
compact, with back), segmented page tabs, date separator, timestamp with local + partner time.
Annotate sizes, radii, spacing and states. Touch targets ≥ 48 pt.
```

## Index

| File                                                                           | Pages                                                                                  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [01 — Welcome and account](./01-welcome-and-account.md)                        | Welcome, create account, sign in, verify, recovery, session                            |
| [02 — Pairing](./02-pairing.md)                                                | Create our space, invite, join, review, accept, invalid states, connected              |
| [03 — Identity and setup](./03-identity-and-setup.md)                          | Name, avatar, side, nickname, timezone, theme preview, notifications, summary          |
| [05 — Home](./05-home.md)                                                      | Home and its states, quick log, emotional sheet, profile menu, banners                 |
| [06 — Days and logging](./06-days-and-logging.md)                              | Days list, timeline, entries, media, voice, pickers, reveal, filters                   |
| [07 — Us: emotional connection](./07-us-emotional.md)                          | Thought, Missing You, I Need You, Talk, Check On Me, Can't Talk Yet, Okay Now, history |
| [08 — Chat](./08-chat.md)                                                      | Conversation, composer, replies, reactions, edit, delete, pins, search, states         |
| [09 — Open When](./09-open-when.md)                                            | Library, create, sealed, eligible, opening, opened, unavailable                        |
| [10 — Memories](./10-memories.md)                                              | Timeline, collections, create, detail, viewer, voice, save from chat, delete           |
| [11 — Events and chapters](./11-events-and-chapters.md)                        | Calendar, event, birthday, anniversary, monthly chapter, chapters, reminders           |
| [12 — Surprises](./12-surprises.md)                                            | Library, create, locked, reveal, cancelled, errors                                     |
| [13 — Future and Our World](./13-future-and-our-world.md)                      | When We Meet Again, places, soundtrack, shared world, together state                   |
| [14 — Search](./14-search.md)                                                  | Universal search and its privacy states                                                |
| [15 — Settings and account](./15-settings-and-account.md)                      | Every settings page, export, delete, unpair, about/licensing, demo reset               |
| [16 — System overlays and states](./16-system-overlays-and-states.md)          | Every dialog, sheet, menu, toast, banner, empty/loading/error state                    |
| [17 — Notifications, emails and widgets](./17-notifications-emails-widgets.md) | Notification centre and previews, every email, every widget                            |

Each page has an ID (`AREA-NN`) used in commits, tests and review notes.

## Open decisions a designer must not settle

Design both options, or the neutral version, where these apply: day-reveal cutoff (**U-02**), grace and Spark behaviour (**U-03, U-04, U-24**; no streaks or scores), recap reveal defaults (**U-06**), signal retention (**U-09**), character rights (**U-10**), timestamp editing (**U-11**), who deletes letters (**U-31**), account-deletion details (**U-20, U-23**), working icon (**U-25**), author re-reading sealed letters (**U-34**), chat read receipts (**U-35**). Full list: [decision log](../../decisions/decision-log.md).
