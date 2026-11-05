import { sql, type Kysely, type Transaction } from "kysely";

/**
 * The tables the API reads, as Kysely types. Only what the code uses is described; each phase
 * adds its own. The source of truth is packages/db/migrations.
 */
export interface Database {
  user_settings: {
    user_id: string;
    schema_version: number;
    doc: unknown;
    updated_at: Date;
  };
  relationship_member: {
    relationship_id: string;
    user_id: string;
    joined_at: Date;
    left_at: Date | null;
  };
  profile: {
    user_id: string;
    display_name: string;
    nickname: string;
    side: "ruby" | "sapphire" | null;
    avatar: unknown;
    time_zone: string | null;
    home_city: string | null;
    appearance: "system" | "light" | "dark";
    accent: "subtle" | "rich";
    notifications: unknown;
    done: string[];
    complete: boolean;
    updated_at: Date;
  };
}

/** The Nest injection token for the shared Kysely instance. */
export const KYSELY = Symbol("kysely");

/** Who a request is for, from the session only (ADR-0004). */
export interface Viewer {
  userId: string;
  sessionId: string;
  /** The account's name (Better Auth's user.name): the first display name in setup. */
  name: string;
}

/** The Nest injection tokens for Better Auth and the auth policy (B1). */
export const AUTH = Symbol("auth");
export const POLICY = Symbol("policy");
/** Google and Apple sign-in, when configured (P-79). */
export const SOCIAL = Symbol("social");

/**
 * Runs `fn` the way every authenticated request touches data (ADR-0004): one transaction, as the
 * unprivileged garnet_app role, with the viewer bound to it, so row-level security applies on top
 * of the API's own checks. The user id is a bound parameter, never spliced into SQL.
 */
export function asViewer<T>(
  db: Kysely<Database>,
  viewer: Viewer,
  fn: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.user_id', ${viewer.userId}, true)`.execute(trx);
    await sql`set local role garnet_app`.execute(trx);
    return fn(trx);
  });
}
