// The database command line (B-13, P-76). Runs on Node 24 directly (type stripping):
//   node src/cli.ts migrate      apply pending migrations
// The connection comes from GARNET_DATABASE_OWNER_URL: the owner role that runs migrations.
// Local test people are seeded by the API (`pnpm --filter @garnet/api seed`), through Better
// Auth, so their passwords are hashed exactly as sign-up hashes them (B1).
import pg from "pg";
import { loadMigrations, migrate, MIGRATIONS_DIR, type SqlClient } from "./migrate.ts";

const say = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

const [command = ""] = process.argv.slice(2);
const url =
  process.env["GARNET_DATABASE_OWNER_URL"] ??
  process.env["DATABASE_URL"] ??
  process.env["GARNET_API_DATABASE_URL"];
if (url === undefined || url === "")
  fail("Set GARNET_DATABASE_OWNER_URL, DATABASE_URL, or GARNET_API_DATABASE_URL.");

const client = new pg.Client({ connectionString: url ?? "" });
const db: SqlClient = {
  query: async (sql: string, params?: unknown[]) => {
    const r = await client.query<Record<string, unknown>>(sql, params);
    return { rows: r.rows };
  },
  exec: async (sql: string) => {
    await client.query(sql);
  },
};

async function main(): Promise<void> {
  switch (command) {
    case "migrate": {
      const { applied } = await migrate(db, loadMigrations(MIGRATIONS_DIR), say);
      say(applied.length === 0 ? "Up to date." : `Applied ${String(applied.length)}.`);
      return;
    }
    default:
      fail("Usage: node src/cli.ts migrate");
  }
}

async function run(): Promise<void> {
  await client.connect();
  try {
    await main();
  } catch (error) {
    fail(error instanceof Error ? error.message : "Failed.");
  } finally {
    await client.end();
  }
}

void run();
