import type { PGlite, Transaction } from "@electric-sql/pglite";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEV_PEOPLE, DEV_RELATIONSHIP_ID, isLocalDatabase, seedDev } from "./dev.ts";
import {
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
});
afterEach(async () => {
  await db.close();
});

const VERSIONS = ["0001", "0002", "0003", "0004", "0005"];

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
    await expect(save(DEV_PEOPLE.selam.id, { big: big.join("") + Math.random() })).rejects.toThrow(
      /check constraint/,
    );
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
