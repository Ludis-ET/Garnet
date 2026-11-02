# Local backend

Phase B0 of the [backend plan](../docs/architecture/backend-plan.md) (P-76). Everything runs on
this PC: PostgreSQL in Docker (bound to 127.0.0.1) and the API in Node. Nothing is hosted,
deployed or paid for; hosting waits on U-07.

## Start it

Needs Docker Desktop running and `pnpm install` done. In Git Bash, from the repository root:

```sh
# 1. The database (first start also creates the API's login role, see postgres/init/).
docker compose -f infra/docker-compose.yml up -d --wait

# 2. Migrations and the two local test people (Selam and Noah, paired).
export GARNET_DATABASE_OWNER_URL=postgres://garnet_owner:garnet-owner-local@127.0.0.1:55432/garnet
pnpm --filter @garnet/db migrate
pnpm --filter @garnet/db seed

# 3. The API, as its own role (never the owner).
export GARNET_API_DATABASE_URL=postgres://garnet_api:garnet-api-local@127.0.0.1:55432/garnet
pnpm --filter @garnet/api dev        # listens on http://127.0.0.1:3000
```

Check it:

```sh
curl http://127.0.0.1:3000/v1/health
TOKEN=$(pnpm --silent --filter @garnet/db dev-session selam)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3000/v1/me
```

`dev-session` makes a 30-day session for Selam or Noah until sign-in exists (B1). It only works
against a database on this machine, the API has no way to create one, and only the token's
hash is stored.

## The phone

With the phone on USB, `adb reverse tcp:3000 tcp:3000` lets it reach the API at
`http://127.0.0.1:3000`. Build the app with `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000`, and
Settings › About shows "Connected to this PC" when the API answers.

## Roles

| Role           | Used by                             | Can                                                                     |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `garnet_owner` | migrations, seeds, `dev-session`    | everything (owns the tables)                                            |
| `garnet_api`   | the API's connections               | only what `garnet_app` may; never bypasses RLS                          |
| `garnet_app`   | every request, via `set local role` | rows its RLS policies allow; no sessions, accounts or migration history |

## Reset

`docker compose -f infra/docker-compose.yml down -v` deletes the local database completely.
