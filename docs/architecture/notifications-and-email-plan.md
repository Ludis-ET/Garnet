# Notifications, email and realtime

How Garnet reaches people (2026-11-10, P-96, P-100, P-101). Three channels, each for its own job:

| Channel      | For                                                                 | Works when                                  | Cost                                         |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| **Realtime** | Live chat, typing, who's online, anything changing on screen        | Garnet is open (foreground)                 | Free (your own server)                       |
| **Push**     | "Something new" when Garnet is closed                               | Android: Firebase (FCM). iPhone: APNs later | Free; iPhone needs Apple's $99/yr membership |
| **Email**    | The account: confirm, reset, email change, "already has an account" | Always                                      | Free (your cPanel mailbox)                   |

Privacy holds on every channel (AGENTS.md §5): push and email carry no content, only generic text and an opaque id or a link; nothing says "seen", nothing counts or compares.

## 1. Realtime (done, P-100)

- **Transport:** a WebSocket at `/v1/realtime`, with the existing SSE stream as an automatic fallback if the host or Cloudflare refuses WebSockets (two failed tries). Cross-process delivery uses PostgreSQL `LISTEN/NOTIFY`, so several Passenger processes behave as one.
- **Security:** the session is checked at the upgrade exactly like every route (verified, within 90 days, registered); the couple comes from the session. The app's header is required, so a web page can't ride the cookie. Clients may say only `ping`, `typing`, `in_chat`.
- **Presence:** online means Garnet is open (the app closes the connection in the background). The partner learns only "online". "In the chat" goes out only when both turned it on (P-58, P-61, U-35 open). Typing goes out only if the typer allows typing indicators.
- **What it drives:**
  - the theme: your side's colour alone, Garnet violet while both are online;
  - the home figure: yours alone, Garnet together;
  - the figures over the tab bar: yours alone, both together;
  - in the chat, the partner's figure peeks up with typing dots, or 👀 while they're in the chat;
  - every chat message, edit, deletion, reaction and pin, live.
- **Next (not yet):** emit realtime "changed" events for Days, signals, letters, surprises, events and memories, so those screens refresh live too (today they refresh when opened).

## 2. Push

### Android (done in code, needs your Firebase setup, P-101)

The API sends through FCM's HTTP v1 API with a service-account key; there is no Firebase SDK on the server and no Firebase features besides delivery. Setup: [docs/guides/firebase-push.md](../guides/firebase-push.md).

- Title "Garnet" and generic text by default; the person's own preview setting may show the sender's name or the catalogue label, never message text (P-17).
- Quiet hours use the silent "Quiet" channel. One notification per kind replaces the last one.
- A token the phone dropped is deleted. Signing out deletes the session, which deletes the phone's registration.
- iPhone tokens are never sent to FCM.

### iPhone (waiting on the Apple Developer Program)

Talk to APNs directly with a `.p8` key: no Firebase. Needs the membership ($99/yr), which publishing on iOS needs anyway.

### Every place that notifies

| What happens                                 | Category                     | Sent                                                  |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| A chat message                               | `chat-message`               | Yes                                                   |
| A reaction to your message                   | `reply-reaction`             | Yes (P-102); not for removing one, not to the reactor |
| A thought or signal (missing you, need you…) | signals group                | Yes                                                   |
| The partner's day revealed                   | `day-reveal`                 | Yes                                                   |
| A letter sealed for you                      | `open-when`                  | Yes (P-102), never its words                          |
| A surprise that opens now                    | `surprise`                   | Yes (P-102), never its contents                       |
| A surprise on its date, or with its event    | `surprise`                   | Yes, from 9:00 in the recipient's zone (scheduler)    |
| An event, a birthday, an anniversary         | `event-reminder`, `birthday` | Yes, to both, from 9:00 each in their own zone        |
| Your person joined from your invitation      | `partner-joined`             | Yes (P-102), to the inviter                           |
| Your person finished setup (space opens)     | `partner-joined`             | Yes (P-99, P-102), to the one who was waiting         |
| A photo or video finished processing         | `media-ready`                | Not yet: media processing finishes on upload today    |
| New sign-in or password change               | `security`                   | Not yet: needs a decision on what counts as "new"     |
| A memory reminder                            | `memory-reminder`            | Not yet: no reminder rule exists to send it by        |

**How the timed ones work:** every 5 minutes the API asks the database (through functions that return only ids, dates and zones; migration 0017) what is due today in each person's zone. Each notice is claimed in `notification_dispatch` first, so it is sent once even with several API processes. Nothing is sent before 9:00 local time.

## 3. Email (done, P-96)

| Email                              | When                                        | Lasts              |
| ---------------------------------- | ------------------------------------------- | ------------------ |
| Confirm your email                 | Sign-up, and signing in before confirming   | The link's hours   |
| Reset your password                | "Forgot password"                           | The link's minutes |
| Change your email?                 | Changing the account email (step one)       | The link's hours   |
| Someone tried to create an account | A sign-up with an email that has an account | 24 hours           |

- Each email is written to `mail_outbox` first and sent by the worker: timeouts on every step, retries from 30 s up to every 30 min until the link expires, never sent twice, deleted once sent.
- At start the API logs `mail_transport_ok` or `mail_transport_failed`. On the host, `node dist/mail-check.mjs you@example.com` explains what's wrong.
- **From any browser:** `https://garnet.lunafh.com/v1/health` shows `"mail": { "state": "failing", "error": "EAUTH 535" }` once the server has tried to send. `EAUTH 535` is a wrong mailbox password; `ECONNECTION` or `ETIMEDOUT`, the mail server can't be reached from the host (use its own mail hostname, port 465).
- Links are `https://garnet.lunafh.com/v1/open/…`, so Gmail keeps them.
- **To do (DNS, in Cloudflare):** the SPF, DKIM and DMARC records from cPanel → Email Deliverability, or Gmail may file emails as spam.
- **Not sent, on purpose:** no marketing, no "you've been away" emails, nothing about the partner's activity (§5).
