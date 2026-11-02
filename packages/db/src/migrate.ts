import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The migration runner (B-13, P-76): plain `.sql` files applied in order, each in its own
 * transaction, recorded with a checksum in `garnet_meta.schema_migration` (a schema garnet_app
 * can't see). An applied migration that changed or disappeared stops the run: migrations are
 * append-only. An advisory lock keeps two runners from racing.
 */

/** The little the runner needs from a connection (works with `pg` and with PGlite in tests). */
export interface SqlClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  /** Runs one or more statements without parameters. */
  exec(sql: string): Promise<void>;
}

export interface Migration {
  /** Four digits, e.g. "0001": the order. */
  version: string;
  /** From the file name, e.g. "initial". */
  name: string;
  sql: string;
  /** SHA-256 of the SQL with line endings normalised, so a Windows checkout matches. */
  checksum: string;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationError";
  }
}

const FILE = /^(\d{4})_([a-z0-9_]+)\.sql$/;
/** Arbitrary but fixed: the advisory lock every runner takes. */
const LOCK_KEY = 4_216_017;

export function checksumOf(sql: string): string {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/** Reads `NNNN_name.sql` files from a folder, in order. Anything else there is an error. */
export function loadMigrations(dir: string): Migration[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const out: Migration[] = [];
  for (const file of files.sort()) {
    const m = FILE.exec(file);
    if (m === null) throw new MigrationError(`Not a migration file name: ${file}`);
    const [, version = "", name = ""] = m;
    if (out.some((x) => x.version === version))
      throw new MigrationError(`Two migrations share version ${version}`);
    const sql = readFileSync(join(dir, file), "utf8");
    out.push({ version, name, sql, checksum: checksumOf(sql) });
  }
  return out;
}

/** This package's migrations folder. */
export const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

export interface MigrateResult {
  applied: string[];
  alreadyApplied: string[];
}

/** Applies every pending migration, after checking that the applied ones are unchanged. */
export async function migrate(
  db: SqlClient,
  migrations: readonly Migration[],
  log: (line: string) => void = () => undefined,
): Promise<MigrateResult> {
  await db.exec(`
    create schema if not exists garnet_meta;
    revoke all on schema garnet_meta from public;
    create table if not exists garnet_meta.schema_migration (
      version    text primary key,
      name       text not null,
      checksum   text not null,
      applied_at timestamptz not null default now()
    );`);
  await db.query("select pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    const rows = (
      await db.query("select version, checksum from garnet_meta.schema_migration order by version")
    ).rows.map((r) => ({ version: String(r["version"]), checksum: String(r["checksum"]) }));
    for (const row of rows) {
      const file = migrations.find((m) => m.version === row.version);
      if (file === undefined)
        throw new MigrationError(`Migration ${row.version} is applied but its file is missing`);
      if (file.checksum !== row.checksum)
        throw new MigrationError(
          `Migration ${row.version} was changed after it was applied; add a new migration instead`,
        );
    }
    const done = new Set(rows.map((r) => r.version));
    const applied: string[] = [];
    for (const m of migrations) {
      if (done.has(m.version)) continue;
      await db.exec("begin");
      try {
        await db.exec(m.sql);
        await db.query(
          "insert into garnet_meta.schema_migration (version, name, checksum) values ($1, $2, $3)",
          [m.version, m.name, m.checksum],
        );
        await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw new MigrationError(
          `Migration ${m.version}_${m.name} failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
      applied.push(m.version);
      log(`applied ${m.version}_${m.name}`);
    }
    return { applied, alreadyApplied: [...done] };
  } finally {
    await db.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
  }
}
