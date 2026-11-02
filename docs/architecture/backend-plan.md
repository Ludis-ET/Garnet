# Backend implementation plan

Status: **proposal (P-76)**, 2026-11-02, after the owner asked to start the backend and connect
the pages; on 2026-11-02 the owner moved sign-in first (B1), then settings (B2). It builds on what is already decided as a **planning baseline**
(D-09: Expo app, NestJS + TypeScript API, PostgreSQL, managed hosting, email/password) and on
the Phase 1 evidence (F-04 sync, F-05 data model and RLS, F-06 time, F-07 media retry). Choices
below that aren't in the baseline are proposals until the owner accepts them. Open questions
(U-xx) stay open and are named where a phase touches them.

Nothing here deploys anything, buys anything or uses a cloud service: phases B0 to B8 run on
this PC, with the phone talking to it over USB. Hosting waits on **U-07**.

## 1. What changes, and what doesn't

- The app keeps its screens, its repository interfaces (`src/data/repositories/types.ts`) and
  its domain rules. Each area gets an **HTTP adapter** beside its mock one; an area switches
  from mock to API when its phase is done. Until then it keeps showing mock data.
- Privacy rules move from "the mock never shows it" to **enforced on the server**: the user and
  relationship come from the session only, every query is relationship-scoped, RLS is the
  second wall, and every endpoint ships with a cross-relationship and partner-private probe
  test (AGENTS.md §6).
- The real notifications and widgets built on the phone (P-73, P-75) stay. The server later
  adds push for things that happen on the other phone (B6).

## 2. Choices

| Area            | Choice                                                                                                                                                                                                                                                           | Why                                                                         | Status                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API framework   | **NestJS 12** (the current major; ESM) on the **Fastify** adapter, TypeScript strict; dependencies always named with `@Inject(...)`                                                                                                                              | D-09; Fastify is lighter and faster than Express with the same Nest code    | D-09 baseline; Fastify: P-76                                                                                                                                |
| Contracts       | **`packages/contracts`**: zod schemas for every request and response, shared by app and API                                                                                                                                                                      | One source of truth; the app's types come from it; validation on both sides | P-76                                                                                                                                                        |
| Database        | **PostgreSQL 17**; schema from `spikes/data-model/schema.sql` as SQL migrations                                                                                                                                                                                  | F-05 proved the schema, RLS, tombstones and purge queue                     | D-09 baseline                                                                                                                                               |
| Data access     | **Kysely** (typed SQL) on `pg`; every request in a transaction that sets `app.user_id` and `app.mutation_id`                                                                                                                                                     | Plain SQL keeps RLS and session settings visible; ORMs hide them            | P-76                                                                                                                                                        |
| Migrations      | Plain `.sql` files run by a small Node runner (ordered, checksummed, in a table)                                                                                                                                                                                 | Reviewable SQL, no ORM lock-in                                              | P-76                                                                                                                                                        |
| Sync            | ADR-0003: client UUIDv7 ids, `mutationId`, `baseVersion`, tombstones, `POST /v1/mutations`, `GET /v1/changes`                                                                                                                                                    | F-04 invariants                                                             | Planning baseline (ADR-0003)                                                                                                                                |
| App local store | **expo-sqlite** for confirmed state and the outbox (B3), replacing the mock file store                                                                                                                                                                           | Survives restarts; offline drafts                                           | ADR-0003 / overview                                                                                                                                         |
| Auth            | Email + password, verification, reset (D-09). Argon2id, opaque 256-bit tokens stored only as hashes, short access tokens with rotating refresh tokens (reuse revokes the family), rate limits without lockout                                                    | ADR-0006                                                                    | Method: baseline. **Policies stay Proposed (ADR-0006)**: built in B1 as required settings with no defaults in code; the owner accepts or changes the values |
| Dev sessions    | **B0 only, local only**: `pnpm --filter @garnet/db dev-session` writes a session for a seeded test person straight into a database on this machine and prints the token. The API never creates sessions this way; the command is removed once sign-in works (B1) | Lets B0 test session-derived identity before sign-in exists                 | P-76                                                                                                                                                        |
| Jobs            | In-process scheduler in the API (`@nestjs/schedule`), idempotent and resumable; a queue only if needed                                                                                                                                                           | Overview §Jobs                                                              | Planning baseline                                                                                                                                           |
| Object storage  | S3-compatible; **SeaweedFS** locally (as F-07), the provider waits on U-07                                                                                                                                                                                       | F-07 evidence                                                               | Local: P-76; provider: **U-07 open**                                                                                                                        |
| Email           | Local **Mailpit** catches every email; the real provider waits on U-07                                                                                                                                                                                           | Nothing is ever sent from development                                       | P-76                                                                                                                                                        |
| Push            | **FCM HTTP v1** for Android, APNs later (U-01); payloads carry an opaque id and generic text only                                                                                                                                                                | AGENTS.md §6; no third-party relay sees anything                            | P-76; iPhone: **U-01 open**                                                                                                                                 |
| Logging         | `pino` with an allow-list (route, status, latency, request id, error code); errors as RFC 9457 problem details                                                                                                                                                   | AGENTS.md §6                                                                | Baseline (B-12)                                                                                                                                             |
| Tests           | Vitest + Fastify `inject` for the API on PGlite (PostgreSQL 17 in-process, the same migrations), so `pnpm check` needs no Docker; each phase also runs once against Postgres in Docker; `fast-check` for time and ordering; mutants in `pnpm mutation`           | AGENTS.md §7                                                                | P-76                                                                                                                                                        |
| Local stack     | **Docker Compose**, one service per phase: Postgres from B0, Mailpit from B1, SeaweedFS from B7. The phone reaches the API through `adb reverse tcp:3000 tcp:3000`                                                                                               | No hosting, no cost; Docker already used for F-07                           | P-76                                                                                                                                                        |
| Hosting         | Not chosen: **U-07** (P-35: UK residency preferred, EU fallback), compared in B-02 before B9                                                                                                                                                                     | —                                                                           | **Open**                                                                                                                                                    |

New dependencies (each checked for licence and maintenance when added, pinned past the 7-day
release age): `@nestjs/*`, `fastify`, `kysely`, `pg`, `zod`, `pino`, `argon2` and `expo-secure-store` (B1),
`expo-sqlite` (B3), a FCM client (B6). Docker images: `postgres:17`, `chrislusf/seaweedfs`,
`axllent/mailpit`.

## 3. Repository layout

```
apps/
  api/                 NestJS (Fastify): modules per area, one transaction per request
  mobile/              the app; src/data/http/ holds the HTTP adapters
packages/
  contracts/           zod schemas + inferred types, used by api and mobile
  db/                  SQL migrations, the runner, seed data, RLS and probe tests
  domain/              unchanged: pure shared rules (shared day, Spark, signals)
infra/
  docker-compose.yml   postgres, seaweedfs, mailpit (local only)
```

## 4. How a page moves from mock to real

1. The area's contract goes into `packages/contracts` (e.g. `Settings`, `UpdateSettings`).
2. The API module implements it, with RLS policies, a migration and tests: happy path,
   validation, **cross-relationship probe**, **partner-private probe**.
3. `apps/mobile/src/data/http/<area>.ts` implements the same repository interface over HTTP.
4. `createRepositories()` picks mock or HTTP **per area** from one switch
   (`EXPO_PUBLIC_API_AREAS=settings,profile,…`), so areas move one at a time and can move back.
5. The screen doesn't change. Its tests run against both adapters where it matters.

## 5. Phases

Each phase ends with `pnpm check` green, its probe tests passing, the APK installed on the phone,
and the connected pages working against the local API.

### B0 · Foundations (backlog B-12, B-13, B-23) · **done 2026-11-02**

- `apps/api`: NestJS 12 on Fastify; config checked at start-up; `GET /v1/health` (public) and
  `GET /v1/me` (the first session-scoped, RLS-checked read); RFC 9457 problems for every error,
  with stable codes and no internal detail; our own request ids (`x-request-id`); `no-store` and
  `nosniff` on every response; one allow-listed log line per request, with Fastify's own logging
  reduced to the same allow-list; a session guard that denies by default.
- `packages/db`: migration `0001` (the F-05 schema, plus `auth_session()` and pinned
  `search_path`s), a checksummed, locked, append-only runner, seeds, `dev-session`, test helpers.
- `packages/contracts`: problem, health and me schemas, shared by the API and the app.
- The probe harness (B-23): a route that is neither public nor probed fails the tests; every
  private route is checked against every kind of bad session.
- App: `src/data/http` (client with timeouts and contract checks, the per-area switch); Settings ›
  About shows the connection only in builds pointed at an API.
- `infra/`: Postgres 17.6 in Docker on 127.0.0.1, the API's own non-owner role, hardening.
- **Verified:** 5 contract, 13 database, 21 API and 6 client tests; 7 mutants killed (DB-1 to
  DB-3, API-1 to API-4); live on Docker: migrate and seed twice each, health, `/v1/me`, 401 and 404
  problems, the log lines, and the API role refused sessions, accounts, migration history and
  temporary tables. **Not yet on the phone** (B1 brings the first connected pages: sign-in).

### B1 · Accounts, sessions, pairing, setup (B-20, B-21, B-22): first pages connected

Auth comes first (owner direction 2026-11-02): every later phase then runs on real accounts and
real sessions, and nothing is built on test sessions that would need redoing.

- **API:** `POST /v1/auth/{signup, verify, login, refresh, logout}`,
  `POST /v1/auth/password-reset/{request, confirm}`, `GET /v1/sessions`,
  `DELETE /v1/sessions/{id}`; invitations `POST /v1/invitations`, `DELETE /v1/invitations/{id}`,
  `POST /v1/invitations/accept`; setup answers (name, side, time zone, picture choice,
  notification choice) through `PATCH /v1/me/profile`, which B2 extends.
- **Security (ADR-0006, Proposed):** Argon2id; 256-bit opaque tokens, only their hashes stored;
  short-lived access and rotating refresh tokens, where reusing a rotated one revokes the whole
  session family; reset and password change revoke the other sessions; one neutral answer
  whether an email exists or not; rate limits per IP and per account with back-off, never a
  permanent lockout; invitations single-use, 24 hours at most, hashed, one generic error. The
  values (password length, Argon2id cost, token lifetimes, rate limits) are **required settings
  with no defaults in code**: the local example config carries the ADR's proposed values,
  labelled as proposals, until the owner accepts or changes them.
- **Email:** verification, reset and invitation emails go to **Mailpit** locally (its inbox opens
  in a browser on this PC); nothing is ever sent outside. The real provider waits on U-07.
- **App:** session tokens in **expo-secure-store** (Android Keystore, iOS Keychain), never in
  files or AsyncStorage; a quiet refresh on 401; sign-out removes the tokens. The auth, pairing
  and setup screens switch to the API (`EXPO_PUBLIC_API_AREAS=auth,pairing,setup`) without
  changing how they look.
- **Retires:** the `dev-session` command; the local seed gives Selam and Noah local-only
  passwords.
- **Tests:** probes for every endpoint, plus enumeration safety (the same answer for a known and
  an unknown email), refresh reuse revoking the family, revoked sessions refused everywhere, rate
  limits, and invitation expiry and single use.
- **Pages:** AUTH-01 to AUTH-08, PAIR-01 to PAIR-07, SETUP-01 to SETUP-08, Settings › Devices
  and password.
- **Owner decisions:** ADR-0006's policy values (above); **U-27** (device identity, linking
  sessions to devices for later push, revocation), **U-32** (pairing again after ending),
  **U-33** (invitation delivery and lifecycle). Until decided they are required options or stay
  conservative (no re-pairing, single-use invitations), never silent defaults.

### B2 · Settings (SET-01 to SET-16)

- **API:** `GET/PATCH /v1/me/settings` (one versioned settings document per person, validated by
  the shared schema; only the person's own row, by session and RLS), `GET/PATCH /v1/me/profile`
  (display name, nickname, picture choice, side, time zone), `GET/PATCH /v1/relationship`
  (nicknames, shared settings).
- **Data:** `user_settings` replaces the draft `user_preference` (the app's settings have
  grown: preview modes generic/sender/full, per-group modes, home layout, motion, location
  sharing). Quiet hours keep **no default window (U-21)**.
- **Pages:** Settings root and search, Notifications, Quiet hours, Lock-screen previews,
  Reminders, Home layout, Chat settings, Location, Motion and haptics, Appearance, Nicknames,
  Time, Privacy, About.
- **Guardrails tested:** a person can never read or change the partner's settings; previews
  default to generic; the server never stores the location, only what the distance needs (P-66).
- **Open items touched:** U-21 (quiet window), U-13 (cutoff changes: read-only until U-02/U-13).

### B3 · Sync core and Days (B-30 to B-33)

- `expo-sqlite` store and outbox; `POST /v1/mutations`, `GET /v1/changes`; F-04 invariants as
  tests. Day Log: compose, autosave, share, edit, delete, conflict copies (text first).
- **Pages:** Days list, calendar, day, moment detail, Log a moment, Home "today".
- **Open:** U-11, U-14, U-18, U-28 (multi-device), U-15 (retention).

### B4 · Signals and Us (B-51)

- Signals and responses, the pinned support card, history; no read or seen state anywhere.
- **Pages:** Us, signal sheets, history, Home's incoming pop-ups.
- **Open:** U-09 (retention, wording), U-30 (late delivery).

### B5 · Chat

- Messages, replies, edits, delete for me / for everyone, reactions, pins, typing (ephemeral,
  never stored). **Open:** U-35 (read receipts: off until decided).
- **Pages:** Chat, conversation details, message menu, search in chat.

### B6 · Push and server notifications (B-50)

- Push device registration per session, FCM, generic payloads, quiet hours and per-group modes
  applied on the server; the phone's local notifications (P-75) handle reminders.
- **Open:** U-27, U-28.

### B7 · Media (B-41 to B-43)

- Presigned upload and commit, EXIF strip, thumbnails, purge worker, orphan sweep (F-07 basis);
  photos, videos and voice in moments, chat and surprises. **Open:** U-08 (limits).

### B8 · Moments: letters, surprises, events, memories, Our World (B-90 and new)

- Open When (body only to the recipient on open; U-34, U-31), surprises, events and reminders,
  memories and chapters, plans, places, songs.
- **Pages:** Moments, Open When, Surprises, Events, Our World and its doors.

### B9 · Data rights, hardening, hosting (B-100, B-101, B-120, B-14), needs the owner's go

- Export, delete account, end the space (**U-20** blocks the last two), security review, restore
  drill; then **U-07** hosting in the UK (P-35), staging, and the private beta (B-123).

Spark, recap and the shared-day jobs (B-60 to B-71) wait on U-02 to U-06 and U-12; they slot in
after B3 when those are decided.

## 6. Order of work for B1

1. The owner reviews ADR-0006's policy values; until then they are required settings (above).
2. Migration `0002`: refresh-token families, verification and reset tokens, rate-limit buckets,
   invitation changes, profile columns; RLS and probes for each.
3. `packages/contracts`: auth, sessions, invitation and setup schemas.
4. API modules: auth, sessions, invitations, setup; Mailpit in `infra/`.
5. App: `expo-secure-store`, the token store and refresh, and HTTP adapters for auth, pairing
   and setup behind `EXPO_PUBLIC_API_AREAS`.
6. Phone: `adb reverse tcp:3000 tcp:3000`, rebuild the APK pointed at the PC, sign up, verify
   (Mailpit), pair Selam and Noah, finish setup; then `pnpm check`.

## 7. Decisions the owner is asked for

- Accept or change **P-76** (this plan's choices).
- Before or during B1: ADR-0006's policy values; U-27, U-32, U-33.
- Before B9: **U-07** hosting (provider, UK region, backups, cost) and **U-20**.
- Throughout: the open items named in each phase stay open until decided; code models them as
  required options, never silent defaults.
