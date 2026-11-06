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

| Area            | Choice                                                                                                                                                                                                                                                               | Why                                                                         | Status                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API framework   | **NestJS 12** (the current major; ESM) on the **Fastify** adapter, TypeScript strict; dependencies always named with `@Inject(...)`                                                                                                                                  | D-09; Fastify is lighter and faster than Express with the same Nest code    | D-09 baseline; Fastify: P-76                                                                                                                                                     |
| Contracts       | **`packages/contracts`**: zod schemas for every request and response, shared by app and API                                                                                                                                                                          | One source of truth; the app's types come from it; validation on both sides | P-76                                                                                                                                                                             |
| Database        | **PostgreSQL 17**; schema from `spikes/data-model/schema.sql` as SQL migrations                                                                                                                                                                                      | F-05 proved the schema, RLS, tombstones and purge queue                     | D-09 baseline                                                                                                                                                                    |
| Data access     | **Kysely** (typed SQL) on `pg`; every request in a transaction that sets `app.user_id` and `app.mutation_id`                                                                                                                                                         | Plain SQL keeps RLS and session settings visible; ORMs hide them            | P-76                                                                                                                                                                             |
| Migrations      | Plain `.sql` files run by a small Node runner (ordered, checksummed, in a table)                                                                                                                                                                                     | Reviewable SQL, no ORM lock-in                                              | P-76                                                                                                                                                                             |
| Sync            | ADR-0003: client UUIDv7 ids, `mutationId`, `baseVersion`, tombstones, `POST /v1/mutations`, `GET /v1/changes`                                                                                                                                                        | F-04 invariants                                                             | Planning baseline (ADR-0003)                                                                                                                                                     |
| App local store | **expo-sqlite** for confirmed state and the outbox (B3), replacing the mock file store                                                                                                                                                                               | Survives restarts; offline drafts                                           | ADR-0003 / overview                                                                                                                                                              |
| Auth            | **Better Auth** (owner direction P-77): email + password, verification, reset, sessions and rate limits under `/v1/auth`; the Expo client keeps the session in the secure keystore                                                                                   | Owner direction; D-09's method                                              | P-77. ADR-0006's policy **values** stay required settings with no defaults; where Better Auth differs from ADR-0006 (token storage, scrypt, sliding sessions) the owner confirms |
| Dev sessions    | **B0 only, local only**: `pnpm --filter @garnet/db dev-session` writes a session for a seeded test person straight into a database on this machine and prints the token. The API never creates sessions this way; removed in B1, where tests sign in through the API | Lets B0 test session-derived identity before sign-in exists                 | P-76                                                                                                                                                                             |
| Jobs            | In-process scheduler in the API (`@nestjs/schedule`), idempotent and resumable; a queue only if needed                                                                                                                                                               | Overview §Jobs                                                              | Planning baseline                                                                                                                                                                |
| Object storage  | S3-compatible; **SeaweedFS** locally (as F-07), the provider waits on U-07                                                                                                                                                                                           | F-07 evidence                                                               | Local: P-76; provider: **U-07 open**                                                                                                                                             |
| Email           | Local **Mailpit** catches every email; the real provider waits on U-07                                                                                                                                                                                               | Nothing is ever sent from development                                       | P-76                                                                                                                                                                             |
| Push            | **FCM HTTP v1** for Android, APNs later (U-01); payloads carry an opaque id and generic text only                                                                                                                                                                    | AGENTS.md §6; no third-party relay sees anything                            | P-76; iPhone: **U-01 open**                                                                                                                                                      |
| Logging         | `pino` with an allow-list (route, status, latency, request id, error code); errors as RFC 9457 problem details                                                                                                                                                       | AGENTS.md §6                                                                | Baseline (B-12)                                                                                                                                                                  |
| Tests           | Vitest + Fastify `inject` for the API on PGlite (PostgreSQL 17 in-process, the same migrations), so `pnpm check` needs no Docker; each phase also runs once against Postgres in Docker; `fast-check` for time and ordering; mutants in `pnpm mutation`               | AGENTS.md §7                                                                | P-76                                                                                                                                                                             |
| Local stack     | **Docker Compose**, one service per phase: Postgres from B0, Mailpit from B1, SeaweedFS from B7. The phone reaches the API through `adb reverse tcp:3000 tcp:3000`                                                                                                   | No hosting, no cost; Docker already used for F-07                           | P-76                                                                                                                                                                             |
| Hosting         | Not chosen: **U-07** (P-35: UK residency preferred, EU fallback), compared in B-02 before B9                                                                                                                                                                         | —                                                                           | **Open**                                                                                                                                                                         |

New dependencies (each checked for licence and maintenance when added, pinned past the 7-day
release age): `@nestjs/*`, `fastify`, `kysely`, `pg`, `zod`, `pino` and `expo-secure-store` (B1; Argon2id comes from Node's own crypto, P-78),
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

### B1 · Accounts, sessions, pairing, setup (B-20, B-21, B-22): first pages connected · **built 2026-11-02, tested 2026-11-04**

Built with Better Auth (P-77): migration `0002`, `apps/api/src/auth` (Better Auth, the Fastify bridge, mail), `setup` and `pairing` controllers, the local seed (`pnpm --filter @garnet/api seed`), Mailpit in `infra/`; in the app, `src/data/http` (Better Auth's Expo client, HTTP adapters for auth, pairing and setup) and the verify screen reading its email link. Checked: migration applied to local Postgres, the API boots, `/v1/auth` answers, protected routes refuse without a session; typecheck and lint clean. **Tested (2026-11-04):** ADR-0006 met as recorded in P-78 (Argon2id, 15-character minimum with a shared blocklist, signed cookies, sessions ending 90 days after sign-in, per-account back-off, the auth route allow-list) and migration `0003`. API 92 tests on PGlite (`auth`, `pairing`, `probes` for every route, `password`, `throttle`, `config`, foundation), database 22, contracts 27, app 450; mutants: API-1 to API-18, DB-1 to DB-9, PW-1 to PW-4 and AUTH-PW-1 all behave as expected; the live walk against Postgres and Mailpit in Docker passed 44/44. **Not done yet:** a run on the phone, and the Settings › Devices and password page, which moves with B2.

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

### B1.5 · Google and Apple sign-in, registration details · **built 2026-11-05 (P-79)**

Owner direction P-79: Google, Apple and email + password are three ways into **one** account.

- **Ways in:** "Continue with Google" and "Continue with Apple" on Welcome and Sign in, in each
  brand's own colours and the app's pill shape, shown only when the server is configured for
  them (`GET /v1/sign-in-methods`). Google, and Apple off iPhone, run in the phone's browser and
  come back through the PKCE-bound hand-off (`apps/api/src/auth/handoff.ts`); on iPhone, Apple's
  own sheet sends an ID token with a hashed nonce.
- **One account per person:** a provider that vouches for the email joins the account that
  has it; an unconfirmed account loses anything someone else set up before a verified provider
  joins it; Apple's private-relay addresses stay separate until connected in Settings (B2).
- **Registration (AUTH-09):** a birthday, 16 and over, and the current terms with the server's
  time, given with an email sign-up or right after a first Google or Apple sign-in; until then
  only registration and `/v1/me` answer. Under 16, a new account is removed with everything it
  had. A new `TERMS_VERSION` asks everyone again. Terms and Privacy pages (AUTH-10) are drafts
  (U-36).
- **Setup:** an optional home town in "Where's home?" and an optional shared "Together since"
  step. The partner sees the full birthday and the home town (P-79).
- **Verified:** API 139 tests (social, registration, probes for every route), database 26,
  contracts 49, app 462; mutants listed in `pnpm mutation`. **Not verified:** a real Google or
  Apple sign-in (needs the owner's Google OAuth client, and for Apple the paid developer account
  and an https domain, U-07); Apple on iPhone needs an iOS build (U-01).

### B2 · Settings (SET-01 to SET-17) · **built 2026-11-05 (P-80)**

- **Settings:** `GET/PATCH /v1/me/settings`: one versioned document per person (`user_settings`,
  migration 0005), validated by the shared schema, only the person's own row (session and RLS).
  A patch names what changed and merges under a row lock. It carries notifications, quiet hours,
  previews, reminders, nicknames and greeting, Home layout, motion, haptics and location sharing.
  Quiet hours keep **no default window (U-21)**; previews default to generic.
- **Devices (SET-12):** `GET /v1/me/devices`, `DELETE /v1/me/devices/:id`,
  `POST /v1/me/devices/sign-out-others`: real sessions, never a token. Open: U-27.
- **Password:** the real change (P-78 rules), ending other sessions. Set a password by email
  for an account made with Google or Apple.
- **Sign-in methods (P-80):** `GET /v1/me/sign-in-methods`, `DELETE
/v1/me/sign-in-methods/:provider` and Better Auth's `link-social` through the hand-off. Connect
  and disconnect Google and Apple; never the last way in; needs a recent sign-in.
- **Account details:** change the email (`change-email`: the current address confirms, then the
  new one), change the birthday (`PATCH /v1/me/account`, still 16 and over), see the accepted terms.
- **Not separate routes:** profile fields stay on `/v1/me/setup`; the partner's nickname is a
  per-person setting; "together since" has its own route (see P-80).
- **The mirror:** with the API on, answers are copied into the mock store, so areas still on
  sample data work and use the real person (`mirror.ts`, a fix to B1).
- **Waiting (B9):** export, ending the space and deleting the account (U-20, U-23); with the API on,
  those pages say they aren't available yet. Location itself stays on the phone until B4.
- **Guardrails tested:** a person can never read or change the partner's settings; previews
  default to generic; nothing saved reaches a log line.
- **Verified:** live on Postgres and Mailpit, including twelve simultaneous saves (removing the
  lock lost five of six, so the check can fail). **Not verified:** a real Google or Apple connect,
  and the pages on a phone.

### B3 · Sync core and Days (B-30 to B-33)

- `expo-sqlite` store and outbox; `POST /v1/mutations`, `GET /v1/changes`; F-04 invariants as
  tests. Day Log: compose, autosave, share, edit, delete, conflict copies (text first).
- **Pages:** Days list, calendar, day, moment detail, Log a moment, Home "today".
- **Open:** U-11, U-14, U-18, U-28 (multi-device), U-15 (retention).

### B4 · Signals and Us (B-51)

- Signals and responses, the pinned support card, history; no read or seen state anywhere.
- **Pages:** Us, signal sheets, history, Home's incoming pop-ups.
- **Open:** U-09 (retention, wording), U-30 (late delivery).

### B5 · Chat · **done 2026-11-06 (P-83)**

- Messages, replies, edits (15m window, A13), delete for me / for everyone (P-63), reactions, pins,
  saved memories, typing (ephemeral heartbeats, P-62), mutual opt-in presence and read receipts (P-58, P-61, U-35).
- **Pages:** Chat, conversation details, message menu, search in chat.
- **Transport & Storage:** Migration `0008_chat.sql`, RLS policies, `ChatService`, `ChatEventsService`,
  17 REST endpoints, probe tests, `HttpChat` adapter in `apps/mobile/src/data/http/httpChat.ts`.

### B6 · Push and server notifications (B-50) · **done 2026-11-06 (P-84)**

- Push device registration per session, FCM, generic payloads, quiet hours and per-group modes
  applied on the server; the phone's local notifications (P-75) handle reminders.
- **Transport & Storage:** Migration `0009_notifications.sql`, RLS policies, `NotificationsService`,
  `InMemoryPushSender`, 6 REST endpoints, probe tests, `HttpNotifications` adapter in
  `apps/mobile/src/data/http/httpNotifications.ts`. Session-linked cascade revocation (`U-27`).

### B7 · Media (B-41 to B-43) · **done 2026-11-06 (P-85)**

- Presigned upload and commit, pure-TypeScript EXIF strip (P-21), purge worker, orphan sweep,
  storage reconciliation (F-07 basis, P-38); photos, videos and voice in moments, chat and surprises.
- **Transport & Storage:** Migration `0010_media.sql`, RLS policies, `MediaService`, `MediaPurgeService`,
  `ObjectStorage` abstraction (`InMemoryObjectStorage` + `S3ObjectStorage`), 5 REST endpoints, probe tests,
  `HttpMedia` adapter in `apps/mobile/src/data/http/httpMedia.ts`.
- **Policy:** Explicit `MediaLimitsPolicy` without silent default (U-08). Local SeaweedFS on 18333 (P-76). Phone background upload is B-43.

### B8 · Moments: letters, surprises, events, memories, Our World (B-90, B-91, B-92) · **done 2026-11-06 (P-86)**

- **Open When Letters (B-90, U-31, U-34, P-22):** Resolves the known Phase 1 database gap (`F-05`, `B-90`) via two-table content isolation (`open_when_letter_content`) with Row-Level Security. Neither partner can read the sealed body until `status = 'opened'`. Sealed contracts strictly omit `body`. Shared anonymous deletion leaves tombstones without actor metrics (§5).
- **Surprises (P-68, P-71):** Content isolated in `surprise_content` under RLS until `state = 'opened'`. Scheduled view hides secret content while exposing safe title and reveal triggers. Author can retitle or cancel before opening.
- **Events & Chapters (ADR-0002, EVT-07):** DST-safe recurrence calculations (`nextDate`, `@garnet/domain`) for London and Addis Ababa. Simultaneous dual-timezone previews (`"19:00 London · 22:00 Addis"`). Monthly chapter reflections and couple-named chapter titles.
- **Memories & Collections (U-16, §23):** Joint memory archive with explicit saving only from Days and Chat. Custom collections (`memory_collection`, `memory_collection_item`).
- **Our World Shared Lists (P-21, P-72):** Bucket-list plans with "Mark as done together", visited places (explicit check-in, no background geolocation), and soundtrack links (external link only, no audio).
- **Mobile Adapters & Probes:** Adapters in `apps/mobile/src/data/http/` (`httpOpenWhen.ts`, `httpSurprises.ts`, `httpEvents.ts`, `httpMemories.ts`, `httpTogether.ts`). Full probe tests for all 40 routes in `apps/api/test/probes.test.ts` and integration suite `test/moments.test.ts`.

### B9 · Data rights, hardening, hosting (B-100, B-101, B-120, B-14) · **done 2026-11-06 (P-87)**

- **Self-Service Data Portability (B-100, SET-13, GDPR Art. 20):** Export query executes strictly under row-level security (`asViewer`), structurally omitting partner's private drafts and unopened sealed letters (§5, §11). Downloadable JSON bundle with profile, settings, days entries, chat, opened letters, surprises, memories, together items, events. Expiring download link valid for 7 days (`SET-13`).
- **Re-Authentication Gate (P-80, ADR-0006):** In-app re-auth (`POST /v1/me/reauth`) with Argon2id credential verification and session freshness refresh.
- **Space Ending & Account Deletion (SET-14, SET-15, B-101, Apple App Review 5.1.1(v), P-37):** Stepped flow confirmation requiring typed "END" or "DELETE". Unpairs relationship (`left_at = now()`, `ended_at = now()`), immediately revokes sessions across all devices (`U-27`), purges push tokens, and removes data per owner direction P-37 without cascade failure. Open decisions U-20 and U-23 modeled with explicit typed parameters in `@garnet/domain`.
- **Disaster Recovery Restore Drill (B-14):** Automated script `scripts/drill-restore.mjs` verifying complete database cluster backup dump, restore into a fresh recovery cluster, 100% row match parity across all tables, and RLS privacy invariant preservation.
- **Mobile Adapters & Probes:** `HttpSettings` adapter updated with `prepareExport`, `expireExport`, `endSpace`, and `deleteAccount`, enabling `dataRights: true`. Probes for all 6 routes verified in `apps/api/test/probes.test.ts` and integration suite `test/data-rights.test.ts`.

Hosting in the UK (P-35 / U-07), staging, and the private beta (B-123) follow as infrastructure setup.

Spark, recap and the shared-day jobs (B-60 to B-71) wait on U-02 to U-06 and U-12; they slot in
after B3 when those are decided.

## 5a. Accounts and registration: what is still to do

Researched for P-79; each item names what it waits on.

1. **Account deletion in the app** (Apple App Review 5.1.1(v) requires it once accounts can
   be created; for Sign in with Apple, the server also revokes Apple's tokens). Waits on U-20,
   U-23 and P-37 (what happens to shared memories).
2. **Sessions and devices**: seeing and signing out devices is done (B2); device identity, push
   linkage and what a signed-out device keeps wait on U-27.
3. **Re-authentication page**: a recent sign-in is required for sensitive changes (P-80); today
   the app asks the person to sign out and back in. A password or provider prompt in place would
   be kinder.
4. **Apple token revocation** when Apple is disconnected or the account is deleted.
5. **Legal texts**: final Terms of use and Privacy notice, who provides Garnet, governing law,
   contact (U-36); a privacy-policy URL is also needed for Google's OAuth consent screen and for
   the stores.
6. **Google production setup**: OAuth consent screen with the app's name, logo, privacy URL and
   authorised domain, and Google's brand verification before release.
7. **Apple setup**: Apple Developer Program, a Services ID with an https return URL on Garnet's
   domain, a key for the client secret (`apps/api/scripts/apple-client-secret.mjs`, renewed at
   most every six months), and the Sign in with Apple capability on the iOS app (U-01, U-07).
8. **Verified links**: Android App Links and iOS Universal Links on an https domain, so email and
   sign-in links can't be claimed by another app (the hand-off already makes a caught sign-in link
   useless; email links still use `garnet://`). Waits on U-07.
9. **Shared rate-limit store** for the per-account back-off once more than one API process runs
   (U-07).
10. **Breached-password check** (NIST SP 800-63B-4): a k-anonymity range query (only a hash
    prefix leaves the server) is the usual way; it is an outside service, so it needs the
    owner's go.
11. **Passkeys** as an extra way in later (ADR-0006: no schema change beyond a credentials table).

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
