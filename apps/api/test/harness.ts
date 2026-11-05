import type { PGlite } from "@electric-sql/pglite";
import { TERMS_VERSION } from "@garnet/contracts";
import { DEV_PEOPLE, seedDev } from "@garnet/db";
import { createMigratedDatabase, pgliteClient } from "@garnet/db/testing";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { InjectOptions, LightMyRequestResponse } from "fastify";
import { Kysely, PostgresDialect, type PostgresPool } from "kysely";
import { createApp } from "../src/app";
import { createAuth, type Auth } from "../src/auth/auth";
import { CLIENT_HEADER } from "../src/auth/client-header";
import type { Mailer } from "../src/auth/mailer";
import { hashPassword } from "../src/auth/password";
import type { AuthPolicy, SocialConfig } from "../src/config";
import type { Database } from "../src/db/database";
import { pglitePool } from "./pglite-pool";

export const STRANGER = {
  id: "0192f0a0-0000-7000-8000-00000000c001",
  email: "stranger@example.test",
  name: "Sam",
  relationshipId: "0192f0a0-0000-7000-8000-00000000c101",
};

/** Every seeded person's password (long, and not on the blocklist). */
export const PASSWORD = "correct horse battery staple";

/** What every email sign-up gives (P-79): an adult's birthday and the current terms. */
export const REGISTRATION = { birthDate: "2000-01-15", termsVersion: TERMS_VERSION } as const;

/** Better Auth's session cookie. */
export const SESSION_COOKIE = "better-auth.session_token";

/**
 * Test values: the P-78 choices, except a high per-address limit so a test file's many sign-ins
 * never meet it (tests that check the limit pass their own).
 */
export const TEST_POLICY: AuthPolicy = {
  passwordMinLength: 15,
  sessionDays: 30,
  sessionMaxDays: 90,
  sessionRefreshHours: 24,
  rateWindowSeconds: 60,
  rateMax: 100,
  verifyTokenMinutes: 1440,
  resetTokenMinutes: 30,
  inviteTtlHours: 24,
};

/** An email the API sent, with the link token it carried. */
export interface SentMail {
  kind: "verify" | "reset" | "exists" | "change";
  to: string;
  token: string | null;
}

export interface TestApi {
  db: PGlite;
  auth: Auth;
  /** Session cookies: the two partners, someone in another relationship, and dead ones. */
  cookies: { selam: string; noah: string; stranger: string; revoked: string; expired: string };
  /** Every email the API sent, oldest first. */
  mail: SentMail[];
  /** "METHOD /pattern" for every route the API registered. */
  routes: string[];
  /** Every log line the API wrote, parsed. */
  logs: Record<string, unknown>[];
  inject(options: InjectOptions): Promise<LightMyRequestResponse>;
  /** A request as the app sends it: the app header, its origin, JSON, and a session cookie. */
  call(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    options?: {
      cookie?: string;
      body?: unknown;
      headers?: Record<string, string>;
      /** The address the request comes from (127.0.0.1 by default). */
      remoteAddress?: string;
    },
  ): Promise<LightMyRequestResponse>;
  /** Signs in through the API; the session cookie, or throws. */
  signIn(email: string, password?: string): Promise<string>;
  /** Signs up and verifies a new person through the API; their email and session cookie. */
  newAccount(name: string): Promise<{ email: string; cookie: string; id: string }>;
  close(): Promise<void>;
}

/** A pool whose every connection fails, as when the database is down. */
const deadPool: PostgresPool = {
  connect: () => Promise.reject(new Error("connect ECONNREFUSED")),
  end: () => Promise.resolve(),
  options: {},
};

/** The session cookie from a response's Set-Cookie headers ("name=value"), or null. */
export function sessionCookieOf(res: LightMyRequestResponse): string | null {
  for (const c of [res.headers["set-cookie"] ?? []].flat()) {
    const pair = c.split(";")[0] ?? "";
    if (pair.startsWith(`${SESSION_COOKIE}=`) && pair.length > SESSION_COOKIE.length + 1)
      return pair;
  }
  return null;
}

/** The raw session token inside a cookie (the part before Better Auth's signature). */
export function tokenOf(cookie: string): string {
  return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)).split(".")[0] ?? "";
}

let accounts = 0;

/** The real API on a fresh, migrated, seeded PGlite: two partners and one stranger. */
export async function startTestApi(
  options: { databaseDown?: boolean; policy?: Partial<AuthPolicy>; social?: SocialConfig } = {},
): Promise<TestApi> {
  const policy: AuthPolicy = { ...TEST_POLICY, ...options.policy };
  const db = await createMigratedDatabase();
  const sql = pgliteClient(db);
  await seedDev(sql);
  await sql.query(
    `insert into app_user (id, email, name, email_verified, birth_date, terms_version,
                           terms_accepted_at)
     values ($1, $2, $3, true, '2001-06-30', $4, now())`,
    [STRANGER.id, STRANGER.email, STRANGER.name, TERMS_VERSION],
  );
  await sql.query("insert into relationship (id) values ($1)", [STRANGER.relationshipId]);
  await sql.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
    STRANGER.relationshipId,
    STRANGER.id,
  ]);
  // Password accounts the way Better Auth keeps them ("credential", Argon2id).
  const hash = await hashPassword(PASSWORD);
  for (const id of [DEV_PEOPLE.selam.id, DEV_PEOPLE.noah.id, STRANGER.id]) {
    await sql.query(
      `insert into account (user_id, account_id, provider_id, password)
       values ($1::uuid, $1::text, 'credential', $2)`,
      [id, hash],
    );
  }

  const mail: SentMail[] = [];
  const mailer: Mailer = {
    verifyEmail: (to, _name, token) => {
      mail.push({ kind: "verify", to, token });
      return Promise.resolve();
    },
    resetPassword: (to, token) => {
      mail.push({ kind: "reset", to, token });
      return Promise.resolve();
    },
    existingAccount: (to) => {
      mail.push({ kind: "exists", to, token: null });
      return Promise.resolve();
    },
    confirmEmailChange: (to, _newEmail, token) => {
      mail.push({ kind: "change", to, token });
      return Promise.resolve();
    },
  };

  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: options.databaseDown === true ? deadPool : pglitePool(db),
    }),
  });
  const logs: Record<string, unknown>[] = [];
  const routes: string[] = [];
  const auth = createAuth({
    database: { dialect: new PostgresDialect({ pool: pglitePool(db) }), type: "postgres" },
    secret: "test-secret-test-secret-test-secret-00",
    baseUrl: "http://127.0.0.1:3000",
    policy,
    mailer,
    log: () => undefined,
    ...(options.social === undefined ? {} : { social: options.social }),
  });
  const app: NestFastifyApplication = await createApp({
    db: kysely,
    auth,
    policy,
    ...(options.social === undefined ? {} : { social: options.social }),
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
  const inject = (o: InjectOptions) => fastify.inject(o);

  const call: TestApi["call"] = (method, url, o = {}) =>
    inject({
      method,
      url,
      headers: {
        [CLIENT_HEADER.name]: CLIENT_HEADER.value,
        "expo-origin": "garnet://",
        ...(o.body === undefined ? {} : { "content-type": "application/json" }),
        ...(o.cookie === undefined ? {} : { cookie: o.cookie }),
        ...o.headers,
      },
      ...(o.body === undefined ? {} : { payload: JSON.stringify(o.body) }),
      ...(o.remoteAddress === undefined ? {} : { remoteAddress: o.remoteAddress }),
    });

  const signIn = async (email: string, password = PASSWORD) => {
    const res = await call("POST", "/v1/auth/sign-in/email", { body: { email, password } });
    const cookie = sessionCookieOf(res);
    if (res.statusCode !== 200 || cookie === null)
      throw new Error(`sign-in failed: ${String(res.statusCode)}`);
    return cookie;
  };

  const newAccount = async (name: string) => {
    accounts += 1;
    const email = `${name.toLowerCase()}.${String(accounts)}@example.test`;
    const up = await call("POST", "/v1/auth/sign-up/email", {
      body: { name, email, password: PASSWORD, ...REGISTRATION },
    });
    if (up.statusCode !== 200) throw new Error(`sign-up failed: ${String(up.statusCode)}`);
    const token = mail.findLast((m) => m.kind === "verify" && m.to === email)?.token ?? "";
    const verified = await call("GET", `/v1/auth/verify-email?token=${encodeURIComponent(token)}`);
    const cookie = sessionCookieOf(verified);
    if (cookie === null) throw new Error(`verification failed: ${String(verified.statusCode)}`);
    const row = await db.query<{ id: string }>("select id from app_user where email = $1", [email]);
    return { email, cookie, id: row.rows[0]?.id ?? "" };
  };

  const selam = await signIn(DEV_PEOPLE.selam.email);
  const noah = await signIn(DEV_PEOPLE.noah.email);
  const stranger = await signIn(STRANGER.email);
  const revoked = await signIn(DEV_PEOPLE.selam.email);
  await call("POST", "/v1/auth/sign-out", { cookie: revoked, body: {} });
  const expired = await signIn(DEV_PEOPLE.selam.email);
  await db.query("update session set expires_at = now() - interval '1 minute' where token = $1", [
    tokenOf(expired),
  ]);

  return {
    db,
    auth,
    cookies: { selam, noah, stranger, revoked, expired },
    mail,
    routes,
    logs,
    inject,
    call,
    signIn,
    newAccount,
    close: async () => {
      await app.close();
      await kysely.destroy();
      await db.close();
    },
  };
}

export { DEV_PEOPLE };
