# Garnet mobile

Expo (SDK 57) + React Native 0.86 + TypeScript (strict) + Expo Router. **Phase 2 prototype: mock data only, no backend.** Rules: [AGENTS.md](./AGENTS.md). Designs and page prompts: [docs/design](../../docs/design/README.md).

## Run it

**Windows, one click:** double-click [`apps/run-mobile.bat`](../run-mobile.bat). It installs dependencies on the first run, then offers: browser preview (default), Expo Go, or an Android phone over USB.

From the repository root:

```sh
pnpm install
pnpm --filter @garnet/mobile start      # then press "a" for Android or scan the QR code
pnpm --filter @garnet/mobile exec expo start --web   # browser preview
```

- **Android:** a development build is the reliable path: `pnpm --filter @garnet/mobile exec expo run:android` needs the Android SDK (installed on this machine) and an emulator or a USB device. No emulator (AVD) has been created yet.
- **Expo Go:** works only if your Expo Go version supports SDK 57. Store builds of Expo Go track the newest SDK, so a development build may be required.
- **iOS:** needs a Mac with Xcode, or EAS cloud builds plus a physical iPhone (U-01 decides the devices).

## What exists today

| Area       | Status                                                                                                                                                                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell  | Expo Router, providers (gesture handler, safe area, TanStack Query, repositories, theme), root error boundary, foundation screen                                                                                                                                                                                                        |
| Theme      | Provisional tokens (Ruby / Sapphire / Garnet, light and dark), WCAG contrast tests, reduced-motion flag                                                                                                                                                                                                                                 |
| Characters | **Owner-supplied images** of Ruby, Sapphire and Garnet (P-45) from the git-ignored `assets/characters/` ([how to generate them](../../docs/design/gemini-character-prompt.md)); neutral gem placeholders until they arrive. 18 moods, 15 occasions, 21 page scenes, talking frames, speech bubbles and fusion. Rights unresolved (U-10) |
| Domain     | Prototype types; Open When visibility rules with privacy tests                                                                                                                                                                                                                                                                          |
| Data       | `MockStore` (latency, failure, offline, reset) and mock repositories for relationship and Open When                                                                                                                                                                                                                                     |
| Pages      | **Figure Studio** is the temporary home page (P-41). Product pages are built from their approved designs (gate B-04)                                                                                                                                                                                                                    |

## Verified

- `pnpm --filter @garnet/mobile test`: all suites pass (tokens, Open When rules, mock repositories, figure data and copy rules, motion properties, image lookup and layout, studio reducer and screen).
- `pnpm --filter @garnet/mobile typecheck` and ESLint (with React Hooks rules): clean.
- `expo export --platform android` produces a Hermes bundle, so Metro resolves the workspace and `@garnet/domain`.
- The web build renders every figure scene and mood in headless Chrome (software WebGL).
- **Not yet verified:** running on a device or emulator, frame rate on phones, and iOS.
