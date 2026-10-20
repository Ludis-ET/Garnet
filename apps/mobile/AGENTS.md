# AGENTS.md — `apps/mobile`

Stricter rules for the mobile app, in addition to the root [AGENTS.md](../../AGENTS.md). The nearest file wins on conflicts.

## What this is

The Garnet iOS/Android app: **Phase 2 — complete mobile design and mock prototype** (P-39). Every screen and state on **local mock data only**. No backend, API calls, real auth, push, email, cloud media or sync. Specs: [docs/design/](../../docs/design/README.md). Page prompts and IDs: [docs/design/prompts/](../../docs/design/prompts/README.md).

## The one workflow rule

**Implement a page only from its approved design** (backlog gate B-04), identified by its page ID (`HOME-01`, `OPEN-05`…). Build every state the design and prompt list. If something isn't designed, ask; don't invent product behaviour. Name the page ID in tests and commit messages.

## Expo: don't trust memory

Expo ships breaking changes every SDK. Before touching an Expo, EAS or React Native API:

1. Check the `expo` major version in `package.json` (currently **SDK 57**, see P-40).
2. Read the matching versioned docs: `https://docs.expo.dev/versions/v57.0.0/`, or start from `https://docs.expo.dev/llms.txt`.
3. Add packages with `npx expo install <package>` (run in `apps/mobile`) so versions match the SDK. The workspace's 7-day `minimumReleaseAge` can block the newest patch; then pin the newest compatible version that is at least 7 days old, and say so.

Never create or edit `ios/` or `android/`: they are generated (Continuous Native Generation); configure native behaviour in `app.json` and config plugins. Libraries with native code need a development build (`npx expo run:android`, or EAS for iOS), not Expo Go.

## Structure

```
src/
  app/            Expo Router routes ONLY (every file is a screen; _layout.tsx defines navigators)
  features/<area> Screens' building blocks, hooks and feature components (one folder per prompt area)
  features/figures Figures: data (moods, motion, occasions, scenes), art/ (image lookup, particles), FigureStage, FigureStudio
  components/
    ui/           Shared primitives: Screen, AppText, Button, TextField, Sheet, Dialog, Toast, …
    character/    CharacterSlot + characterAssets registry (the only way to show Ruby/Sapphire/Garnet)
  domain/         Pure types and rules (e.g. openWhen.ts visibility). No React, no I/O
  data/
    repositories/ Interfaces screens depend on
    mock/         MockStore + mock adapters (latency, failure, offline, reset)
    fixtures/     Deterministic fictional demo data
  providers/      App providers and the root error boundary
  theme/          Tokens (provisional), ThemeProvider, contrast helper
```

- Routes stay thin: compose feature components; no business logic in route files or layouts.
- Shared rules that also matter to the server belong in `@garnet/domain` (packages/domain), not here.

## Hard rules

1. **Data only through repositories** (`useRepositories()` plus feature hooks with TanStack Query). Never import fixtures into UI. Never call `fetch` or any network API. New repository methods are added to the interface first.
2. **Tokens only.** No hard-coded colours, font sizes, spacing, radii or durations. Use `useTheme()`. Text uses `AppText`; screens use `Screen`. Tokens are provisional until the design freeze; change them in `theme/tokens.ts` (the contrast tests must stay green).
3. **Privacy in every view** (spec A9, §7):
   - Open When and surprises render only through their view functions (`domain/openWhen.ts`). A sealed view has **no body**: never pass bodies through route params, accessibility labels, logs, search or notification previews.
   - Private drafts never appear in partner-facing views or search.
   - Notification and widget previews are generic by default.
   - Never show "seen", "read" or "delivered" unless it is genuinely known (read receipts are U-35: off by default).
   - UI concealment is **not** authorization; never describe it as security or encryption.
4. **Simulated means labelled.** Fake sends, emails, invites and uploads show a "Simulated" affordance where a reviewer could mistake them for real.
5. **Characters only via `FigureStage` or `CharacterSlot`** (P-30, P-31, P-44, P-45, U-10, U-26). Both show the owner's images from `assets/characters/` (git-ignored) by the naming scheme in its README, and a neutral placeholder when an image is missing; every screen must look complete with the placeholder. Agents may process the owner's files (cut out, crop, rename) but never draw, generate, download or trace character art, and never quote the show. Moods stay warm or neutral (no sad, angry or abandoned reactions). Rights are unresolved (U-10): never call the images licensed.
6. **Copy** follows [voice-and-copy.md](../../docs/ux/voice-and-copy.md) and the spec's A4/A5 tables: no guilt, scores, streaks, rankings or day-apart counters; use names, not pronouns.
7. **Accessibility:** every control has a role and label; touch targets ≥ 48 pt (`touchTarget`); never colour alone; font scaling stays enabled; focus order is logical.
8. **Motion:** Reanimated on the UI thread; durations from `motion` tokens; every animation has a reduced-motion path (`theme.reduceMotion`); never block an action for decoration. Figures: body motion comes from the pure `sampleBody` (a worklet, run on the UI thread), which holds still under reduced motion; talking-frame toggles and animated images stop under reduced motion; pause animation in the background.
9. **Performance:** virtualized lists (`FlatList`/`SectionList`) for timelines and chat, with no nested virtualized lists; `expo-image` for images with sizes and fallbacks; memoize list rows; lazy-load heavy art; no heavy dependency without a stated reason.
10. **Platform:** safe areas on every screen, keyboard-safe forms, Android hardware back closes the top overlay, iOS swipe-back preserved, both light and dark schemes.

## Tests (jest-expo + Testing Library)

- Domain rules: pure unit tests (e.g. `domain/openWhen.test.ts`).
- Each implemented page: a render test per designed state (loading, empty, populated, error, offline), using a `MockStore` with `latencyMs: 0`.
- **Privacy regression** for any surface that can touch sealed or private content: assert the body/draft text is absent from the rendered tree, accessibility labels and any preview.
- Query by role and label (what users and screen readers see), not by test IDs where avoidable.

## Commands (run from the repo root)

```sh
pnpm --filter @garnet/mobile test        # Jest
pnpm --filter @garnet/mobile typecheck   # tsc
pnpm --filter @garnet/mobile start       # Expo dev server
pnpm --filter @garnet/mobile doctor      # expo-doctor
pnpm check                               # everything, must pass before "done"
```

`expo-doctor` currently reports **patch-level mismatches** (expo 57.0.28 vs 57.0.30, plus expo-asset, expo-constants, expo-linking and expo-router). These are intentional: the newer patches are under 7 days old. Re-check after 2026-10-22 and update.
