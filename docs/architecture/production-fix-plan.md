# Production fix plan

Audit of 2026-11-10: every issue found, each with its fix.

**Progress (2026-11-10).** All of this is in the working tree, not committed or deployed. It is tested by unit and integration tests, not yet on a phone.

| Item               | State                                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1, A2, A8         | Done. One shared auth client (`getGarnetAuthClient`); one redeem per code shared by the browser return and the deep link (`redeemHandoff`); the callback awaits the fresh status, then clears a stale email sign-up. |
| A3, A4             | Done. Network errors and 5xx are errors (the gate shows "try again"), never "signed out"; reading the status changes nothing.                                                                                        |
| A5                 | Done, both sides. The API answers 503, not 401, when the session lookup itself fails. The app forgets the cookie only if it is the one the refused request carried, keeps everything else, and re-asks the server.   |
| A6                 | Done. The confirm screen waits while a link is being handled.                                                                                                                                                        |
| A7                 | Done (P-94). Emails link to `https://<API>/v1/open/<page>?token=…`, a page that only opens the app; Android App Links remain a later improvement.                                                                    |
| A9                 | Already handled by `parseApiUrl`.                                                                                                                                                                                    |
| S11                | Done. Docker ports back on 127.0.0.1.                                                                                                                                                                                |
| S14 (new)          | Done. See the table below.                                                                                                                                                                                           |
| K1, K2, K3, K6, K7 | Done (P-95: `react-native-keyboard-controller` 1.21.9, the version Expo SDK 57 ships with). K4: focus now moves after the key event; the year field keeps "done". K5 needs the phone.                                |
| A10 (email)        | Done (P-96). Durable outbox with retries; startup login check; `mail-check.mjs` on the host. DNS (SPF, DKIM, DMARC) still to set in Cloudflare.                                                                      |
| Invitation code    | Done (P-97). Survives signing out and in; a fresh-code state replaces empty tiles. Share sheet, "How your person joins" and "Copy message" added.                                                                    |
| Pictures           | Done (P-98). Gallery photo and Google picture, everywhere `ProfileAvatar` draws; partner sees it.                                                                                                                    |
| Time zone          | Done. Every IANA zone (418) plus named cities; search ignores accents. "Change" opened a sheet whose list had no height: fixed in `Glass`.                                                                           |
| Open together      | Done (P-99). Waiting screen until the partner finishes setup; fusion on each launch after.                                                                                                                           |
| A0                 | Waiting: rebuild the APK (the keyboard library is native code, so a rebuild is needed anyway) and try both sign-in paths on the phone.                                                                               |

Mutants proving the new tests catch regressions: SOC-A2, SESS-A3, SESS-A4, SESS-A5, KB-K1, KB-K7 (app) and AUTH-S14, AUTH-A5, AUTH-A7 (API) in `scripts/mutation-check.mjs`.

**How this was checked.** Code was read across the app, the API, the database and deployment. Typecheck, lint and formatting pass. Contracts (103 tests) and database (49) pass. The API and app test suites did not finish during the audit. Nothing was run on a phone. The live site was only looked at from outside: health answers, Google sign-in is on. Items marked _needs phone_ are the most likely cause, not proven.

**The short version.** Passing tests hide the real problems: the tests run with more database rights than production has, and the app still runs on sample data underneath. Until the fixed version is redeployed, keep only test accounts on the live server.

## 0. Your setup, and how the fixed version gets back online

What the live API runs on, from the repo and the live server's headers:

- **Server:** cPanel at `garnet.lunafh.com`, Node through Passenger or LiteSpeed (`apps/api/app.js`). Migrations run when the app starts.
- **Database:** cPanel PostgreSQL with **one** database user, which is why `GARNET_DISABLE_ROLE_SWITCH=true` was needed.
- **In front:** Cloudflare (it answers every request).
- **Photos, videos and voice:** Cloudflare R2. That part is fine; it is not what decision D3 is about.
- **Deploys:** every push to `main` builds and uploads by FTP automatically (`.github/workflows/deploy.yml`). Nothing gets pushed to `main` until a phase is finished and checked.

**Staying on cPanel works, with three changes:**

1. **Two more database users in cPanel** (no cost): one that owns the tables and runs migrations, one the API uses for people's data, and one only for accounts. The API connects as a user that does not own the tables, so the database's per-person rules apply again without any role switching. This replaces S1's "separate roles" and needs no new host.
2. **Realtime is tested on the host before it is built on.** Cloudflare passes WebSockets through. Whether Passenger or LiteSpeed holds a long-lived connection on this account is unknown, so phase 4 starts by deploying a tiny test endpoint. If the host can't hold it, the fallback is a Cloudflare Worker with a Durable Object per couple, on the free tier, which you already use Cloudflare for. The API tells it what changed over HTTPS.
3. **Node version:** the host runs Node 20 or newer, and Node's own Argon2id needs 24.7, so passwords use a pure-WebAssembly Argon2id that runs on any Node (P-93).

**Redeploy order, once a phase is checked:**

1. Back up the database with `pg_dump` from cPanel.
2. Create the database users.
3. Update `.env` (new connection strings, no `GARNET_DISABLE_ROLE_SWITCH`).
4. Push to `main` to deploy. Migrations add things; already-applied ones never change.
5. Run the post-deploy checks in section 10. Roll back to the backup if any fail.

## 1. Decisions only you can make

Recommendations are mine. None is recorded as decided until you say so.

| #   | Question                                                                                                                                                                                                                                 | Recommendation                                                                                                         | Blocks                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| D1  | **Hosting: decided.** Stay on cPanel and redeploy (section 0). Node is 20 or newer, so Argon2id comes from WebAssembly (P-93).                                                                                                           | Create the database users when phase 2 is ready.                                                                       | S1, A13                    |
| D2  | **Live server until the redeploy?**                                                                                                                                                                                                      | Keep it up for test accounts only; no real conversations until phase 2 is deployed.                                    | none                       |
| D3  | **Shared content: decided (P-92).** When one leaves, what they shared stays with the other. When both have left, it is kept. **Flag:** keeping it after both have left may conflict with erasure rights, so it is one retention setting. | Recommended: 90 days after the last account goes, pending the legal review (U-36). Confirm or overrule.                | S4, S5                     |
| D4  | **"Seen" and "here now" in chat (U-35).** AGENTS.md bans read receipts; P-58 allows mutual opt-in.                                                                                                                                       | Mutual opt-in, off until both say yes.                                                                                 | G1, G2                     |
| D5  | **Real media limits (U-08):** photo and video size, video length.                                                                                                                                                                        | Photos 15 MB; videos 200 MB and 3 minutes; voice 5 minutes.                                                            | M9                         |
| D6  | **Push provider.**                                                                                                                                                                                                                       | Firebase Cloud Messaging for Android: free, needs your Firebase project. Apple push needs the paid developer account.  | R8                         |
| D7  | **"Production" means what?** Public store release stays blocked by the character rights (U-10, U-26).                                                                                                                                    | Private release to the two of you first (installed APK).                                                               | Store release only         |
| D8  | **Realtime fallback** if the host test fails (section 0).                                                                                                                                                                                | Cloudflare Worker and Durable Object (free tier). The other choice is moving the API to a host that holds connections. | R1, only if the test fails |

## 2. Safety on the server

| ID  | Problem                                                                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                       | Where                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| S1  | `GARNET_DISABLE_ROLE_SWITCH` makes the API the tables' owner, so the database's per-person rules are off and unscoped queries cross between couples, private drafts included.                                                                          | Separate cPanel database users (section 0). One pool for people's data, one for accounts only. The API refuses to start if its user owns the tables or bypasses the rules. Remove the flag and the migration rewriting that went with it. | `apps/api/src/db/database.ts`, `main.ts`, `packages/db/src/migrate.ts`   |
| S2  | With S1, one person's data export contains every couple's chat, memories and plans.                                                                                                                                                                    | Filter by relationship and author explicitly, as well as the database rules.                                                                                                                                                              | `account/data-rights.service.ts`                                         |
| S3  | Media, notifications and data rights only work because of the bypass: they query with no signed-in person, so once S1 is fixed they return nothing or fail.                                                                                            | Move them to `asViewer` or narrow database functions. Run the whole API test suite as the non-owner user.                                                                                                                                 | `media.service.ts`, `notifications.service.ts`, `media-purge.service.ts` |
| S4  | End space and Delete account silently chose U-20 and U-23 (hard delete, immediate), and the decision log (P-87) says the opposite.                                                                                                                     | Turn both off until D3. Then build them on D3, and correct P-87.                                                                                                                                                                          | `data-rights.service.ts`, `decision-log.md`                              |
| S5  | Deleting an account crashes (500) for anyone with media, signals, letters, surprises, events or memories. Apple's review requires working deletion.                                                                                                    | A deletion routine following D3, tested on a fully used account. It also deletes the person's R2 files.                                                                                                                                   | `data-rights.service.ts`, migrations 0001, 0011                          |
| S6  | A partner holding a media id can fetch a **private draft's photo**. Either partner can delete any media. The client's `entityId` is trusted.                                                                                                           | New migration: media follows its parent's visibility; only the owner deletes; the server checks the entity.                                                                                                                               | `migrations/0010_media.sql`, `media.service.ts`                          |
| S7  | Any signed-in person can run the global media purge.                                                                                                                                                                                                   | Remove the route; purge on a schedule (cPanel cron).                                                                                                                                                                                      | `media/media.controller.ts`, `probes.test.ts`                            |
| S8  | Export download: public link with no session, plaintext, reusable for 7 days, never purged.                                                                                                                                                            | Require a session, hash the token, single use, purge on expiry.                                                                                                                                                                           | `data-rights.controller.ts`                                              |
| S9  | Re-authentication has no back-off and resets the session's start time, defeating the 90-day limit (P-78).                                                                                                                                              | Back-off, and a separate `reauth_at`.                                                                                                                                                                                                     | `data-rights.service.ts`                                                 |
| S10 | CORS allows any localhost port with credentials in production, and a prefix check accepts `http://localhost.evil.example`. Better Auth trusts dev origins.                                                                                             | Allow-list from config; exact origin parsing; no dev origins in production.                                                                                                                                                               | `app.ts`, `auth.ts`, `bridge.ts`                                         |
| S11 | Your uncommitted Docker change opens the local Postgres, Mailpit and storage to the whole network.                                                                                                                                                     | Revert to `127.0.0.1`.                                                                                                                                                                                                                    | `infra/docker-compose.yml`                                               |
| S14 | **Found while fixing A2.** The hand-off's `redirect_to` was used as given. With the web build's browser session, a crafted link turned the session into a code delivered to any site, where the attacker's own verifier redeemed it: account takeover. | `redirect_to` may only be `http://localhost:<port>/auth-callback` or the 127.0.0.1 form (the web build is development-only); anything else goes to the app. Tested with six hostile targets.                                              | `auth/handoff.ts`                                                        |
| S12 | Deploy uses plain FTP with no tests first. No real backups. The deploy guide was deleted. A real SMTP username and host are in git history (`50d508b`).                                                                                                | Tests must pass before deploy; FTPS or SSH if cPanel allows; nightly `pg_dump` by cPanel cron, with a restore test; restored deploy guide. Check whether a password was ever committed and rotate it if so. Ignore `*.apk` and `*.aab`.   | `.github/workflows/deploy.yml`, `.gitignore`                             |
| S13 | Weak database rules: chat insert has no sender check; media has `using(true)`; any member can update a surprise.                                                                                                                                       | Tighten in a new migration, with probe tests.                                                                                                                                                                                             | `0008_chat.sql`, `0010_media.sql`, `0011_moments.sql`                    |

## 3. Sign-in: "it registers but sends me back to Welcome"

**Google path: cause found.** **Email path:** several candidates below; A0 proves which on your phone first.

| ID  | Problem                                                                                                                                                                 | Fix                                                                                                                       | Where                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| A0  | The APK on the phone is older than the latest code, and the failure gives no information.                                                                               | Rebuild. Add a temporary, content-free auth trace (state changes only, no emails or tokens). Reproduce, then remove it.   | `garnet-release.apk`, `httpAuth.ts`   |
| A1  | After Google, the app returns to the start before the signed-in state refreshes, sees the old "signed out", and goes to Welcome, which never moves on.                  | Wait for the refreshed status, then navigate.                                                                             | `app/(auth)/auth-callback.tsx`        |
| A2  | The return link is handled twice, by the route and by `social.ts`, and the code works once. Failures also run the success path.                                         | One shared redeem per code; check the error; wait for it before reporting "cancelled".                                    | `auth-callback.tsx`, `social.ts`      |
| A3  | Any network error or server 5xx counts as "signed out", so a slow server start sends you to Welcome and the retry screen can't appear. _Likely for email, needs phone._ | Only "no session" or 401 means signed out. Everything else shows retry.                                                   | `httpAuth.ts`                         |
| A4  | Reading the status deletes `hadSession`, so the first read says "expired" and the next "signed out".                                                                    | Don't clear it while reading.                                                                                             | `httpAuth.ts`                         |
| A5  | Any 401 from any request wipes the cookie and the "waiting for email" state, and a late 401 can delete a brand-new cookie. _Likely for email, needs phone._             | Wipe only if the cookie sent is still the current one; only cookie keys; then refresh status.                             | `apiRepositories.ts`, `localState.ts` |
| A6  | Opening the confirmation link can redirect away before the link is processed.                                                                                           | Show a spinner until the token has been handled.                                                                          | `VerifyEmailScreen.tsx`               |
| A7  | Email buttons are `garnet://` links, which Gmail commonly strips. Without one, an account can never be confirmed. Reset links too. _Needs phone._                       | https links on your domain that open the app (Android App Links, with the `assetlinks.json` file on `garnet.lunafh.com`). | `auth/mailer.ts`, bridge allow-list   |
| A8  | A leftover "waiting for email" outranks a real session and traps you on "Check your inbox".                                                                             | Clear it after any successful sign-in.                                                                                    | `httpAuth.ts`, `auth-callback.tsx`    |
| A9  | Production `GARNET_AUTH_BASE_URL` must exactly match the app's URL, or Google sign-in is refused.                                                                       | Check at startup and document it.                                                                                         | `config.ts`, `bridge.ts`              |
| A10 | Mail is sent inline with no timeout, and SPF, DKIM and DMARC aren't set up, so mail may be lost or slow sign-up.                                                        | Timeout and a queue; set up the DNS records in Cloudflare.                                                                | `auth/mailer.ts`, DNS                 |
| A11 | Behind Cloudflare and LiteSpeed, everyone likely shares one address and one rate limit.                                                                                 | Take the client address from `CF-Connecting-IP`, trusted only from Cloudflare's address ranges.                           | `apps/api/src/app.ts`, `bridge.ts`    |
| A12 | Limits live in memory: reset when Passenger restarts the app, split across processes.                                                                                   | Postgres-backed limiters.                                                                                                 | `throttle.ts`, `http/attempts.ts`     |
| A13 | Argon2 quietly falls back to scrypt on Node older than 24.7, which this host runs (P-93).                                                                               | WebAssembly Argon2id. No fallback for new hashes; old scrypt hashes upgrade at next sign-in.                              | `auth/password.ts`                    |

## 4. Keyboard and input jitter

| ID  | Problem                                                                                                                               | Fix                                                                                       | Where                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| K1  | **Birthday:** a character counter appears after one digit and vanishes on auto-advance, so the row height changes on every keystroke. | Counter off by default; only on long fields.                                              | `TextField.tsx`, `DateField.tsx`      |
| K2  | Android edge-to-edge no longer resizes the screen, so the keyboard covers Continue and the layout fights it.                          | Add `react-native-keyboard-controller` (new dependency, MIT) and a keyboard-aware scroll. | `GlassScreen.tsx`, `AppProviders.tsx` |
| K3  | Each sign-up step remounts the focused field, closing the keyboard every time.                                                        | Animate the title only; keep the field mounted; move focus on the next frame.             | `CreateAccountScreen.tsx`             |
| K4  | Focus moves inside the typing event, and the year field has a different keyboard action, forcing the keyboard to reconfigure.         | Defer focus; same action on all three fields.                                             | `DateField.tsx`                       |
| K5  | Birthday autofill hints may trigger the autofill service on each focus. _Needs phone._                                                | Test without; turn off on Android if confirmed.                                           | `DateField.tsx`                       |
| K6  | Three oversized background orbs animate forever behind the inputs.                                                                    | Pause while the keyboard is open.                                                         | `brand/Aurora.tsx`                    |
| K7  | The clear button narrows the field when it appears; the error line shifts the layout. Dead refs remain in `TextField`.                | Reserve the space and fade instead; remove dead code.                                     | `TextField.tsx`, `DateField.tsx`      |

## 5. Offline: the phone's own database

Today only Days entries work offline. The rest show cached data at best, and lose what you write without a connection.

| ID  | Problem                                                                                                                                                                                                                      | Fix                                                                                                                                                    | Where                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| O1  | **Signing out never clears the phone's database.** The next person to sign in on that phone could see the previous person's cached messages, letters and **private drafts**.                                                 | One database file per account; on sign-out, after warning about unsent items, delete it. `clearAll` exists but nothing calls it.                       | `sqliteStore.ts`, `httpAuth.ts`          |
| O2  | If SQLite fails to open, the app silently keeps everything in memory, and writes vanish when the app closes.                                                                                                                 | Never fall back silently: show a clear error, and test the real SQLite on the phone.                                                                   | `sqliteStore.ts` (`createDefaultDriver`) |
| O3  | **Only Days entries go through the offline outbox.** Chat messages, reactions, letters, surprises, events, memories, plans, signals and settings are lost if sent without a connection (§5: never silently lose typed text). | One durable outbox for every write, with `mutationId` and retries. Each screen shows "Waiting to send" from it. Server-side idempotency for each (P7). | `syncEngine.ts`, every `http*.ts`        |
| O4  | Queued writes are sent only when you happen to open or change Days; nothing resends when the connection returns or the app comes back.                                                                                       | Sync on reconnect (`expo-network`), on app foreground, on realtime events, and with back-off retry.                                                    | `syncEngine.ts`, `AppProviders.tsx`      |
| O5  | A write the server rejects stays at the head of the queue forever and is resent on every sync. Its text is never kept anywhere visible.                                                                                      | Move it out of the queue into a private "couldn't send" copy the person can edit or discard.                                                           | `syncEngine.ts` (`push`)                 |
| O6  | No schema versions: the tables are only "create if missing", so any later change to them breaks an installed app.                                                                                                            | `PRAGMA user_version` and step-by-step local migrations, tested from every older version.                                                              | `sqlite/schema.ts`                       |
| O7  | Every database call is synchronous on the UI thread, so long lists stutter.                                                                                                                                                  | Use expo-sqlite's async calls.                                                                                                                         | `sqliteStore.ts`                         |
| O8  | Transactions aren't safe: other writes can land inside an open one, and an error mid-way can leave half a change.                                                                                                            | Use `withExclusiveTransactionAsync`; one writer at a time.                                                                                             | `sqliteStore.ts`                         |
| O9  | Offline entries are written under the demo user's id, because the user id comes from the sample-data mirror (M2).                                                                                                            | Use the real user id from the session.                                                                                                                 | `apiRepositories.ts`, `syncEngine.ts`    |
| O10 | Cached chat is read for a made-up relationship id (`"default"`), so the wrong or no messages show offline.                                                                                                                   | Key every cached item by the real relationship.                                                                                                        | `httpChat.ts`                            |
| O11 | Private drafts and messages are stored unencrypted on the phone.                                                                                                                                                             | expo-sqlite's SQLCipher option, with the key in the phone's secure keystore. This makes the stolen-phone case safe.                                    | `app.json`, `sqliteStore.ts`             |
| O12 | The real SQLite is never tested: the tests swap in an in-memory imitation, and the sync rules proven in the F-04 spike aren't checked against the app's engine.                                                              | Run the same tests against real SQLite. Port the F-04 property tests: offline, reorder, retry, conflict, delete wins, nothing lost, nothing doubled.   | `sqlite/*.test.ts`, `sync/*.test.ts`     |
| O13 | Media can't be sent offline at all.                                                                                                                                                                                          | Queue the file locally, upload and commit when back online, with visible progress (with M9).                                                           | `httpMedia.ts`, outbox                   |
| O14 | The offline banner is simulated, so you can't tell what is waiting.                                                                                                                                                          | Real network state, and a count of what is waiting to send (with M7).                                                                                  | `Notice.tsx`, outbox                     |

## 6. Realtime: no polling

Today chat has a live stream only while the conversation is open. Nothing else is live, and there are no sockets.

**Design.** The phase starts with the host test in section 0.

- **Connection:** one WebSocket per signed-in app (`/v1/realtime`, using `@fastify/websocket`). The session is checked at connect and again regularly.
- **Catch-up:** a durable event log per relationship, with a cursor, so a dropped connection catches up exactly.
- **Several processes:** Postgres `LISTEN/NOTIFY` lets them work together.
- **Privacy:** most events say "this changed" by id, and the app refetches through its normal, rule-checked routes. Private content never travels through the socket (P-19), and every event is filtered for its audience.
- **Background:** when the app is in the background, push takes over.
- **If the host can't hold connections (D8):** the Cloudflare Worker carries the same events.

| ID  | Work                                                                                                               | Where                                   |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| R0  | Host test: a tiny WebSocket and a 10-minute idle connection through Cloudflare and cPanel.                         | new test endpoint, removed afterwards   |
| R1  | Gateway: auth on upgrade, regular re-check, close on revoked session or ended space.                               | new `apps/api/src/realtime/`            |
| R2  | Durable events with a cursor, `pg_notify` fan-out replacing the in-process emitter, and a retention limit.         | new migration, `chat-events.service.ts` |
| R3  | Shared event shapes in contracts, validated on both sides.                                                         | `packages/contracts`                    |
| R4  | One client connection: connect on foreground; back off; stop on 401 or 404; ping watchdog; catch up after any gap. | replaces `chatStream.ts`                |
| R5  | Events update the right cached screens and trigger offline sync (O4).                                              | `RepositoryProvider.tsx`, feature hooks |
| R6  | Remove the 2.5-second invite poll.                                                                                 | `InviteScreen.tsx`, `usePairing.ts`     |
| R7  | Refetch on app foreground and on reconnect (`focusManager`, `onlineManager`).                                      | `AppProviders.tsx`                      |
| R8  | Real push: phone token registration, FCM sender, generic text and opaque id only, invalid-token cleanup (D6).      | `notifications/`, `main.ts`             |
| R9  | Remove the test `?probe=true` branch from production; real stream tests instead.                                   | `chat.controller.ts`                    |

| Feature                                  | Now                          | After                                                 |
| ---------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| Messages, edits, reactions, pins, delete | Only while chat is open      | Live everywhere; delete-for-me syncs your own devices |
| Typing, here now                         | Server only; app never sends | Live, respecting each person's choice (D4)            |
| Seen                                     | Only on opening chat         | Live, mutual opt-in only (D4)                         |
| Signals and Us                           | Notification row only        | Live                                                  |
| Home, Days, Moments, Our World           | When a screen reopens        | Live                                                  |
| Notification centre and badge            | When a screen reopens        | Live, plus push                                       |
| Partner joined                           | 2.5-second poll              | Live                                                  |
| Partner's setup, settings across devices | When a screen reopens        | Live                                                  |

Stream bugs fixed along the way:

- Your own events echo back.
- Reaction payloads carry the sender's "reacted by me".
- A deleted message's stream event keeps its media.
- Payloads aren't validated.
- The stream stays open after sign-out or ending the space.

**Privacy fixes that land with this**

| ID  | Problem                                                                                                            | Fix                                | Where                           |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------- |
| G1  | Opening chat tells the partner's device the moment you read, with no opt-in. The UI hides it; the data still goes. | Send only with mutual opt-in (D4). | `chat.service.ts`               |
| G2  | Typing and "here now" ignore opt-outs.                                                                             | Check before sending.              | `chat.service.ts`, `useChat.ts` |
| G3  | Edit, reaction and pin events carry the sender's private "saved as memory" mark.                                   | Build each event per audience.     | `chat.service.ts`               |
| G4  | Push data includes the signal's category; the rule is opaque id and generic text only.                             | Remove it.                         | `notifications.service.ts`      |

## 7. Remove every mock

| ID  | Problem                                                                                                                           | Fix                                                                                                                                           | Where                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| M1  | **Scripted fake replies:** a sample partner answers in chat 4 seconds after you send, even on the real server.                    | Remove `afterSend` and `autoReply`.                                                                                                           | `ConversationScreen.tsx`, `prototype/demoActions.ts`               |
| M2  | **Every real person is `demo-user-ruby`** inside the app, so "mine", author and recipient checks are wrong in six areas.          | Use the real user id from the session; delete the mirror.                                                                                     | `mirror.ts`, `apiRepositories.ts`, every `http*.ts`                |
| M3  | Fake notifications from demo data ("Noah's birthday"), and a badge counting demo items.                                           | Rebuild from real repositories.                                                                                                               | `notifications/plan.ts`, `NotificationSync.tsx`                    |
| M4  | Widgets draw from the demo user and sample data, and refresh only on mock changes.                                                | Rebuild the snapshot from real data; refresh on events.                                                                                       | `widgets/snapshot.ts`, `RepositoryProvider.tsx`                    |
| M5  | Home's companions come from demo entries; a failed send reports success; dismissing a card doesn't stick.                         | Real data; report failure; persist dismiss.                                                                                                   | `httpHome.ts`                                                      |
| M6  | Memories' start date is hardcoded to 2024-10-15.                                                                                  | Use "together since", then the relationship's start.                                                                                          | `httpMemories.ts`                                                  |
| M7  | Offline status is simulated.                                                                                                      | Real network state (`expo-network`, already installed); see O14.                                                                              | `Notice.tsx`, `InfoPages.tsx`                                      |
| M8  | Seven taps unlock test tools in release builds, including "Reset sample data".                                                    | Exclude from production builds.                                                                                                               | `InfoPages.tsx`, `SettingsScreen.tsx`, `features/prototype/`       |
| M9  | **All photos and videos are 12 sample pictures.** No picker is installed; the real upload to R2 exists but nothing calls it (D5). | Add `expo-image-picker` and `expo-video`; wire `httpMedia` everywhere; thumbnails, retry, progress; offline queue (O13). Replace `DemoMedia`. | `MediaPickerSheet.tsx`, `AttachTray.tsx`, `httpMedia.ts`           |
| M10 | **The voice recorder is simulated**: a timer, and nothing recorded.                                                               | Record with `expo-audio` (already installed), with microphone permission.                                                                     | `VoiceRecorderSheet.tsx`, `VoicePlayer.tsx`                        |
| M11 | Profile pictures are limited to sample photos; photo and notification permission prompts in setup are simulated.                  | Real picker and upload; real system prompts.                                                                                                  | `PhotoStep.tsx`, `SetupScreen.tsx`, `httpSetup.ts`                 |
| M12 | Without `EXPO_PUBLIC_API_URL`, a build silently runs on sample data.                                                              | Production build fails if it is missing.                                                                                                      | `eas.json`, `config.ts`, `run-mobile.bat`                          |
| M13 | Fictional people, demo accounts and demo buttons ship in the app ("Fill the demo account", "Use the demo invitation from Noah").  | Move sample data to test-only code, out of the production bundle; rename `Demo*` types.                                                       | `data/fixtures/`, `data/mock/`, auth and pairing screens           |
| M14 | Stray demo text: "Sample pictures only", "Preview build", "Prototype: nothing was sent", "Coming later", "Simulated" badges.      | Remove, or build the real thing.                                                                                                              | `Gallery.tsx`, `CharacterWidgets.tsx`, `Labs.tsx`, `InfoPages.tsx` |

## 8. Other pages and features

| ID  | Problem                                                                                                                         | Fix                                                                        | Where                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| P1  | Chat: cancel upload does nothing; retry sends only an id; upload progress is fake.                                              | Real upload state.                                                         | `httpChat.ts`, `ConversationScreen.tsx`     |
| P2  | Surprises: retry does nothing.                                                                                                  | Implement it.                                                              | `httpSurprises.ts`                          |
| P3  | Search: recent searches are lost on restart; `ilike` ignores the search indexes and will slow down.                             | Keep recents privately on the phone; use the index.                        | `httpSearch.ts`, `search.service.ts`        |
| P4  | "Items waiting to send" at sign-out is always 0, so unsent work could be lost without warning.                                  | Read the real outbox count (O3).                                           | `httpAuth.ts`, sync engine                  |
| P5  | Settings: About says "everything stays on this phone"; Send feedback says thanks and sends nothing; export download is a toast. | Correct the text; hide feedback until there's a real route; real download. | `InfoPages.tsx`, `AccountPages.tsx`         |
| P6  | A sensitive change asks you to sign out and in.                                                                                 | An in-place password or provider prompt.                                   | `AccessPages.tsx`                           |
| P7  | Chat and Moments have no tombstones or idempotency (ADR-0003): deleted items can come back, and retries can double-send.        | Extend `mutationId` and tombstones to them (needed by O3).                 | `chat.service.ts`, `open-when.service.ts`   |
| P8  | Bad input can return 500 instead of 400 (media bodies, date and id params).                                                     | `parseBody` and a shared id and date check.                                | `media.controller.ts`, `days.controller.ts` |
| P9  | Partner's avatar isn't mapped on Us.                                                                                            | Map it.                                                                    | `httpUs.ts`                                 |
| P10 | Nothing schedules media purge, sweep or reconcile, so deleted files stay in R2.                                                 | cPanel cron jobs.                                                          | `media-purge.service.ts`                    |

**Every screen gets a hands-on pass on two real phones** (65 routes). Reading code can't prove a page works. Each is tested for: real data loads, empty state, error state, offline state, both partners see the right thing, and the keyboard behaves.

| Area              | Routes   | Known issues              |
| ----------------- | -------- | ------------------------- |
| Sign-in           | 12       | A1 to A13, K1 to K7       |
| Pairing and setup | 7        | R6, M11, M13              |
| Home              | 1        | M5, M14, O3               |
| Days              | 4        | M9, M10, O4 to O7         |
| Us and chat       | 4        | M1, M9, P1, O3, O10, R, G |
| Moments           | 8        | M9, P2, P7, O3            |
| Our World         | 10       | M6, M9, O3                |
| Search            | 1        | P3                        |
| Notifications     | 2        | M3, R8                    |
| Settings          | 18 pages | P5, P6, M14, S4           |
| Widgets           | n/a      | M4                        |

## 9. Backend and delivery

| ID  | Problem                                                                                                       | Fix                                                                               | Where                                |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| B1  | The server starts serving before migrations finish, and a failed migration kills the process.                 | Migrations finish before the server listens; a failed migration fails the deploy. | `apps/api/app.js`, `db/src/cli.ts`   |
| B2  | Without storage settings, media silently goes to memory. Push silently goes nowhere and grows forever.        | Refuse to start in production without them.                                       | `apps/api/src/main.ts`               |
| B3  | Tests connect with more rights than production, which is how S1 and S3 went unnoticed.                        | The harness connects as the non-owner user.                                       | `apps/api/test/harness.ts`           |
| B4  | Three mutation checks are stale; none cover media, data rights, notifications, search, sync, chat or moments. | Fix them and add coverage, data rights and media first.                           | `scripts/mutation-check.mjs`         |
| B5  | Decisions made during your phases aren't recorded (role flag, CORS, cPanel, R2, FTP, scrypt, U-08 limits).    | Add P-rows; correct P-87; mark what still needs your decision.                    | `decision-log.md`                    |
| B6  | The settings phase wasn't closed: its final checks didn't finish.                                             | Finish them as part of this plan.                                                 | `pnpm check`, `pnpm mutation`        |
| B7  | AGENTS.md still says "mock data only".                                                                        | Update after the M items land, with your direction recorded.                      | `AGENTS.md`, `apps/mobile/AGENTS.md` |
| B8  | No monitoring: a server failure is invisible until someone notices.                                           | Uptime check on `/v1/health`; allow-listed error reporting; no analytics.         | Cloudflare or cPanel                 |
| B9  | Passenger idles and restarts the app. Anything held in memory resets (limits, event bus, push queue).         | Covered by A12 and R2. Test a restart in the middle of a live chat.               | hosting                              |

## 10. Order of work

Each phase ends checked, then you redeploy (section 0).

| Phase | What                                              | Done when                                                                   |
| ----- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| 0     | S11, A0: reproduce on your phone                  | The email failure's cause is proven                                         |
| 1     | A1 to A9, K1 to K7, rebuild the APK               | Sign-up, confirm, sign-in and Google work on your phone, with no jitter     |
| 2     | S1 to S3, S6 to S10, S13, B1 to B3, A11 to A13    | All API tests pass as the non-owner user; two couples can't see each other  |
| 3     | O1 to O12, P4, P7                                 | A full day offline on one phone, back online with nothing lost or doubled   |
| 4     | M1 to M8, M12 to M14, P1 to P3, P5, P6, P8 to P10 | No sample data in the production bundle                                     |
| 5     | R0 to R9, G1 to G4                                | Two phones update live with no polling, through airplane mode and a restart |
| 6     | M9 to M11, O13 (needs D5)                         | Real photos, video and voice sent and received on two phones, offline too   |
| 7     | S4, S5 (needs D3), S12, A10, B4 to B9             | Deletion follows D3; backups restore; deploy gated by tests                 |
| 8     | Two-phone pass over all 65 routes                 | Every page signed off                                                       |

**How each phase is proven:**

- `pnpm check` passes, with a mutation check for each new guard.
- API tests run as the non-owner user, with a two-couple probe for every route.
- Offline: property tests against real SQLite, plus a day on the phone in airplane mode.
- Realtime: two phones live, then airplane mode, then back; nothing lost, nothing doubled.
- After each redeploy, against `garnet.lunafh.com`: health, sign-up with a real inbox, two test couples kept apart, a media upload to R2.
- iPhone stays untested until there's an iOS build (U-01).
