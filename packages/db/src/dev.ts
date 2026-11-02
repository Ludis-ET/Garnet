import { randomUUID } from "node:crypto";
import type { SqlClient } from "./migrate.ts";
import { hashToken, newToken } from "./tokens.ts";

/**
 * Local development only (P-76, phase B0): two fictional people in one relationship,
 * and a way to give one of them a session before sign-in exists (B1). Nothing here is reachable
 * through the API; the CLI refuses any database that isn't on this machine.
 */
export const DEV_PEOPLE = {
  selam: { id: "0192f0a0-0000-7000-8000-00000000a001", email: "selam@example.test" },
  noah: { id: "0192f0a0-0000-7000-8000-00000000a002", email: "noah@example.test" },
} as const;
export type DevPerson = keyof typeof DEV_PEOPLE;

export const DEV_RELATIONSHIP_ID = "0192f0a0-0000-7000-8000-00000000b001";

/** A password hash no password can match (sign-in arrives in B1). */
const NO_PASSWORD = "!dev-seed-no-password";

/** Adds the two people and their relationship if they aren't there. Safe to run again. */
export async function seedDev(db: SqlClient): Promise<void> {
  for (const p of Object.values(DEV_PEOPLE)) {
    await db.query(
      `insert into app_user (id, email, password_hash, email_verified_at)
       values ($1, $2, $3, now()) on conflict (id) do nothing`,
      [p.id, p.email, NO_PASSWORD],
    );
  }
  await db.query("insert into relationship (id) values ($1) on conflict (id) do nothing", [
    DEV_RELATIONSHIP_ID,
  ]);
  // Checked first: the two-partner trigger fires before any ON CONFLICT would.
  for (const p of Object.values(DEV_PEOPLE)) {
    await db.query(
      `insert into relationship_member (relationship_id, user_id)
       select $1::uuid, $2::uuid
       where not exists (
         select 1 from relationship_member where relationship_id = $1::uuid and user_id = $2::uuid
       )`,
      [DEV_RELATIONSHIP_ID, p.id],
    );
  }
}

/** A new session for one of the seeded people; returns the token, which is never stored. */
export async function createDevSession(
  db: SqlClient,
  person: DevPerson,
  days = 30,
): Promise<{ token: string; sessionId: string }> {
  const token = newToken();
  const sessionId = randomUUID();
  await db.query(
    `insert into session (id, user_id, token_hash, expires_at)
     values ($1, $2, $3, now() + make_interval(days => $4))`,
    [sessionId, DEV_PEOPLE[person].id, hashToken(token), days],
  );
  return { token, sessionId };
}

/** True only for a database on this machine. */
export function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}
