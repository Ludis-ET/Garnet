// The database command line (B-13, P-76). Runs on Node 24 directly (type stripping):
//   node src/cli.ts migrate                 apply pending migrations
//   node src/cli.ts seed                    add the two local test people (local databases only)
//   node src/cli.ts dev-session [selam|noah] print a session token (local databases only)
// The connection comes from GARNET_DATABASE_OWNER_URL: the owner role that runs migrations.
import pg from "pg";
import { createDevSession, DEV_PEOPLE, isLocalDatabase, seedDev, type DevPerson } from "./dev.ts";
import { loadMigrations, migrate, MIGRATIONS_DIR, type SqlClient } from "./migrate.ts";

const say = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

const [command = "", arg] = process.argv.slice(2);
const url = process.env["GARNET_DATABASE_OWNER_URL"];
if (url === undefined || url === "") fail("Set GARNET_DATABASE_OWNER_URL (see infra/README.md).");
const ownerUrl = url ?? "";

const client = new pg.Client({ connectionString: ownerUrl });
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
    case "seed": {
      if (!isLocalDatabase(ownerUrl)) fail("seed only runs against a database on this machine.");
      await seedDev(db);
      say("Seeded selam@example.test and noah@example.test, paired.");
      return;
    }
    case "dev-session": {
      if (!isLocalDatabase(ownerUrl))
        fail("dev-session only runs against a database on this machine.");
      const person = (arg ?? "selam") as DevPerson;
      if (!(person in DEV_PEOPLE)) fail(`Unknown person "${person}". Use selam or noah.`);
      const { token } = await createDevSession(db, person);
      // The token only: pipe it where it's needed. It is never stored, only its hash.
      say(token);
      return;
    }
    default:
      fail("Usage: node src/cli.ts <migrate | seed | dev-session [selam|noah]>");
  }
}

await client.connect();
try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : "Failed.");
} finally {
  await client.end();
}
