import type { SqlClient } from "./migrate.ts";

/**
 * Test helpers (B0, B1): two fictional people in one relationship, written straight into a
 * database. Accounts for local use are created by the API's seed through Better Auth instead,
 * so passwords are hashed the way sign-up hashes them; these people have no password.
 */
export const DEV_PEOPLE = {
  selam: {
    id: "0192f0a0-0000-7000-8000-00000000a001",
    email: "selam@example.test",
    name: "Selam",
    birthDate: "1998-03-12",
  },
  noah: {
    id: "0192f0a0-0000-7000-8000-00000000a002",
    email: "noah@example.test",
    name: "Noah",
    birthDate: "1997-09-03",
  },
} as const;

/** The terms version the seeded people accepted (P-79; the API's TERMS_VERSION). */
export const DEV_TERMS_VERSION = "2026-11-04";
export type DevPerson = keyof typeof DEV_PEOPLE;

export const DEV_RELATIONSHIP_ID = "0192f0a0-0000-7000-8000-00000000b001";

/** Adds the two people, their profiles and their relationship if missing. Safe to run again. */
export async function seedDev(db: SqlClient): Promise<void> {
  for (const p of Object.values(DEV_PEOPLE)) {
    await db.query(
      `insert into app_user (id, email, name, email_verified, birth_date, terms_version,
                             terms_accepted_at)
       values ($1, $2, $3, true, $4, $5, now()) on conflict (id) do nothing`,
      [p.id, p.email, p.name, p.birthDate, DEV_TERMS_VERSION],
    );
    await db.query(
      `insert into profile (user_id, display_name) values ($1, $2)
       on conflict (user_id) do nothing`,
      [p.id, p.name],
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

/** True only for a database on this machine. */
export function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}
