import { existsSync, readFileSync } from "node:fs";
import { URL } from "node:url";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { createApp } from "./app";
import { createAuth } from "./auth/auth";
import { createMailOutbox } from "./mail/outbox";
import { createSmtpSender } from "./mail/smtp";
import { renderMail } from "./mail/templates";
import { createMailWorker, createQueuedMailer, type MailLog } from "./mail/worker";
import { readConfig } from "./config";
import type { Database } from "./db/database";
import { InMemoryObjectStorage, S3ObjectStorage } from "./media/storage/object-storage";

function loadEnv(): void {
  const envPath = new URL("./.env", import.meta.url);
  if (!existsSync(envPath)) return;
  try {
    if (
      typeof (process as unknown as { loadEnvFile?: (path: URL) => void }).loadEnvFile ===
      "function"
    ) {
      (process as unknown as { loadEnvFile: (path: URL) => void }).loadEnvFile(envPath);
      return;
    }
  } catch {
    // Fall back to manual parsing
  }
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore error
  }
}

// Starts the API (local only until U-07): `pnpm --filter @garnet/api dev`, settings from
// apps/api/.env (see .env.example and infra/README.md).
async function startApi(): Promise<void> {
  if (!process.env["GARNET_API_DATABASE_URL"]) {
    loadEnv();
  }
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

  // Account emails (P-96): written to the outbox when asked for, sent and retried by the worker.
  // Until the logger exists, mail events go to stderr (an event and a code, never an address).
  let mailLog: MailLog = (level, event, detail) => {
    process.stderr.write(`${level} ${event} ${JSON.stringify(detail)}
`);
  };
  const mailSender = createSmtpSender(config.mail.smtpUrl, config.mail.from);
  const mailOutbox = createMailOutbox(db);
  const mailWorker = createMailWorker({
    outbox: mailOutbox,
    sender: mailSender,
    render: (job) => renderMail(job, config.auth.baseUrl),
    log: (level, event, detail) => {
      mailLog(level, event, detail);
    },
  });
  const auth = createAuth({
    database: pool,
    secret: config.auth.secret,
    baseUrl: config.auth.baseUrl,
    policy: config.auth.policy,
    mailer: createQueuedMailer(mailOutbox, mailWorker),
    social: config.auth.social,
    log: (level, event) => {
      log(level, event);
    },
  });

  const objectStorage = config.storage
    ? new S3ObjectStorage({
        endpoint: config.storage.endpoint,
        region: config.storage.region,
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      })
    : new InMemoryObjectStorage();

  const app = await createApp({
    db,
    auth,
    objectStorage,
    policy: config.auth.policy,
    social: config.auth.social,
    logLevel: config.logLevel,
  });
  const logger = app.getHttpAdapter().getInstance().log;
  log = (level, event) => {
    logger[level]({ code: event }, "auth event");
  };
  mailLog = (level, event, detail) => {
    logger[level]({ code: event, ...detail }, "mail");
  };
  await app.listen(config.port, config.host);

  // Sends whatever waited while the API was stopped, then keeps watching. Whether the mail
  // server accepts our login is checked once now, so a wrong password shows up in the log at
  // start instead of as a missing email.
  mailWorker.start();
  void mailSender.verify().then((error) => {
    if (error === null) logger.info({ code: "mail_transport_ok" }, "mail");
    else logger.error({ code: "mail_transport_failed", error: error.code }, "mail");
  });

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await mailWorker.stop();
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
