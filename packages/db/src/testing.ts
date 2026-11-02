import { PGlite, type Transaction } from "@electric-sql/pglite";
import { loadMigrations, migrate, MIGRATIONS_DIR, type SqlClient } from "./migrate.ts";

/**
 * Test helpers: a fresh, isolated PostgreSQL 17 (PGlite, in-process) with every migration
 * applied exactly as the runner applies them in production. No Docker needed.
 */
export function pgliteClient(db: PGlite | Transaction): SqlClient {
  return {
    query: async (sql: string, params?: unknown[]) => {
      const r = await db.query<Record<string, unknown>>(sql, params);
      return { rows: r.rows };
    },
    exec: async (sql: string) => {
      await db.exec(sql);
    },
  };
}

export async function createMigratedDatabase(): Promise<PGlite> {
  const db = await PGlite.create();
  await migrate(pgliteClient(db), loadMigrations(MIGRATIONS_DIR));
  return db;
}

/**
 * Runs `fn` the way the API runs a request: in a transaction, as garnet_app, with the user bound
 * to the transaction, so row-level security applies.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('app.user_id', $1, true)", [userId]);
    await tx.exec("set local role garnet_app");
    return fn(tx);
  });
}
