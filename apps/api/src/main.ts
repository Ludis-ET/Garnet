import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { createApp } from "./app";
import { createAuth } from "./auth/auth";
import { createMailer } from "./auth/mailer";
import { readConfig } from "./config";
import type { Database } from "./db/database";

// Starts the API (local only until U-07): `pnpm --filter @garnet/api dev`, settings from
// apps/api/.env (see .env.example and infra/README.md).
async function startApi(): Promise<void> {
  const config = readConfig(process.env);

  // One pool, as the API's own role: requests switch to garnet_app (RLS); Better Auth's queries
  // use garnet_auth's rights on its own tables.
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    application_name: "garnet-api",
    max: 10,
    // No request holds the database for long; a stuck query fails instead of piling up.
    statement_timeout: 10_000,
    idleTimeoutMillis: 30_000,
  });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  // Better Auth logs through the API's logger once it exists: a level and a fixed event only.
  let log: (level: "error" | "warn" | "info" | "debug", event: string) => void = () => undefined;
  const auth = createAuth({
    database: pool,
    secret: config.auth.secret,
    baseUrl: config.auth.baseUrl,
    policy: config.auth.policy,
    mailer: createMailer(config.mail.smtpUrl, config.mail.from),
    social: config.auth.social,
    log: (level, event) => {
      log(level, event);
    },
  });

  const app = await createApp({
    db,
    auth,
    policy: config.auth.policy,
    social: config.auth.social,
    logLevel: config.logLevel,
  });
  const logger = app.getHttpAdapter().getInstance().log;
  log = (level, event) => {
    logger[level]({ code: event }, "auth event");
  };
  await app.listen(config.port, config.host);

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await app.close();
    await db.destroy();
  };
  process.once("SIGINT", () => void close());
  process.once("SIGTERM", () => void close());
}

void startApi().catch((err: unknown) => {
  process.stderr.write(
    `Fatal error during server startup: ${String(err instanceof Error ? (err.stack ?? err.message) : err)}\n`,
  );
  process.exit(1);
});
