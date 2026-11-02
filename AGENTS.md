# AGENTS.md — rules for AI coding agents working on Garnet

This file is the single source of agent instructions for this repository. Tool-specific files (`CLAUDE.md`, etc.) import it rather than repeating it. Subdirectories may add their own `AGENTS.md` with stricter local rules; the nearest file wins on conflicts.

## 1. What this project is

Garnet is a private mobile app for **exactly two partners** in a long-distance relationship, one in Ethiopia (`Africa/Addis_Ababa`) and one in the UK (`Europe/London`). Promise: _"I can't be there with you right now, but I can still be part of your day."_

**Current status: Phase 2 — complete mobile design and mock prototype (started 2026-10-19, owner direction P-39).** Every screen and state is built in `apps/mobile` on **local mock data only**: no backend, API, real auth, push, email, cloud media or sync. Pages are implemented one at a time **only after the owner's design for that page exists** (gate B-04). Phase 1 is closed; its known limitations are on the [status board](docs/README.md#phase-1-status-board). No decision has been Accepted. Mobile rules: [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md).

## 2. Commands — run before claiming anything works

```sh
pnpm install          # Node ≥ 24, pnpm 10 (corepack); lockfile is authoritative
pnpm check            # format:check + lint + typecheck + all tests — must pass
pnpm test             # all test suites
pnpm --filter @garnet/domain test            # one package
pnpm format           # fix formatting
pnpm spike:media      # F-07 media-retry spike (needs Docker; not part of pnpm check)
pnpm mutation         # reproducible mutation checks (add --with-docker for F-07)
```

Never report a task as done if `pnpm check` fails. Report failures with their output.

## 3. Repository map

| Path                                        | What it is                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/`                                     | Source of truth for scope, decisions, specs and architecture. Start at [docs/README.md](docs/README.md).                                         |
| `docs/phase-1-scope-and-decision-record.md` | The scope record (Markdown copy of the `.docx`). `§n` references point here.                                                                     |
| `docs/decisions/decision-log.md`            | **Every** decision (D-), Phase 1 proposal (P-) and unresolved question (U-).                                                                     |
| `apps/mobile/`                              | The Expo app (Phase 2 prototype). Has its own [AGENTS.md](apps/mobile/AGENTS.md).                                                                |
| `docs/design/`                              | Phase 2 specs (Markdown transcriptions of the owner's two `.docx` files) and the page design prompts with page IDs.                              |
| `packages/domain/`                          | `@garnet/domain`: pure, platform-neutral business rules (shared day, Shared Spark, signals). Has its own [AGENTS.md](packages/domain/AGENTS.md). |
| `apps/api/`                                 | `@garnet/api`: NestJS 12 on Fastify, Kysely on PostgreSQL with RLS ([backend plan](docs/architecture/backend-plan.md), P-76). Local only.        |
| `packages/db/`                              | `@garnet/db`: SQL migrations, the runner, local seeds and `dev-session`, PGlite test helpers.                                                    |
| `packages/contracts/`                       | `@garnet/contracts`: zod request/response schemas shared by the API and the app.                                                                 |
| `infra/`                                    | Local backend: Postgres in Docker on 127.0.0.1 ([infra/README.md](infra/README.md)). Never deployed.                                             |
| `spikes/offline-sync/`                      | F-04 evidence: sync protocol simulation with fault injection and property tests.                                                                 |
| `spikes/data-model/`                        | F-05 evidence: draft PostgreSQL schema + RLS, tested on PGlite.                                                                                  |
| `spikes/media-retry/`                       | F-07 evidence: server-side media upload/retry against local SeaweedFS in Docker (`pnpm spike:media`).                                            |
| `scripts/mutation-check.mjs`                | Reproducible mutation checks for the evidence suites (`pnpm mutation`).                                                                          |

## 4. Decision discipline (most important rule)

The scope record requires: _"Unresolved items must remain explicitly labeled; recommendations are not silently treated as approved decisions."_

1. **Look up the decision ID before implementing any product rule.** If the rule depends on an item marked **Unresolved** (U-xx), do not choose for the owner:
   - model it as a **required parameter with no default** (see `SparkPolicy` in `packages/domain/src/spark/spark.ts`);
   - export candidate options as named constants;
   - write tests for each option;
   - say in your response that the item is unresolved.
2. **Recommended ≠ approved.** A "Recommended" item (e.g. D-18 / U-03) is never a silent default.
3. **New choices get recorded.** If you must make a product or architecture choice not covered by the log, add a `P-xx` row (proposal + rationale) to `docs/decisions/decision-log.md` and tell the user. Significant architectural choices also get an ADR from `docs/decisions/adr/template.md`.
4. **Cite IDs** in code comments and docs where a rule comes from (`// D-15`, `(U-02)`), so `grep` finds every dependency when a decision changes.
5. Never change a decision's status yourself. Only the owner moves items to **Accepted** or **Planning baseline**.
6. **Planning baseline ≠ Accepted ≠ verified.** Planning-baseline items (D-09 stack and authentication method, D-12, D-13, ADR-0001 to ADR-0005, and their P-items) are the working direction for planning. They do not accept the specific product or security policies inside them, and do not mean anything has been tested. ADR-0006's security policies are not in the baseline (only the email/password + verification + reset method is, via D-09).
7. **Owner directions** (P-30 to P-37) and evidence-backed proposals (P-38) are documented intent, not Accepted decisions. Don't contradict them; keep the questions they leave open unresolved.

## 5. Product guardrails (non-negotiable)

These come from §2, §5, §7 and §11. Violating one is a bug even if a task asks for it; flag the conflict instead.

- **Private drafts stay private.** A draft, its edits, its existence and its deletion must never reach the partner: not via API, the change feed, Spark, counts, the widget, notifications, exports or logs.
- **Sharing is always explicit.** Nothing (including the widget) shares content without the author's review (§6).
- **No metrics on the relationship:** no health scores, rankings, per-partner comparisons, response-time stats, read receipts, "seen" claims, or escalation for non-response.
- **No blame.** Shared Spark never records or reveals which partner missed a day (P-09). No guilt prompts; no sad, angry or abandoned character reactions.
- **Generic by default.** Lock-screen previews are generic and identical across urgency levels; the widget is always privacy-neutral.
- **Each person controls only their own** notifications, previews, quiet hours and Spark visibility.
- **No ads, no data sale, no analytics on content.** Do not add any analytics, advertising or tracking SDK.
- **Forgiving UX.** Never silently lose typed text: autosave, offline drafts, conflict copies.
- **Accessibility is required:** labels, WCAG 2.2 AA contrast, no colour-only status, reduced motion.

## 6. Engineering rules

### TypeScript

- Strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any`; no non-null `!` outside tests; no `@ts-ignore` (use `@ts-expect-error` with a reason, if ever).
- Type-only imports use `import type`. Exhaustive `switch` on unions.
- `console` is banned in shared code (privacy). Use an injected, redacting logger.

### Time (ADR-0002)

- Store instants in UTC; display in the viewer's zone. Zones are **IANA names**; never fixed offsets.
- Use the **Temporal API** (`temporal-polyfill`). No `Date` arithmetic, `getTimezoneOffset`, or "+3 hours" math in domain code.
- Shared-day assignment is **server-authoritative** (`sharedDayOf`). Clients may only preview.
- Days can be 23 or 25 hours long. Never assume 24.
- Any change to time logic needs DST tests for London (both transitions) and Addis Ababa display.

### Sync and data (ADR-0003)

- Entity ids are client-generated **UUIDv7**. Every write has a unique `mutationId` (idempotency key) and, for author edits, a `baseVersion`.
- Deletion writes a **tombstone**; deleted ids are never reused or resurrected; mutations on them answer `gone`.
- Conflicts create a **private conflict copy**; never last-writer-wins, never auto-share.
- Changes to the sync protocol must keep the F-04 invariants green (`spikes/offline-sync/src/model.ts`).

### Authorization (ADR-0004)

- Derive the user and relationship from the session, **never** from request input.
- Every query is relationship-scoped. "Not yours" and "not found" are indistinguishable.
- Keep RLS as defence in depth; never connect the app with a role that bypasses RLS.
- Every new endpoint ships with a cross-relationship and partner-private probe test.

### Logging, payloads and secrets

- Logs: allow-listed fields only (route, status, latency, request id, error code). Never bodies, entry text, signal types, file names, emails or tokens.
- Push payloads carry no content: an opaque id and generic text only.
- Never commit secrets, `.env` files, keystores or push credentials (see `.gitignore`).

### Dependencies

- Add dependencies sparingly; prefer the platform and existing packages. Shared tool versions live in the `catalog:` of `pnpm-workspace.yaml`.
- `minimumReleaseAge` (7 days) and blocked install scripts are deliberate. Don't disable them; allow-list a build script only with a stated reason.
- Check maintenance status and licence before adding anything.

## 7. Testing expectations

- Business rules: example tests **and** property-based tests (`fast-check`) for anything with time, ordering or concurrency.
- When a test passes first time on a tricky rule, prove it can fail (break the code, watch the test fail, restore). `pnpm mutation` (add `--with-docker` for F-07) does this reproducibly for the Phase 1 suites. When you add a guard, add a mutant to `scripts/mutation-check.mjs`.
- Tests that depend on an unresolved decision name the option they assume.
- Property generators must produce meaningful scenarios. Check the size distribution: fast-check's default size keeps arrays short.

## 8. Copy and character rules

- Follow [docs/ux/voice-and-copy.md](docs/ux/voice-and-copy.md). Banned in Spark, widget and notification copy: _broken, lost, failed (about people), missed (accusatory), ignored, seen, read, last chance, don't let … down_.
- **Characters (P-30, P-31, U-10, U-26):** the intended experience uses the **actual _Steven Universe_ characters Ruby, Sapphire and Garnet** (owner direction). Do not replace them with original characters, and do not treat private-only distribution as the product. Rights and distribution authorization are **unresolved**; never claim otherwise, and keep public distribution blocked.
  **Safeguards stay in force:** do **not** download or trace character art, icons, audio or text, and do not use official artwork or quote the show. **Character images are owner-supplied (P-44, P-45):** the app shows Ruby, Sapphire and Garnet only from images the owner generates and places in the git-ignored `apps/mobile/assets/characters/` (prompt: `docs/design/gemini-character-prompt.md`). Agents may process those files (cut out backgrounds, crop, rename) but do not draw, generate, download or trace character art themselves. The Garnet mark and app icons (P-55) are crops of the owner's image made by `apps/mobile/scripts/make-garnet-brand.py` into the git-ignored `assets/characters/brand/`. Character assets stay out of the repo (`assets/characters/` is git-ignored). Asset sourcing is open (U-26). Performance tests may use proxy assets only if the results are labelled as proxy (P-31).
- **Working icon:** U-25 is still listed as open; owner direction **P-55** makes Garnet's face (from the owner's image) the logo and app icon. Do not commit the generated icon files.

## 9. Working style

- Read the relevant spec in `docs/features/` and the decision log **before** writing code.
- Keep changes small and focused; match the surrounding style and comment density.
- Update docs in the same change when behaviour changes.
- Do not commit, push or open PRs unless asked. Use the PR template checklist when you do.
- Platform notes: development happens on Windows (PowerShell + Git Bash). Keep scripts cross-platform (Node scripts over shell where it matters). iOS builds need EAS cloud builds or a Mac.

## 10. Definition of done

- [ ] `pnpm check` passes
- [ ] Decision IDs cited; no unresolved item silently decided; new choices logged as P-xx
- [ ] Privacy guardrails (§5 above) hold, with a test where the change touches data flow
- [ ] Docs updated
- [ ] Response to the user states what was verified, what was not, and any open decisions touched
