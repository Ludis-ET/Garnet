import type { PGlite, Transaction } from "@electric-sql/pglite";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEV_PEOPLE, DEV_RELATIONSHIP_ID, isLocalDatabase, seedDev } from "./dev.ts";
import {
  adaptSqlForSingleRole,
  checksumOf,
  loadMigrations,
  migrate,
  MigrationError,
  MIGRATIONS_DIR,
  type Migration,
} from "./migrate.ts";
import { asUser, createMigratedDatabase, pgliteClient } from "./testing.ts";
import { hashToken } from "./tokens.ts";

let db: PGlite;
beforeEach(async () => {
  db = await createMigratedDatabase();
}, 60_000);
afterEach(async () => {
  await db.close();
});

const VERSIONS = [
  "0001",
  "0002",
  "0003",
  "0004",
  "0005",
  "0006",
  "0007",
  "0008",
  "0009",
  "0010",
  "0011",
  "0012",
  "0013",
];

const STRANGER = "0192f0a0-0000-7000-8000-00000000c001";
const STRANGER_RELATIONSHIP = "0192f0a0-0000-7000-8000-00000000c101";
const LONER = "0192f0a0-0000-7000-8000-00000000d001";

async function addPerson(id: string, email: string, name: string): Promise<void> {
  await db.query(
    "insert into app_user (id, email, name, email_verified) values ($1, $2, $3, true)",
    [id, email, name],
  );
  await db.query("insert into profile (user_id, display_name) values ($1, $2)", [id, name]);
}

async function addStranger(): Promise<void> {
  await addPerson(STRANGER, "stranger@example.test", "Sam");
  await db.query("insert into relationship (id) values ($1)", [STRANGER_RELATIONSHIP]);
  await db.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
    STRANGER_RELATIONSHIP,
    STRANGER,
  ]);
}

/** The first row's only column, as `fn` returns it. */
async function one<T>(user: string, sql: string, params: unknown[] = []): Promise<T> {
  const r = await asUser(db, user, (tx: Transaction) => tx.query<Record<string, T>>(sql, params));
  return Object.values(r.rows[0] ?? {})[0] as T;
}

const sqlStateOf = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
  } catch (error) {
    return String((error as { code?: string }).code);
  }
  return "none";
};

describe("migration runner (B-13)", () => {
  it("applies every migration once, records it, and then has nothing to do", async () => {
    const files = loadMigrations(MIGRATIONS_DIR);
    expect(files.map((m) => m.version)).toEqual(VERSIONS);
    const { rows } = await db.query<{ version: string; checksum: string }>(
      "select version, checksum from garnet_meta.schema_migration order by version",
    );
    expect(rows).toEqual(files.map((f) => ({ version: f.version, checksum: f.checksum })));
    const again = await migrate(pgliteClient(db), files);
    expect(again).toEqual({ applied: [], alreadyApplied: VERSIONS });
  });

  it("refuses a migration that changed after it was applied", async () => {
    const files = loadMigrations(MIGRATIONS_DIR);
    const edited: Migration[] = files.map((m) => ({
      ...m,
      checksum: checksumOf(`${m.sql}\n-- x`),
    }));
    await expect(migrate(pgliteClient(db), edited)).rejects.toThrow(/was changed after/);
  });

  it("refuses to run when an applied migration's file is gone", async () => {
    await expect(migrate(pgliteClient(db), [])).rejects.toThrow(MigrationError);
  });

  it("rolls a failing migration back completely and names it", async () => {
    const files = loadMigrations(MIGRATIONS_DIR);
    const broken: Migration = {
      version: "9999",
      name: "broken",
      sql: "create table half_done (id int); select * from no_such_table;",
      checksum: "x",
    };
    await expect(migrate(pgliteClient(db), [...files, broken])).rejects.toThrow(/9999_broken/);
    const { rows } = await db.query("select to_regclass('public.half_done') as t");
    expect(rows).toEqual([{ t: null }]);
  });

  it("treats Windows and Unix line endings as the same migration", () => {
    expect(checksumOf("select 1;\r\nselect 2;\r\n")).toBe(checksumOf("select 1;\nselect 2;\n"));
  });

  it("only accepts NNNN_name.sql files, each version once", () => {
    const dir = mkdtempSync(join(tmpdir(), "garnet-mig-"));
    writeFileSync(join(dir, "0001_a.sql"), "select 1;");
    writeFileSync(join(dir, "1_b.sql"), "select 1;");
    expect(() => loadMigrations(dir)).toThrow(/Not a migration file name/);
    const dup = mkdtempSync(join(tmpdir(), "garnet-mig-"));
    writeFileSync(join(dup, "0001_a.sql"), "select 1;");
    writeFileSync(join(dup, "0001_b.sql"), "select 1;");
    expect(() => loadMigrations(dup)).toThrow(/share version 0001/);
  });

  it("adapts migration SQL for single-role environments without role statements", () => {
    const raw = `
      do $$ begin if not exists (select from pg_catalog.pg_roles where rolname = 'garnet_app') then create role garnet_app nologin; end if; end $$;
      grant select on all tables in schema public to garnet_app;
      revoke all on app_user from garnet_app;
    `;
    const adapted = adaptSqlForSingleRole(raw);
    expect(adapted).not.toMatch(/create role/i);
    expect(adapted).not.toMatch(/grant select/i);
    expect(adapted).not.toMatch(/revoke all/i);
  });
});

describe("what each role can reach (ADR-0004, P-77)", () => {
  const AUTH_TABLES = ["app_user", "session", "account", "verification", "rate_limit"];

  it("keeps the app role away from accounts, sessions, passwords, email links and invitations", async () => {
    await seedDev(pgliteClient(db));
    for (const table of [...AUTH_TABLES, "invitation", "garnet_meta.schema_migration"]) {
      await expect(
        asUser(db, DEV_PEOPLE.selam.id, (tx) => tx.query(`select * from ${table}`)),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("gives Better Auth's role its own tables and nothing else", async () => {
    await seedDev(pgliteClient(db));
    const asAuth = (sql: string) =>
      db.transaction(async (tx) => {
        await tx.exec("set local role garnet_auth");
        return tx.query(sql);
      });
    for (const table of AUTH_TABLES)
      await expect(asAuth(`select * from ${table}`)).resolves.toBeTruthy();
    for (const table of ["profile", "relationship", "relationship_member", "invitation", "entry"])
      await expect(asAuth(`select * from ${table}`)).rejects.toThrow(/permission denied/);
  });

  it("sees its own relationship, and a stranger sees none of it", async () => {
    await seedDev(pgliteClient(db));
    await addStranger();
    const mine = await asUser(db, DEV_PEOPLE.selam.id, (tx) =>
      tx.query<{ id: string }>("select id from relationship"),
    );
    expect(mine.rows).toEqual([{ id: DEV_RELATIONSHIP_ID }]);
    const theirs = await asUser(db, STRANGER, (tx) =>
      tx.query<{ user_id: string }>("select user_id from relationship_member"),
    );
    expect(theirs.rows).toEqual([{ user_id: STRANGER }]);
  });

  it("lets each person read and change only their own profile, partner included", async () => {
    await seedDev(pgliteClient(db));
    const seen = await asUser(db, DEV_PEOPLE.noah.id, (tx) =>
      tx.query<{ user_id: string }>("select user_id from profile"),
    );
    expect(seen.rows).toEqual([{ user_id: DEV_PEOPLE.noah.id }]);
    await asUser(db, DEV_PEOPLE.noah.id, (tx) =>
      tx.query("update profile set nickname = 'x' where user_id = $1", [DEV_PEOPLE.selam.id]),
    );
    const selam = await db.query<{ nickname: string }>(
      "select nickname from profile where user_id = $1",
      [DEV_PEOPLE.selam.id],
    );
    expect(selam.rows).toEqual([{ nickname: "" }]);
    await expect(
      asUser(db, DEV_PEOPLE.noah.id, (tx) =>
        tx.query("insert into profile (user_id, display_name) values ($1, 'x')", [STRANGER]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("runs every SECURITY DEFINER function with a fixed search_path", async () => {
    const { rows } = await db.query<{ name: string }>(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c
                           where c like 'search_path=%')`,
    );
    expect(rows).toEqual([]);
  });

  it("leaves one way to join a relationship (0003 removed the old one)", async () => {
    const { rows } = await db.query("select 1 from pg_proc where proname = 'accept_invitation'");
    expect(rows).toEqual([]);
  });
});

describe("the partner's view and the side choice (P-51)", () => {
  it("shows the partner only name, side, zone and readiness, and nothing while unpaired", async () => {
    await seedDev(pgliteClient(db));
    await addStranger();
    await db.query(
      "update profile set nickname = 'secret', side = 'ruby', time_zone = 'Africa/Addis_Ababa' where user_id = $1",
      [DEV_PEOPLE.selam.id],
    );
    const r = await asUser(db, DEV_PEOPLE.noah.id, (tx) =>
      tx.query("select * from partner_profile()"),
    );
    expect(r.rows).toEqual([
      {
        name: "Selam",
        side: "ruby",
        time_zone: "Africa/Addis_Ababa",
        home_city: null,
        birth_date: DEV_PEOPLE.selam.birthDate,
        ready: false,
      },
    ]);
    const alone = await asUser(db, STRANGER, (tx) => tx.query("select * from partner_profile()"));
    expect(alone.rows).toEqual([]);
  });

  it("never gives both partners the same side, and tells the second only which is taken", async () => {
    await seedDev(pgliteClient(db));
    expect(await one(DEV_PEOPLE.selam.id, "select choose_side('sapphire')")).toBeNull();
    expect(await one(DEV_PEOPLE.noah.id, "select choose_side('sapphire')")).toBe("sapphire");
    expect(await one(DEV_PEOPLE.noah.id, "select choose_side('ruby')")).toBeNull();
    const sides = await db.query<{ side: string }>(
      "select side from profile order by display_name",
    );
    expect(sides.rows.map((r) => r.side)).toEqual(["ruby", "sapphire"]); // Noah, Selam
    expect(await sqlStateOf(one(DEV_PEOPLE.noah.id, "select choose_side('emerald')"))).toBe(
      "GN400",
    );
  });

  it("refuses every pairing and side function without a signed-in person", async () => {
    await seedDev(pgliteClient(db));
    const anonymous = (sql: string) =>
      db.transaction(async (tx) => {
        await tx.exec("set local role garnet_app");
        return tx.query(sql, sql.includes("$1") ? [hashToken("ABCDEFGH")] : []);
      });
    for (const sql of [
      "select choose_side('ruby')",
      "select create_invitation($1, 24)",
      "select join_with_invitation($1)",
    ])
      expect(await sqlStateOf(anonymous(sql))).toBe("GN401");
  });
});

describe("registration, home city and together since (P-79)", () => {
  it("records only the caller's own registration, and reads back only their own", async () => {
    await seedDev(pgliteClient(db));
    await one(DEV_PEOPLE.noah.id, "select complete_registration('1995-05-05', 'v2')");
    const rows = await db.query<{ id: string; birth_date: string; terms_version: string }>(
      "select id, birth_date, terms_version from app_user order by email",
    );
    expect(rows.rows).toEqual([
      { id: DEV_PEOPLE.noah.id, birth_date: "1995-05-05", terms_version: "v2" },
      {
        id: DEV_PEOPLE.selam.id,
        birth_date: DEV_PEOPLE.selam.birthDate,
        terms_version: "2026-11-04",
      },
    ]);
    const mine = await asUser(db, DEV_PEOPLE.selam.id, (tx) =>
      tx.query<{ birth_date: string }>("select birth_date from my_registration()"),
    );
    expect(mine.rows).toEqual([{ birth_date: DEV_PEOPLE.selam.birthDate }]);
  });

  it("keeps a birthday in YYYY-MM-DD and the terms with their acceptance time", async () => {
    await seedDev(pgliteClient(db));
    await expect(
      db.query("update app_user set birth_date = '12/03/1998' where id = $1", [
        DEV_PEOPLE.selam.id,
      ]),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query("update app_user set terms_accepted_at = null where id = $1", [DEV_PEOPLE.selam.id]),
    ).rejects.toThrow(/terms_accepted_together/);
  });

  it("shares together since with the pair only, set by either, never in the future", async () => {
    await seedDev(pgliteClient(db));
    await addStranger();
    await one(DEV_PEOPLE.noah.id, "select set_together_since('2021-05-02')");
    expect(await one(DEV_PEOPLE.selam.id, "select our_together_since()")).toBe("2021-05-02");
    expect(await one(STRANGER, "select our_together_since()")).toBeNull();
    // Unpaired: nothing to set.
    expect(await sqlStateOf(one(STRANGER, "select set_together_since('2020-01-01')"))).toBe(
      "GN409",
    );
    expect(
      await sqlStateOf(one(DEV_PEOPLE.selam.id, "select set_together_since(current_date + 3)")),
    ).toBe("GN400");
    await one(DEV_PEOPLE.selam.id, "select set_together_since(null)");
    expect(await one(DEV_PEOPLE.noah.id, "select our_together_since()")).toBeNull();
  });

  it("lets the app role read the partner's home city only through partner_profile()", async () => {
    await seedDev(pgliteClient(db));
    await db.query("update profile set home_city = 'Bahir Dar' where user_id = $1", [
      DEV_PEOPLE.selam.id,
    ]);
    const r = await asUser(db, DEV_PEOPLE.noah.id, (tx) =>
      tx.query<{ home_city: string }>("select home_city from partner_profile()"),
    );
    expect(r.rows).toEqual([{ home_city: "Bahir Dar" }]);
  });
});

describe("settings (B2)", () => {
  const save = (user: string, doc: object) =>
    asUser(db, user, (tx) =>
      tx.query("insert into user_settings (user_id, schema_version, doc) values ($1, 1, $2)", [
        user,
        JSON.stringify(doc),
      ]),
    );

  it("are readable and writable only by their owner, partner included", async () => {
    await seedDev(pgliteClient(db));
    await save(DEV_PEOPLE.selam.id, { partnerNickname: "Honey" });
    const seen = await asUser(db, DEV_PEOPLE.noah.id, (tx) =>
      tx.query("select * from user_settings"),
    );
    expect(seen.rows).toEqual([]);
    await asUser(db, DEV_PEOPLE.noah.id, (tx) =>
      tx.query("update user_settings set doc = '{}' where user_id = $1", [DEV_PEOPLE.selam.id]),
    );
    const selam = await db.query<{ doc: { partnerNickname?: string } }>(
      "select doc from user_settings where user_id = $1",
      [DEV_PEOPLE.selam.id],
    );
    expect(selam.rows[0]?.doc.partnerNickname).toBe("Honey");
    await expect(save(DEV_PEOPLE.noah.id, {})).resolves.toBeTruthy();
    await expect(
      asUser(db, DEV_PEOPLE.noah.id, (tx) =>
        tx.query("insert into user_settings (user_id, schema_version, doc) values ($1, 1, '{}')", [
          DEV_PEOPLE.selam.id,
        ]),
      ),
    ).rejects.toThrow();
  });

  it("can't be deleted by the app role, and go with the account", async () => {
    await seedDev(pgliteClient(db));
    await save(DEV_PEOPLE.selam.id, {});
    await expect(
      asUser(db, DEV_PEOPLE.selam.id, (tx) => tx.query("delete from user_settings")),
    ).rejects.toThrow(/permission denied/);
    await db.query("delete from relationship_member");
    await db.query("delete from app_user where id = $1", [DEV_PEOPLE.selam.id]);
    expect((await db.query("select 1 from user_settings")).rows).toEqual([]);
  });

  it("must be a document, and not a huge one", async () => {
    await seedDev(pgliteClient(db));
    await expect(
      db.query("insert into user_settings (user_id, schema_version, doc) values ($1, 1, '[]')", [
        DEV_PEOPLE.selam.id,
      ]),
    ).rejects.toThrow(/check constraint/);
    // Random text, so compression can't hide its size.
    const big = Array.from({ length: 60_000 }, (_, i) =>
      String.fromCharCode(33 + ((i * 7919) % 90)),
    );
    await expect(
      save(DEV_PEOPLE.selam.id, { big: `${big.join("")}${Math.random()}` }),
    ).rejects.toThrow(/check constraint/);
  });

  it("the old draft table is gone", async () => {
    const { rows } = await db.query("select to_regclass('public.user_preference') as t");
    expect(rows).toEqual([{ t: null }]);
  });

  it("changes only the caller's own birthday, and reads only their own account", async () => {
    await seedDev(pgliteClient(db));
    await one(DEV_PEOPLE.noah.id, "select set_my_birth_date('1990-10-10')");
    const rows = await db.query<{ birth_date: string }>(
      "select birth_date from app_user order by email",
    );
    expect(rows.rows.map((r) => r.birth_date)).toEqual(["1990-10-10", DEV_PEOPLE.selam.birthDate]);
    const mine = await asUser(db, DEV_PEOPLE.selam.id, (tx) =>
      tx.query<{ email: string }>("select email from my_account()"),
    );
    expect(mine.rows).toEqual([{ email: DEV_PEOPLE.selam.email }]);
  });
});

describe("invitations (P-18)", () => {
  const code = (c: string) => hashToken(c);

  async function setUpLoner(): Promise<void> {
    await seedDev(pgliteClient(db));
    await addStranger();
    await addPerson(LONER, "loner@example.test", "Lu");
  }

  it("are single use: check names the inviter, joining spends the code, a second join fails", async () => {
    await setUpLoner();
    await one(STRANGER, "select create_invitation($1, 24)", [code("AAAABBBB")]);
    expect(await one(LONER, "select check_invitation($1)", [code("AAAABBBB")])).toBe("Sam");
    expect(await one(LONER, "select join_with_invitation($1)", [code("AAAABBBB")])).toBe("Sam");
    await addPerson("0192f0a0-0000-7000-8000-00000000d002", "late@example.test", "Late");
    expect(
      await sqlStateOf(
        one("0192f0a0-0000-7000-8000-00000000d002", "select join_with_invitation($1)", [
          code("AAAABBBB"),
        ]),
      ),
    ).toBe("GN403");
    const members = await db.query<{ n: number }>(
      "select count(*)::int as n from relationship_member where relationship_id = $1",
      [STRANGER_RELATIONSHIP],
    );
    expect(members.rows).toEqual([{ n: 2 }]);
  });

  it("can't be used by the inviter, by someone already paired, once expired or withdrawn", async () => {
    await setUpLoner();
    await one(STRANGER, "select create_invitation($1, 24)", [code("CCCCDDDD")]);
    expect(await one(STRANGER, "select check_invitation($1)", [code("CCCCDDDD")])).toBeNull();
    expect(
      await one(DEV_PEOPLE.noah.id, "select check_invitation($1)", [code("CCCCDDDD")]),
    ).toBeNull();
    expect(
      await sqlStateOf(
        one(DEV_PEOPLE.noah.id, "select join_with_invitation($1)", [code("CCCCDDDD")]),
      ),
    ).toBe("GN403");
    await db.query(
      `update invitation set created_at = created_at - interval '25 hours',
                             expires_at = expires_at - interval '25 hours'`,
    );
    expect(await one(LONER, "select check_invitation($1)", [code("CCCCDDDD")])).toBeNull();
    expect(
      await sqlStateOf(one(LONER, "select join_with_invitation($1)", [code("CCCCDDDD")])),
    ).toBe("GN403");
    await one(STRANGER, "select create_invitation($1, 24)", [code("EEEEFFFF")]);
    await one(STRANGER, "select revoke_my_invitations()");
    expect(await one(LONER, "select check_invitation($1)", [code("EEEEFFFF")])).toBeNull();
  });

  it("last at most 24 hours, whatever the caller asks for", async () => {
    await setUpLoner();
    expect(
      await sqlStateOf(one(STRANGER, "select create_invitation($1, 25)", [code("GGGGHHHH")])),
    ).toBe("23514");
  });

  it("are stored only as hashes", async () => {
    await setUpLoner();
    await one(STRANGER, "select create_invitation($1, 24)", [code("JJJJKKKK")]);
    const raw = await db.query(
      "select 1 from invitation where encode(token_hash, 'escape') like '%JJJJ%'",
    );
    expect(raw.rows).toEqual([]);
  });

  it("refuses someone already paired from inviting anyone", async () => {
    await setUpLoner();
    expect(
      await sqlStateOf(
        one(DEV_PEOPLE.selam.id, "select create_invitation($1, 24)", [code("MMMMNNNN")]),
      ),
    ).toBe("GN409");
  });
});

describe("local tools", () => {
  it("seeds idempotently", async () => {
    await seedDev(pgliteClient(db));
    await seedDev(pgliteClient(db));
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from relationship_member",
    );
    expect(rows).toEqual([{ n: 2 }]);
  });

  it("only treats this machine as local", () => {
    expect(isLocalDatabase("postgres://u:p@localhost:5432/garnet")).toBe(true);
    expect(isLocalDatabase("postgres://u:p@127.0.0.1:5432/garnet")).toBe(true);
    expect(isLocalDatabase("postgres://u:p@[::1]:5432/garnet")).toBe(true);
    expect(isLocalDatabase("postgres://u:p@db.example.com:5432/garnet")).toBe(false);
    expect(isLocalDatabase("not a url")).toBe(false);
  });
});

describe("sync, entries and days (B3, migration 0006)", () => {
  const SELAM = DEV_PEOPLE.selam.id;
  const NOAH = DEV_PEOPLE.noah.id;
  const ENTRY_ID = "0192f0a0-0000-7000-8000-00000000e001";
  const MUTATION_ID = "0192f0a0-0000-7000-8000-00000000f001";

  beforeEach(async () => {
    await seedDev(pgliteClient(db));
  });

  it("stores entries with after_reveal visibility and extended fields", async () => {
    await asUser(db, SELAM, async (tx) => {
      await tx.query(
        `insert into entry (id, relationship_id, author_id, kind, body, emoji, mood, activity, place, visibility, occurred_at, occurred_time_zone, shared_at, shared_day)
         values ($1, $2, $3, 'text', 'After reveal moment', '✨', 'happy', 'walk', 'London', 'after_reveal', now(), 'Europe/London', now(), '2026-11-05')`,
        [ENTRY_ID, DEV_RELATIONSHIP_ID, SELAM],
      );
    });

    // Selam sees it
    const selamRow = await asUser(db, SELAM, (tx) =>
      tx.query<{ body: string; emoji: string; mood: string; place: string }>(
        "select body, emoji, mood, place from entry where id = $1",
        [ENTRY_ID],
      ),
    );
    expect(selamRow.rows).toEqual([
      { body: "After reveal moment", emoji: "✨", mood: "happy", place: "London" },
    ]);

    // Noah does NOT see it before reveal
    const noahBefore = await asUser(db, NOAH, (tx) =>
      tx.query("select 1 from entry where id = $1", [ENTRY_ID]),
    );
    expect(noahBefore.rows).toEqual([]);

    // Set revealed_at
    await db.query("update entry set revealed_at = now() where id = $1", [ENTRY_ID]);

    // Now Noah sees it
    const noahAfter = await asUser(db, NOAH, (tx) =>
      tx.query<{ body: string }>("select body from entry where id = $1", [ENTRY_ID]),
    );
    expect(noahAfter.rows).toEqual([{ body: "After reveal moment" }]);
  });

  it("guards against moving shared/after_reveal back to private (GN422)", async () => {
    await asUser(db, SELAM, async (tx) => {
      await tx.query(
        `insert into entry (id, relationship_id, author_id, kind, body, visibility, occurred_at, occurred_time_zone, shared_at, shared_day)
         values ($1, $2, $3, 'text', 'Shared moment', 'shared', now(), 'Europe/London', now(), '2026-11-05')`,
        [ENTRY_ID, DEV_RELATIONSHIP_ID, SELAM],
      );
    });

    await expect(
      asUser(db, SELAM, (tx) =>
        tx.query(
          "update entry set visibility = 'private', shared_at = null, shared_day = null where id = $1",
          [ENTRY_ID],
        ),
      ),
    ).rejects.toMatchObject({ code: "GN422" });
  });

  it("manages processed_mutation idempotency under RLS", async () => {
    await asUser(db, SELAM, async (tx) => {
      await tx.query(
        `insert into processed_mutation (mutation_id, user_id, request_fingerprint, outcome)
         values ($1, $2, decode('deadbeef', 'hex'), 'applied')`,
        [MUTATION_ID, SELAM],
      );
    });

    // Selam can read her mutation
    const row = await asUser(db, SELAM, (tx) =>
      tx.query<{ outcome: string }>(
        "select outcome from processed_mutation where mutation_id = $1",
        [MUTATION_ID],
      ),
    );
    expect(row.rows).toEqual([{ outcome: "applied" }]);

    // Noah cannot see Selam's processed_mutation
    const noahRow = await asUser(db, NOAH, (tx) =>
      tx.query("select 1 from processed_mutation where mutation_id = $1", [MUTATION_ID]),
    );
    expect(noahRow.rows).toEqual([]);
  });

  it("manages day readiness per partner under RLS", async () => {
    await asUser(db, SELAM, async (tx) => {
      await tx.query(
        "insert into day_readiness (relationship_id, user_id, day) values ($1, $2, '2026-11-05')",
        [DEV_RELATIONSHIP_ID, SELAM],
      );
    });

    // Noah can see Selam is ready (to compute reveal state)
    const row = await asUser(db, NOAH, (tx) =>
      tx.query<{ user_id: string }>(
        "select user_id from day_readiness where relationship_id = $1 and day = '2026-11-05'",
        [DEV_RELATIONSHIP_ID],
      ),
    );
    expect(row.rows).toEqual([{ user_id: SELAM }]);

    // Noah cannot insert for Selam
    await expect(
      asUser(db, NOAH, (tx) =>
        tx.query(
          "insert into day_readiness (relationship_id, user_id, day) values ($1, $2, '2026-11-06')",
          [DEV_RELATIONSHIP_ID, SELAM],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  describe("signals, responses and coarse location (B4, migration 0007)", () => {
    const SIGNAL_ID = "0192f0a0-0000-7000-8000-00000000a001";
    const RESPONSE_ID = "0192f0a0-0000-7000-8000-00000000b001";

    it("sends a signal under RLS and partner can view it (§5, P-07)", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into signal (id, relationship_id, sender_id, signal_type, level, payload) values ($1, $2, $3, $4, $5, $6)",
          [
            SIGNAL_ID,
            DEV_RELATIONSHIP_ID,
            SELAM,
            "thought-of-you",
            "gentle",
            JSON.stringify({ note: "Thinking of you" }),
          ],
        );
      });

      // Noah sees the signal
      const noahView = await asUser(db, NOAH, (tx) =>
        tx.query<{ id: string; signal_type: string }>(
          "select id, signal_type from signal where id = $1",
          [SIGNAL_ID],
        ),
      );
      expect(noahView.rows).toEqual([{ id: SIGNAL_ID, signal_type: "thought-of-you" }]);

      // Stranger cannot see the signal
      await addStranger();
      const strangerView = await asUser(db, STRANGER, (tx) =>
        tx.query("select 1 from signal where id = $1", [SIGNAL_ID]),
      );
      expect(strangerView.rows).toEqual([]);
    });

    it("partner responds to a signal and stranger cannot respond", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into signal (id, relationship_id, sender_id, signal_type, level) values ($1, $2, $3, $4, $5)",
          [SIGNAL_ID, DEV_RELATIONSHIP_ID, SELAM, "need-you", "support"],
        );
      });

      // Noah responds
      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          "insert into signal_response (id, signal_id, responder_id, preset) values ($1, $2, $3, $4)",
          [RESPONSE_ID, SIGNAL_ID, NOAH, "here"],
        );
      });

      // Selam sees Noah's response
      const selamView = await asUser(db, SELAM, (tx) =>
        tx.query<{ preset: string }>("select preset from signal_response where id = $1", [
          RESPONSE_ID,
        ]),
      );
      expect(selamView.rows).toEqual([{ preset: "here" }]);

      // Stranger cannot insert a response
      await addStranger();
      await expect(
        asUser(db, STRANGER, (tx) =>
          tx.query(
            "insert into signal_response (id, signal_id, responder_id, preset) values ($1, $2, $3, $4)",
            ["0192f0a0-0000-7000-8000-00000000b002", SIGNAL_ID, STRANGER, "here"],
          ),
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });

    it("saves coarse location and partner sees it only (P-66)", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into user_coarse_location (user_id, lat, lon) values ($1, $2, $3) on conflict (user_id) do update set lat = $2, lon = $3",
          [SELAM, 9.0, 38.7],
        );
      });

      // Noah can see Selam's coarse location
      const noahView = await asUser(db, NOAH, (tx) =>
        tx.query<{ lat: number; lon: number }>(
          "select lat, lon from user_coarse_location where user_id = $1",
          [SELAM],
        ),
      );
      expect(noahView.rows).toEqual([{ lat: 9.0, lon: 38.7 }]);

      // Stranger cannot see Selam's location
      await addStranger();
      const strangerView = await asUser(db, STRANGER, (tx) =>
        tx.query("select 1 from user_coarse_location where user_id = $1", [SELAM]),
      );
      expect(strangerView.rows).toEqual([]);
    });
  });

  describe("chat, reactions, pins, presence and read receipts (B5, migration 0008)", () => {
    const MSG_ID = "0192f0a0-0000-7000-8000-00000000e010";
    const REACTION_ID = "0192f0a0-0000-7000-8000-00000000e020";

    it("sends a chat message under RLS; partner can view, stranger cannot", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into chat_message (id, relationship_id, sender_id, text) values ($1, $2, $3, $4)",
          [MSG_ID, DEV_RELATIONSHIP_ID, SELAM, "Hello from Addis Ababa"],
        );
      });

      // Noah sees the message
      const noahView = await asUser(db, NOAH, (tx) =>
        tx.query<{ id: string; text: string }>("select id, text from chat_message where id = $1", [
          MSG_ID,
        ]),
      );
      expect(noahView.rows).toEqual([{ id: MSG_ID, text: "Hello from Addis Ababa" }]);

      // Stranger cannot see the message
      await addStranger();
      const strangerView = await asUser(db, STRANGER, (tx) =>
        tx.query("select 1 from chat_message where id = $1", [MSG_ID]),
      );
      expect(strangerView.rows).toEqual([]);
    });

    it("isolates delete-for-me to the caller; partner still views", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into chat_message (id, relationship_id, sender_id, text) values ($1, $2, $3, $4)",
          [MSG_ID, DEV_RELATIONSHIP_ID, SELAM, "Private to delete"],
        );
        await tx.query(
          "insert into chat_message_visibility (message_id, user_id, deleted_for_me) values ($1, $2, true)",
          [MSG_ID, SELAM],
        );
      });

      // Selam sees deleted_for_me
      const selamVis = await asUser(db, SELAM, (tx) =>
        tx.query<{ deleted_for_me: boolean }>(
          "select deleted_for_me from chat_message_visibility where message_id = $1",
          [MSG_ID],
        ),
      );
      expect(selamVis.rows).toEqual([{ deleted_for_me: true }]);

      // Noah has no visibility record (still visible)
      const noahVis = await asUser(db, NOAH, (tx) =>
        tx.query("select 1 from chat_message_visibility where message_id = $1", [MSG_ID]),
      );
      expect(noahVis.rows).toEqual([]);
    });

    it("manages reactions and pins under RLS; stranger cannot react", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into chat_message (id, relationship_id, sender_id, text) values ($1, $2, $3, $4)",
          [MSG_ID, DEV_RELATIONSHIP_ID, SELAM, "Loved moment"],
        );
      });

      // Noah reacts with ❤️
      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          "insert into chat_reaction (id, message_id, user_id, emoji) values ($1, $2, $3, $4)",
          [REACTION_ID, MSG_ID, NOAH, "❤️"],
        );
      });

      // Noah pins the message
      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          "insert into chat_pin (relationship_id, message_id, pinned_by) values ($1, $2, $3)",
          [DEV_RELATIONSHIP_ID, MSG_ID, NOAH],
        );
      });

      // Selam sees the reaction and pin
      const reactions = await asUser(db, SELAM, (tx) =>
        tx.query<{ emoji: string }>("select emoji from chat_reaction where message_id = $1", [
          MSG_ID,
        ]),
      );
      expect(reactions.rows).toEqual([{ emoji: "❤️" }]);

      const pins = await asUser(db, SELAM, (tx) =>
        tx.query<{ message_id: string }>("select message_id from chat_pin where message_id = $1", [
          MSG_ID,
        ]),
      );
      expect(pins.rows).toEqual([{ message_id: MSG_ID }]);

      // Stranger cannot insert a reaction on this message
      await addStranger();
      await expect(
        asUser(db, STRANGER, (tx) =>
          tx.query(
            "insert into chat_reaction (id, message_id, user_id, emoji) values ($1, $2, $3, $4)",
            ["0192f0a0-0000-7000-8000-00000000e030", MSG_ID, STRANGER, "❤️"],
          ),
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });

    it("manages participant state and ephemeral presence under RLS", async () => {
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into chat_participant_state (relationship_id, user_id, read_receipts, typing_indicators) values ($1, $2, true, true)",
          [DEV_RELATIONSHIP_ID, SELAM],
        );
      });

      // Noah can read Selam's state
      const state = await asUser(db, NOAH, (tx) =>
        tx.query<{ read_receipts: boolean; typing_indicators: boolean }>(
          "select read_receipts, typing_indicators from chat_participant_state where user_id = $1",
          [SELAM],
        ),
      );
      expect(state.rows).toEqual([{ read_receipts: true, typing_indicators: true }]);

      // Stranger cannot read or modify
      await addStranger();
      const strangerView = await asUser(db, STRANGER, (tx) =>
        tx.query("select 1 from chat_participant_state where user_id = $1", [SELAM]),
      );
      expect(strangerView.rows).toEqual([]);
    });
  });

  describe("migration 0009: notifications and push devices (B6, B-50, U-27, P-84)", () => {
    const NOTIF_ID = "0192f0a0-0000-7000-8000-00000000f001";
    const PUSH_ID = "0192f0a0-0000-7000-8000-00000000f002";
    const SESSION_ID = "0192f0a0-0000-7000-8000-00000000f003";

    it("isolates notifications to their recipient under RLS (§5)", async () => {
      // Selam receives a notification
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into notification (id, relationship_id, user_id, sender_id, category, group_name, title, body, href) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            NOTIF_ID,
            DEV_RELATIONSHIP_ID,
            SELAM,
            NOAH,
            "chat-message",
            "messages",
            "Garnet",
            "Something new for you 💜",
            "/us/chat",
          ],
        );
      });

      // Selam can read and update her notification
      const selamRows = await asUser(db, SELAM, (tx) =>
        tx.query<{ id: string; read_at: string | null }>(
          "select id, read_at from notification where id = $1",
          [NOTIF_ID],
        ),
      );
      expect(selamRows.rows).toEqual([{ id: NOTIF_ID, read_at: null }]);

      await asUser(db, SELAM, async (tx) => {
        await tx.query("update notification set read_at = now() where id = $1", [NOTIF_ID]);
      });

      // Noah (partner) cannot see or modify Selam's notification (§5 privacy)
      const noahRows = await asUser(db, NOAH, (tx) =>
        tx.query("select 1 from notification where id = $1", [NOTIF_ID]),
      );
      expect(noahRows.rows).toEqual([]);

      // Stranger cannot see it either
      await addStranger();
      const strangerRows = await asUser(db, STRANGER, (tx) =>
        tx.query("select 1 from notification where id = $1", [NOTIF_ID]),
      );
      expect(strangerRows.rows).toEqual([]);
    });

    it("isolates push devices under RLS and cascades on session delete (U-27, P-84)", async () => {
      // Create a session for Selam
      await db.query(
        "insert into session (id, user_id, token, expires_at) values ($1, $2, $3, now() + interval '30 days')",
        [SESSION_ID, SELAM, "test-token-f003"],
      );

      // Selam registers a push device linked to this session
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "insert into push_device (id, user_id, session_id, token, platform) values ($1, $2, $3, $4, $5)",
          [PUSH_ID, SELAM, SESSION_ID, "fcm-token-123", "android"],
        );
      });

      // Selam can see her push device
      const selamDevs = await asUser(db, SELAM, (tx) =>
        tx.query<{ id: string; platform: string }>(
          "select id, platform from push_device where id = $1",
          [PUSH_ID],
        ),
      );
      expect(selamDevs.rows).toEqual([{ id: PUSH_ID, platform: "android" }]);

      // Partner cannot see her push device
      const noahDevs = await asUser(db, NOAH, (tx) =>
        tx.query("select 1 from push_device where id = $1", [PUSH_ID]),
      );
      expect(noahDevs.rows).toEqual([]);

      // When the session is deleted (e.g. sign-out or revoke device), push_device cascades (U-27)
      await db.query("delete from session where id = $1", [SESSION_ID]);

      const afterDelete = await asUser(db, SELAM, (tx) =>
        tx.query("select 1 from push_device where id = $1", [PUSH_ID]),
      );
      expect(afterDelete.rows).toEqual([]);
    });

    it("migration 0010: manages media under RLS and cascades to media_purge_queue on delete (B7, B-41, B-42)", async () => {
      const MEDIA_ID = "0192e2b3-5798-7521-8254-e6be95232a95";
      const OBJECT_KEY = "media/test-object-key-123";
      const ENTITY_ID = "0192e2b3-5798-7521-8254-e6be95232a96";

      // Selam registers a pending upload
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          `insert into media (id, relationship_id, uploader_id, object_key, content_type, byte_size, sha256, status, entity_type, entity_id)
           values ($1, $2, $3, $4, $5, $6, $7, 'pending_upload', 'chat_message', $8)`,
          [
            MEDIA_ID,
            DEV_RELATIONSHIP_ID,
            SELAM,
            OBJECT_KEY,
            "image/jpeg",
            1024,
            Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex"),
            ENTITY_ID,
          ],
        );
      });

      // Guardrail §5: Pending upload is visible to Selam, but HIDDEN from partner until status='ready'
      const selamSeesPending = await asUser(db, SELAM, (tx) =>
        tx.query("select 1 from media where id = $1", [MEDIA_ID]),
      );
      expect(selamSeesPending.rows.length).toBe(1);

      const noahSeesPending = await asUser(db, NOAH, (tx) =>
        tx.query("select 1 from media where id = $1", [MEDIA_ID]),
      );
      expect(noahSeesPending.rows).toEqual([]);

      // Selam finalizes commit to status='ready'
      await asUser(db, SELAM, async (tx) => {
        await tx.query("update media set status = 'ready' where id = $1", [MEDIA_ID]);
      });

      // Now Noah can see it as ready
      const noahSeesReady = await asUser(db, NOAH, (tx) =>
        tx.query<{ id: string; status: string }>("select id, status from media where id = $1", [
          MEDIA_ID,
        ]),
      );
      expect(noahSeesReady.rows).toEqual([{ id: MEDIA_ID, status: "ready" }]);

      // When media is deleted, trigger media_enqueue_purge() enqueues object_key into media_purge_queue
      await asUser(db, SELAM, async (tx) => {
        await tx.query("delete from media where id = $1", [MEDIA_ID]);
      });

      const purgeQueue = await db.query<{ object_key: string }>(
        "select object_key from media_purge_queue where object_key = $1",
        [OBJECT_KEY],
      );
      expect(purgeQueue.rows).toEqual([{ object_key: OBJECT_KEY }]);
    });

    it("0011: isolates sealed letter and surprise content under RLS (B-90, U-34, P-68)", async () => {
      const LETTER_ID = "0192e2b3-5798-7521-8254-e6be95232a97";
      const SURPRISE_ID = "0192e2b3-5798-7521-8254-e6be95232a98";

      // 1. Noah drafts a letter to Selam
      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          `insert into open_when_letter (id, relationship_id, author_id, recipient_id, prompt, status, sealed_at, unlock_rule)
           values ($1, $2, $3, $4, 'Open when you land', 'draft', null, '{"type":"manual"}')`,
          [LETTER_ID, DEV_RELATIONSHIP_ID, NOAH, SELAM],
        );
        await tx.query(
          `insert into open_when_letter_content (letter_id, body)
           values ($1, 'Welcome to London, my love!')`,
          [LETTER_ID],
        );
      });

      // While draft: Selam sees nothing
      const selamDraft = await asUser(db, SELAM, (tx) =>
        tx.query("select 1 from open_when_letter where id = $1", [LETTER_ID]),
      );
      expect(selamDraft.rows).toEqual([]);

      // 2. Noah seals the letter
      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          "update open_when_letter set status = 'sealed', sealed_at = now() where id = $1",
          [LETTER_ID],
        );
      });

      // Once sealed: Selam sees metadata in open_when_letter
      const selamMetadata = await asUser(db, SELAM, (tx) =>
        tx.query<{ prompt: string; status: string }>(
          "select prompt, status from open_when_letter where id = $1",
          [LETTER_ID],
        ),
      );
      expect(selamMetadata.rows).toEqual([{ prompt: "Open when you land", status: "sealed" }]);

      // CRITICAL B-90 / U-34: Selam CANNOT read sealed content from database
      const selamSealedContent = await asUser(db, SELAM, (tx) =>
        tx.query("select body from open_when_letter_content where letter_id = $1", [LETTER_ID]),
      );
      expect(selamSealedContent.rows).toEqual([]);

      // 3. Selam opens the letter
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          "update open_when_letter set status = 'opened', opened_at = now() where id = $1",
          [LETTER_ID],
        );
      });

      // Now Selam CAN read the opened body
      const selamOpenedContent = await asUser(db, SELAM, (tx) =>
        tx.query<{ body: string }>(
          "select body from open_when_letter_content where letter_id = $1",
          [LETTER_ID],
        ),
      );
      expect(selamOpenedContent.rows).toEqual([{ body: "Welcome to London, my love!" }]);

      // 4. Surprises: Selam creates scheduled surprise for Noah
      await asUser(db, SELAM, async (tx) => {
        await tx.query(
          `insert into surprise (id, relationship_id, author_id, recipient_id, safe_title, state, reveal)
           values ($1, $2, $3, $4, 'A sweet tune', 'scheduled', '{"kind":"now"}')`,
          [SURPRISE_ID, DEV_RELATIONSHIP_ID, SELAM, NOAH],
        );
        await tx.query(
          `insert into surprise_content (surprise_id, kind, text_content)
           values ($1, 'song', 'Our favorite melody')`,
          [SURPRISE_ID],
        );
      });

      // Noah sees metadata, but NO content while scheduled
      const noahSurpriseMeta = await asUser(db, NOAH, (tx) =>
        tx.query<{ safe_title: string; state: string }>(
          "select safe_title, state from surprise where id = $1",
          [SURPRISE_ID],
        ),
      );
      expect(noahSurpriseMeta.rows).toEqual([{ safe_title: "A sweet tune", state: "scheduled" }]);

      const noahSurpriseContent = await asUser(db, NOAH, (tx) =>
        tx.query("select text_content from surprise_content where surprise_id = $1", [SURPRISE_ID]),
      );
      expect(noahSurpriseContent.rows).toEqual([]);

      // Noah opens the surprise
      await asUser(db, NOAH, async (tx) => {
        await tx.query("update surprise set state = 'opened', opened_at = now() where id = $1", [
          SURPRISE_ID,
        ]);
      });

      const noahRevealedContent = await asUser(db, NOAH, (tx) =>
        tx.query<{ text_content: string }>(
          "select text_content from surprise_content where surprise_id = $1",
          [SURPRISE_ID],
        ),
      );
      expect(noahRevealedContent.rows).toEqual([{ text_content: "Our favorite melody" }]);
    });

    it("migration 0012 isolates export jobs under RLS (B-100, P-37)", async () => {
      await seedDev(pgliteClient(db));
      const EXPORT_JOB_ID = "0192f0a0-0000-7000-8000-00000000e001";

      // 1. Noah creates an export job
      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          `insert into export_job (id, user_id, relationship_id, state, download_token, payload_json)
           values ($1, $2, $3, 'ready', 'token-noah-123', '{"private":"data"}')`,
          [EXPORT_JOB_ID, NOAH, DEV_RELATIONSHIP_ID],
        );
      });

      // 2. Noah can read his export job
      const noahJobs = await asUser(db, NOAH, (tx) =>
        tx.query<{ id: string; state: string }>("select id, state from export_job where id = $1", [
          EXPORT_JOB_ID,
        ]),
      );
      expect(noahJobs.rows).toEqual([{ id: EXPORT_JOB_ID, state: "ready" }]);

      // 3. Selam (partner) CANNOT read Noah's export job (strict privacy)
      const selamJobs = await asUser(db, SELAM, (tx) =>
        tx.query("select id from export_job where id = $1", [EXPORT_JOB_ID]),
      );
      expect(selamJobs.rows).toEqual([]);

      // 4. Stranger cannot read Noah's export job
      const strangerJobs = await asUser(db, STRANGER, (tx) =>
        tx.query("select id from export_job where id = $1", [EXPORT_JOB_ID]),
      );
      expect(strangerJobs.rows).toEqual([]);
    });

    it("migration 0013 enables full-text search indexes while honoring RLS", async () => {
      await seedDev(pgliteClient(db));
      const MSG_ID = "0192f0a0-0000-7000-8000-00000000f001";

      await asUser(db, NOAH, async (tx) => {
        await tx.query(
          `insert into chat_message (id, relationship_id, sender_id, text)
           values ($1, $2, $3, 'A cozy afternoon in London sipping hot tea')`,
          [MSG_ID, DEV_RELATIONSHIP_ID, NOAH],
        );
      });

      // Query using PostgreSQL full-text search tsvector match
      const results = await asUser(db, NOAH, (tx) =>
        tx.query<{ id: string; text: string }>(
          `select id, text from chat_message
           where to_tsvector('english', text) @@ to_tsquery('english', 'cozy & london')`,
        ),
      );
      expect(results.rows).toHaveLength(1);
      expect(results.rows[0]?.id).toBe(MSG_ID);

      // Stranger cannot find it via search under RLS
      const strangerResults = await asUser(db, STRANGER, (tx) =>
        tx.query(
          `select id from chat_message
           where to_tsvector('english', text) @@ to_tsquery('english', 'cozy & london')`,
        ),
      );
      expect(strangerResults.rows).toHaveLength(0);
    });
  });
});
