# Local backend

Phases B0 and B1 of the [backend plan](../docs/architecture/backend-plan.md) (P-76, P-77). Everything
runs on this PC: PostgreSQL and Mailpit in Docker (bound to 127.0.0.1) and the API in Node.
Nothing is hosted, deployed or paid for; hosting waits on U-07.

## Start it

**One click (Windows):** double-click [`apps/run-mobile.bat`](../apps/run-mobile.bat). It runs
`pnpm install`, then `pnpm backend` ([scripts/dev-backend.mjs](../scripts/dev-backend.mjs)):
starts Docker Desktop if needed, brings up Postgres and Mailpit, creates `apps/api/.env` with a
fresh secret on first run, migrates, and opens the API in its own "Garnet API" window (close it
to stop the API). Then it offers the Android phone over USB (sets up `adb reverse` and builds the
app against this PC), the browser preview, Expo Go, or backend only. `pnpm backend` alone works
from any shell.

**By hand.** Needs Docker Desktop running and `pnpm install` done. In Git Bash, from the
repository root:

```sh
# 1. The database and the local mailbox (first start also creates the API's login role).
docker compose -f infra/docker-compose.yml up -d --wait

# 2. Migrations.
export GARNET_DATABASE_OWNER_URL=postgres://garnet_owner:garnet-owner-local@127.0.0.1:55432/garnet
pnpm --filter @garnet/db migrate

# 3. The API's settings: copy the example once and give it your own secret.
#    (apps/api/.env is git-ignored; this copies the example with a random GARNET_AUTH_SECRET.
#    The ADR-0006 values in it are proposals, not decisions.)
node apps/api/scripts/init-env.mjs          # never overwrites an existing .env

# 4. Optional: two test people, Selam and Noah, verified, set up and paired.
GARNET_SEED_PASSWORD='choose a local password' pnpm --filter @garnet/api seed

# 5. The API, as its own role (never the owner).
pnpm --filter @garnet/api dev              # http://127.0.0.1:3000
```

Check it: `curl http://127.0.0.1:3000/v1/health` and `curl http://127.0.0.1:3000/v1/auth/ok`.

## Email

Every account email (verification, password reset, "someone tried to sign up") lands in
**Mailpit** at http://127.0.0.1:8025. Nothing is ever sent outside this PC. The links open the
app (`garnet://verify-email?token=…`, `garnet://reset-password?token=…`), so open the inbox on
the phone (step below) and tap the link there.

## The phone

With the phone on USB:

```sh
adb reverse tcp:3000 tcp:3000    # the app reaches the API at http://127.0.0.1:3000
adb reverse tcp:8025 tcp:8025    # the phone's browser opens the Mailpit inbox
```

Build the app pointed at the PC, with accounts, pairing and setup on the API (everything else
stays on sample data until its phase):

```sh
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 EXPO_PUBLIC_API_AREAS=auth,pairing,setup \
  pnpm --filter @garnet/mobile apk -- --install
```

Settings › About then shows "Connected to this PC" when the API answers.

## Google and Apple sign-in (P-79)

Both are off until configured; the app then shows only email and password. Nothing here costs
money for Google; Apple needs the paid Apple Developer Program and an https domain (U-07), so it
can't run on this PC yet.

**Google, on this PC with the phone on USB:**

1. In the Google Cloud console, create a project, set up the OAuth consent screen (External,
   Testing, add your own Google accounts as test users), then **Credentials › Create credentials ›
   OAuth client ID › Web application**.
2. Authorised redirect URI: `http://127.0.0.1:3000/v1/auth/callback/google` (Google allows plain
   http only for this machine's own addresses).
3. Put the client ID and secret in `apps/api/.env` as `GARNET_GOOGLE_CLIENT_ID` and
   `GARNET_GOOGLE_CLIENT_SECRET`, and restart the API. `GET /v1/sign-in-methods` then says
   `"google": true` and the buttons appear.
4. With `adb reverse tcp:3000 tcp:3000` (the launcher does it), the phone's browser reaches the
   same address, so the sign-in comes back to the API and then to the app through the hand-off.

**Apple:** a Services ID with an https return URL `https://<domain>/v1/auth/callback/apple`, a
Sign in with Apple key, and `node apps/api/scripts/apple-client-secret.mjs` to make
`GARNET_APPLE_CLIENT_SECRET` (it lasts at most six months). On iPhone the app uses Apple's own
sheet; set `GARNET_APPLE_BUNDLE_ID` to the app's bundle id for that.

## Roles

| Role           | Used by                                       | Can                                                                          |
| -------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| `garnet_owner` | migrations, the seed                          | everything (owns the tables)                                                 |
| `garnet_api`   | the API's connections                         | what `garnet_auth` and `garnet_app` may; never bypasses RLS                  |
| `garnet_auth`  | Better Auth (accounts, sessions, email links) | only its own tables                                                          |
| `garnet_app`   | every other request, via `set local role`     | rows its RLS policies allow; no accounts, sessions, passwords or invitations |

## Reset

`docker compose -f infra/docker-compose.yml down -v` deletes the local database and mailbox.
