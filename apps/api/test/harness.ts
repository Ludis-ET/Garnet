import type { PGlite } from "@electric-sql/pglite";
import { DEV_PEOPLE, createDevSession, hashToken, newToken, seedDev } from "@garnet/db";
import { createMigratedDatabase, pgliteClient } from "@garnet/db/testing";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { InjectOptions, LightMyRequestResponse } from "fastify";
import { Kysely, PostgresDialect, type PostgresPool } from "kysely";
import { createApp } from "../src/app";
import type { Database } from "../src/db/database";
import { pglitePool } from "./pglite-pool";

export const STRANGER = {
  id: "0192f0a0-0000-7000-8000-00000000c001",
  relationshipId: "0192f0a0-0000-7000-8000-00000000c101",
};

export interface TestApi {
  db: PGlite;
  /** Session tokens: the two partners, someone in another relationship, and dead ones. */
  tokens: { selam: string; noah: string; stranger: string; revoked: string; expired: string };
  /** "METHOD /pattern" for every route the API registered. */
  routes: string[];
  /** Every log line the API wrote, parsed. */
  logs: Record<string, unknown>[];
  inject(options: InjectOptions): Promise<LightMyRequestResponse>;
  close(): Promise<void>;
}

/** A pool whose every connection fails, as when the database is down. */
const deadPool: PostgresPool = {
  connect: () => Promise.reject(new Error("connect ECONNREFUSED")),
  end: () => Promise.resolve(),
  options: {},
};

/** The real API on a fresh, migrated, seeded PGlite: two partners and one stranger. */
export async function startTestApi(options: { databaseDown?: boolean } = {}): Promise<TestApi> {
  const db = await createMigratedDatabase();
  const sql = pgliteClient(db);
  await seedDev(sql);
  await sql.query("insert into app_user (id, email, password_hash) values ($1, $2, '!')", [
    STRANGER.id,
    "stranger@example.test",
  ]);
  await sql.query("insert into relationship (id) values ($1)", [STRANGER.relationshipId]);
  await sql.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
    STRANGER.relationshipId,
    STRANGER.id,
  ]);
  const stranger = newToken();
  await sql.query(
    `insert into session (id, user_id, token_hash, expires_at)
     values (gen_random_uuid(), $1, $2, now() + interval '1 day')`,
    [STRANGER.id, hashToken(stranger)],
  );
  const selam = await createDevSession(sql, "selam");
  const noah = await createDevSession(sql, "noah");
  const revoked = await createDevSession(sql, "selam");
  await sql.query("update session set revoked_at = now() where id = $1", [revoked.sessionId]);
  const expired = await createDevSession(sql, "selam");
  await sql.query(
    `update session set created_at = now() - interval '2 days',
                        expires_at = now() - interval '1 day' where id = $1`,
    [expired.sessionId],
  );

  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: options.databaseDown === true ? deadPool : pglitePool(db),
    }),
  });
  const logs: Record<string, unknown>[] = [];
  const routes: string[] = [];
  const app: NestFastifyApplication = await createApp({
    db: kysely,
    logLevel: "info",
    logStream: {
      write: (line: string) => {
        logs.push(JSON.parse(line) as Record<string, unknown>);
      },
    },
    beforeRoutes: (fastify) => {
      fastify.addHook("onRoute", (route) => {
        for (const method of [route.method].flat()) routes.push(`${method} ${route.url}`);
      });
    },
  });
  const fastify = app.getHttpAdapter().getInstance();
  return {
    db,
    tokens: {
      selam: selam.token,
      noah: noah.token,
      stranger,
      revoked: revoked.token,
      expired: expired.token,
    },
    routes,
    logs,
    inject: (o) => fastify.inject(o),
    close: async () => {
      await app.close();
      await kysely.destroy();
      await db.close();
    },
  };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export { DEV_PEOPLE };
