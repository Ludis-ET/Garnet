import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { createApp } from "./app";
import { readConfig } from "./config";
import type { Database } from "./db/database";

// Starts the API (local only until U-07): `pnpm --filter @garnet/api dev`.
const config = readConfig(process.env);

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  application_name: "garnet-api",
  max: 10,
  // No request holds the database for long; a stuck query fails instead of piling up.
  statement_timeout: 10_000,
  idleTimeoutMillis: 30_000,
});
const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

const app = await createApp({ db, logLevel: config.logLevel });
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
