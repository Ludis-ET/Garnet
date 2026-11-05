// Local development only (B1, P-76): two paired test people with real accounts, so the app can
// sign in against this PC. Runs as the database owner and refuses any database that isn't on
// this machine. Usage (from apps/api, with .env filled in):
//   GARNET_DATABASE_OWNER_URL=postgres://garnet_owner:…@127.0.0.1:55432/garnet \
//   GARNET_SEED_PASSWORD='a local password' pnpm seed
import { TERMS_VERSION } from "@garnet/contracts";
import { isLocalDatabase } from "@garnet/db";
import pg from "pg";
import { createAuth } from "../auth/auth";
import type { Mailer } from "../auth/mailer";
import { readConfig } from "../config";

const say = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

const PEOPLE = [
  {
    name: "Selam",
    email: "selam@example.test",
    side: "ruby",
    zone: "Africa/Addis_Ababa",
    city: "Addis Ababa",
    birthDate: "1998-03-12",
  },
  {
    name: "Noah",
    email: "noah@example.test",
    side: "sapphire",
    zone: "Europe/London",
    city: "London",
    birthDate: "1997-09-03",
  },
] as const;
const STEPS = ["name", "side", "photo", "time", "together", "look", "alerts"];

const ownerUrl = process.env["GARNET_DATABASE_OWNER_URL"] ?? "";
const password = process.env["GARNET_SEED_PASSWORD"] ?? "";
if (!isLocalDatabase(ownerUrl))
  fail("Set GARNET_DATABASE_OWNER_URL to a database on this machine.");
const config = readConfig(process.env);
if (password.length < config.auth.policy.passwordMinLength)
  fail(
    `Set GARNET_SEED_PASSWORD (at least ${String(config.auth.policy.passwordMinLength)} characters).`,
  );

/** The seed sends no email. */
const quiet: Mailer = {
  verifyEmail: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(),
  existingAccount: () => Promise.resolve(),
  confirmEmailChange: () => Promise.resolve(),
};

const pool = new pg.Pool({ connectionString: ownerUrl });
const auth = createAuth({
  database: pool,
  secret: config.auth.secret,
  baseUrl: config.auth.baseUrl,
  policy: config.auth.policy,
  mailer: quiet,
  log: () => undefined,
});

try {
  for (const p of PEOPLE) {
    // Signing up twice answers the same and changes nothing (enumeration-safe), so this is
    // safe to run again.
    await auth.api.signUpEmail({
      body: {
        name: p.name,
        email: p.email,
        password,
        birthDate: p.birthDate,
        termsVersion: TERMS_VERSION,
      },
    });
  }
  const ids = new Map<string, string>();
  for (const p of PEOPLE) {
    const r = await pool.query<{ id: string }>(
      "update app_user set email_verified = true where email = $1 returning id",
      [p.email],
    );
    const id = r.rows[0]?.id;
    if (id === undefined) fail(`Could not create ${p.email}.`);
    ids.set(p.email, id ?? "");
    await pool.query(
      `insert into profile (user_id, display_name, side, time_zone, home_city, done, complete)
       values ($1, $2, $3, $4, $5, $6, true) on conflict (user_id) do nothing`,
      [id, p.name, p.side, p.zone, p.city, STEPS],
    );
  }
  const [a, b] = PEOPLE.map((p) => ids.get(p.email) ?? "");
  const paired = await pool.query(
    "select 1 from relationship_member where user_id = any($1::uuid[]) and left_at is null",
    [[a, b]],
  );
  if (paired.rowCount === 0) {
    const rel = await pool.query<{ id: string }>(
      "insert into relationship (id) values (gen_random_uuid()) returning id",
    );
    for (const id of [a, b])
      await pool.query(
        "insert into relationship_member (relationship_id, user_id) values ($1, $2)",
        [rel.rows[0]?.id, id],
      );
  }
  say("Seeded selam@example.test and noah@example.test: verified, set up and paired.");
} finally {
  await pool.end();
}
