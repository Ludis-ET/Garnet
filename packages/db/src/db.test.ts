import type { PGlite } from "@electric-sql/pglite";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDevSession,
  DEV_PEOPLE,
  DEV_RELATIONSHIP_ID,
  isLocalDatabase,
  seedDev,
} from "./dev.ts";
import {
  checksumOf,
  loadMigrations,
  migrate,
  MigrationError,
  MIGRATIONS_DIR,
  type Migration,
} from "./migrate.ts";
import { asUser, createMigratedDatabase, pgliteClient } from "./testing.ts";
import { hashToken, TOKEN_PATTERN } from "./tokens.ts";

let db: PGlite;
beforeEach(async () => {
  db = await createMigratedDatabase();
});
afterEach(async () => {
  await db.close();
});

const STRANGER = "0192f0a0-0000-7000-8000-00000000c001";
const STRANGER_RELATIONSHIP = "0192f0a0-0000-7000-8000-00000000c101";

async function addStranger(): Promise<void> {
  await db.query("insert into app_user (id, email, password_hash) values ($1, $2, '!')", [
    STRANGER,
    "stranger@example.test",
  ]);
  await db.query("insert into relationship (id) values ($1)", [STRANGER_RELATIONSHIP]);
  await db.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
    STRANGER_RELATIONSHIP,
    STRANGER,
  ]);
}

describe("migration runner (B-13)", () => {
  it("applies every migration once, records it, and then has nothing to do", async () => {
    const files = loadMigrations(MIGRATIONS_DIR);
    expect(files.map((m) => m.version)).toEqual(["0001"]);
    const { rows } = await db.query<{ version: string; checksum: string }>(
      "select version, checksum from garnet_meta.schema_migration",
    );
    expect(rows).toEqual([{ version: "0001", checksum: files[0]?.checksum }]);
    const again = await migrate(pgliteClient(db), files);
    expect(again).toEqual({ applied: [], alreadyApplied: ["0001"] });
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
      version: "0002",
      name: "broken",
      sql: "create table half_done (id int); select * from no_such_table;",
      checksum: "x",
    };
    await expect(migrate(pgliteClient(db), [...files, broken])).rejects.toThrow(/0002_broken/);
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

describe("what the app role can reach", () => {
  it("can't read sessions, accounts or the migration history", async () => {
    await seedDev(pgliteClient(db));
    for (const table of ["session", "app_user", "garnet_meta.schema_migration"]) {
      await expect(
        asUser(db, DEV_PEOPLE.selam.id, (tx) => tx.query(`select * from ${table}`)),
      ).rejects.toThrow(/permission denied/);
    }
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
});

describe("auth_session (ADR-0006)", () => {
  const lookup = (token: string) =>
    asUser(db, "00000000-0000-0000-0000-000000000000", (tx) =>
      tx.query<{ session_id: string; user_id: string }>(
        "select session_id, user_id from auth_session($1)",
        [hashToken(token)],
      ),
    );

  it("turns a live token into its session and person, and stores no token", async () => {
    await seedDev(pgliteClient(db));
    const { token, sessionId } = await createDevSession(pgliteClient(db), "noah");
    expect(token).toMatch(TOKEN_PATTERN);
    expect((await lookup(token)).rows).toEqual([
      { session_id: sessionId, user_id: DEV_PEOPLE.noah.id },
    ]);
    const stored = await db.query<{ token_hash: Uint8Array }>(
      "select token_hash from session where id = $1",
      [sessionId],
    );
    expect(Buffer.from(stored.rows[0]?.token_hash ?? []).equals(hashToken(token))).toBe(true);
    const raw = await db.query("select 1 from session where token_hash::text like $1", [
      `%${token}%`,
    ]);
    expect(raw.rows).toEqual([]);
  });

  it("answers the same (nothing) for unknown, revoked and expired tokens", async () => {
    await seedDev(pgliteClient(db));
    const revoked = await createDevSession(pgliteClient(db), "selam");
    await db.query("update session set revoked_at = now() where id = $1", [revoked.sessionId]);
    const expired = await createDevSession(pgliteClient(db), "selam");
    await db.query(
      `update session set created_at = now() - interval '2 days',
                          expires_at = now() - interval '1 day' where id = $1`,
      [expired.sessionId],
    );
    for (const token of ["A".repeat(43), revoked.token, expired.token]) {
      expect((await lookup(token)).rows).toEqual([]);
    }
  });

  it("refreshes last_used_at only when it is more than five minutes old", async () => {
    await seedDev(pgliteClient(db));
    const s = await createDevSession(pgliteClient(db), "selam");
    const at = async () =>
      (
        await db.query<{ t: string }>("select last_used_at::text as t from session where id = $1", [
          s.sessionId,
        ])
      ).rows[0]?.t;
    await db.query("update session set last_used_at = '2026-01-01T00:00:00Z' where id = $1", [
      s.sessionId,
    ]);
    await lookup(s.token);
    const refreshed = await at();
    expect(refreshed).not.toContain("2026-01-01");
    await lookup(s.token);
    expect(await at()).toBe(refreshed);
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
