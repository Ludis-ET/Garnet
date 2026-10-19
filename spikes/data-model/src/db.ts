import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const SCHEMA = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

/** A fresh, isolated Postgres with the draft schema applied. */
export async function createDatabase(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(SCHEMA);
  return db;
}

/**
 * Runs `fn` exactly as the API would for an authenticated request: inside a transaction, as the
 * unprivileged garnet_app role, with the user (and optional mutation id) bound to the
 * transaction. Everything is subject to row-level security.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
  mutationId?: string,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('app.user_id', $1, true)", [userId]);
    if (mutationId !== undefined) {
      await tx.query("select set_config('app.mutation_id', $1, true)", [mutationId]);
    }
    await tx.exec("set local role garnet_app");
    return fn(tx);
  });
}

/** Deterministic UUID-shaped ids for readable tests (production uses UUIDv7). */
export function uuid(n: number): string {
  return `00000000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}
