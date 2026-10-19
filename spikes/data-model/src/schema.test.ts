import type { PGlite, Transaction } from "@electric-sql/pglite";
import { createHash, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, uuid } from "./db";

// Cast: two couples and some unpaired people.
const RUBY = uuid(1);
const SAPPHIRE = uuid(2);
const PEARL = uuid(3);
const AMETHYST = uuid(4);
const JASPER = uuid(5);
const OPAL = uuid(6);
const TOPAZ = uuid(7);
const PERIDOT = uuid(8);

const GARNET = uuid(100); // Ruby + Sapphire
const QUARTZ = uuid(200); // Amethyst + Jasper

let db: PGlite;
let nextId = 10_000;
const freshId = () => uuid(nextId++);

beforeAll(async () => {
  db = await createDatabase();
  const users = [RUBY, SAPPHIRE, PEARL, AMETHYST, JASPER, OPAL, TOPAZ, PERIDOT];
  for (const [i, id] of users.entries()) {
    await db.query(
      "insert into app_user (id, email, password_hash) values ($1, $2, 'argon2id$test')",
      [id, `user${String(i)}@example.test`],
    );
  }
  await db.query("insert into relationship (id) values ($1), ($2)", [GARNET, QUARTZ]);
  await db.query(
    "insert into relationship_member (relationship_id, user_id) values ($1,$2), ($1,$3), ($4,$5), ($4,$6)",
    [GARNET, RUBY, SAPPHIRE, QUARTZ, AMETHYST, JASPER],
  );
});

interface EntryInput {
  id?: string;
  relationship?: string;
  author?: string;
  visibility?: "private" | "shared";
  body?: string;
}

async function insertEntry(tx: Transaction | PGlite, input: EntryInput = {}): Promise<string> {
  const id = input.id ?? freshId();
  const shared = input.visibility === "shared";
  await tx.query(
    `insert into entry (id, relationship_id, author_id, kind, body, visibility, occurred_at,
                        occurred_time_zone, shared_at)
     values ($1, $2, $3, 'text', $4, $5, now(), 'Africa/Addis_Ababa', $6)`,
    [
      id,
      input.relationship ?? GARNET,
      input.author ?? RUBY,
      input.body ?? "a moment",
      input.visibility ?? "private",
      shared ? new Date() : null,
    ],
  );
  return id;
}

const visibleIds = async (user: string) =>
  asUser(db, user, async (tx) =>
    (await tx.query<{ id: string }>("select id from entry")).rows.map((r) => r.id),
  );

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest();

describe("pairing: exactly two partners (§2)", () => {
  it("rejects a third active partner", async () => {
    await expect(
      db.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
        GARNET,
        PEARL,
      ]),
    ).rejects.toMatchObject({ code: "GN409" });
  });

  it("allows only one active relationship per user", async () => {
    const other = freshId();
    await db.query("insert into relationship (id) values ($1)", [other]);
    await expect(
      db.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
        other,
        RUBY,
      ]),
    ).rejects.toMatchObject({ code: "23505" });
  });
});

describe("invitations: short-lived and single-use (§12)", () => {
  async function invite(inviter: string, options: { expiresIn?: string } = {}) {
    const rel = freshId();
    await db.query("insert into relationship (id) values ($1)", [rel]);
    await db.query("insert into relationship_member (relationship_id, user_id) values ($1, $2)", [
      rel,
      inviter,
    ]);
    const token = randomBytes(32);
    await db.query(
      `insert into invitation (id, relationship_id, created_by, token_hash, expires_at)
       values ($1, $2, $3, $4, now() + $5::interval)`,
      [freshId(), rel, inviter, sha256(token), options.expiresIn ?? "1 hour"],
    );
    return { rel, tokenHash: sha256(token) };
  }

  const accept = (user: string, tokenHash: Buffer) =>
    asUser(db, user, (tx) =>
      tx.query<{ rel: string }>("select accept_invitation($1) as rel", [tokenHash]),
    );

  it("pairs the invitee once; a second use fails with the generic error", async () => {
    const { rel, tokenHash } = await invite(PEARL);
    const result = await accept(OPAL, tokenHash);
    expect(result.rows[0]?.rel).toBe(rel);
    await expect(accept(TOPAZ, tokenHash)).rejects.toMatchObject({ code: "GN403" });
  });

  it("rejects expired tokens, unknown tokens and self-acceptance identically", async () => {
    const expired = await invite(TOPAZ, { expiresIn: "1 second" });
    await db.query(
      "update invitation set expires_at = now() - interval '1 minute', created_at = now() - interval '2 minutes' where token_hash = $1",
      [expired.tokenHash],
    );
    await expect(accept(PERIDOT, expired.tokenHash)).rejects.toMatchObject({ code: "GN403" });
    await expect(accept(PERIDOT, sha256(randomBytes(32)))).rejects.toMatchObject({ code: "GN403" });
  });

  it("refuses invitations that live longer than 24 hours", async () => {
    await expect(invite(PERIDOT, { expiresIn: "25 hours" })).rejects.toMatchObject({
      code: "23514",
    });
  });
});

describe("row-level security: private drafts and cross-relationship access (§11, §12)", () => {
  it("a private draft is visible to its author only", async () => {
    const draft = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "private" }));
    expect(await visibleIds(RUBY)).toContain(draft);
    expect(await visibleIds(SAPPHIRE)).not.toContain(draft);
    expect(await visibleIds(AMETHYST)).not.toContain(draft);
  });

  it("a shared entry is visible to both partners and nobody else (IDOR/BOLA)", async () => {
    const shared = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    expect(await visibleIds(SAPPHIRE)).toContain(shared);
    const probe = await asUser(db, AMETHYST, (tx) =>
      tx.query("select * from entry where id = $1", [shared]),
    );
    expect(probe.rows).toHaveLength(0);
  });

  it("cannot write as someone else or into another relationship", async () => {
    await expect(
      asUser(db, RUBY, (tx) => insertEntry(tx, { author: SAPPHIRE })),
    ).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      asUser(db, RUBY, (tx) => insertEntry(tx, { relationship: QUARTZ })),
    ).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("the author must be a member of that relationship, even for privileged writers", async () => {
    await expect(insertEntry(db, { relationship: QUARTZ, author: RUBY })).rejects.toMatchObject({
      code: "23503",
    });
  });

  it("only the author edits; either partner may delete a shared entry, only the author a private one", async () => {
    const shared = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    const draft = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "private" }));

    const edit = await asUser(db, SAPPHIRE, (tx) =>
      tx.query("update entry set body = 'x' where id = $1", [shared]),
    );
    expect(edit.affectedRows).toBe(0);

    const deleteDraft = await asUser(db, SAPPHIRE, (tx) =>
      tx.query("delete from entry where id = $1", [draft]),
    );
    expect(deleteDraft.affectedRows).toBe(0);

    const deleteShared = await asUser(db, SAPPHIRE, (tx) =>
      tx.query("delete from entry where id = $1", [shared]),
    );
    expect(deleteShared.affectedRows).toBe(1);
  });

  it("the app role cannot read credentials, sessions or invitations at all", async () => {
    for (const table of ["app_user", "session", "invitation", "processed_mutation"]) {
      await expect(
        asUser(db, RUBY, (tx) => tx.query(`select * from ${table}`)),
      ).rejects.toMatchObject({
        code: "42501",
      });
    }
  });
});

describe("tombstones: deleted ids can never return (P-05)", () => {
  it("deleting writes a tombstone and blocks re-insertion of the same id", async () => {
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    await asUser(db, RUBY, (tx) => tx.query("delete from entry where id = $1", [id]));
    const tomb = await db.query(
      "select 1 from tombstone where entity_type = 'entry' and entity_id = $1",
      [id],
    );
    expect(tomb.rows).toHaveLength(1);

    await expect(asUser(db, RUBY, (tx) => insertEntry(tx, { id }))).rejects.toMatchObject({
      code: "GN410",
    });
    await expect(insertEntry(db, { id })).rejects.toMatchObject({ code: "GN410" }); // even privileged
  });
});

describe("media lifecycle (§11)", () => {
  const insertMedia = (
    tx: Transaction | PGlite,
    entry: string,
    relationship = GARNET,
    uploader = RUBY,
  ) =>
    tx.query(
      `insert into media (id, entry_id, relationship_id, uploader_id, object_key, content_type, byte_size)
       values ($1, $2, $3, $4, $5, 'image/jpeg', 1024)`,
      [freshId(), entry, relationship, uploader, `obj/${randomBytes(16).toString("hex")}`],
    );

  it("deleting an entry cascades to its media and enqueues storage purges", async () => {
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    await asUser(db, RUBY, async (tx) => {
      await insertMedia(tx, id);
      await insertMedia(tx, id);
    });
    const keys = (
      await db.query<{ object_key: string }>("select object_key from media where entry_id = $1", [
        id,
      ])
    ).rows;
    await asUser(db, SAPPHIRE, (tx) => tx.query("delete from entry where id = $1", [id]));

    expect((await db.query("select 1 from media where entry_id = $1", [id])).rows).toHaveLength(0);
    const queued = await db.query<{ object_key: string }>(
      "select object_key from media_purge_queue where object_key = any($1)",
      [keys.map((k) => k.object_key)],
    );
    expect(queued.rows).toHaveLength(2);
  });

  it("media can never point at an entry in another relationship", async () => {
    const id = await insertEntry(db, { visibility: "shared" });
    await expect(insertMedia(db, id, QUARTZ)).rejects.toMatchObject({ code: "23503" });
  });

  it("only the entry's author can attach media", async () => {
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    await expect(
      asUser(db, SAPPHIRE, (tx) => insertMedia(tx, id, GARNET, SAPPHIRE)),
    ).rejects.toMatchObject({
      code: "42501",
    });
  });
});

describe("recap reveal and sharing rules (§4)", () => {
  it("revealed entries are read-only but can still be deleted", async () => {
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    await db.query("update entry set revealed_at = now() where id = $1", [id]); // recap job
    await expect(
      asUser(db, RUBY, (tx) => tx.query("update entry set body = 'changed' where id = $1", [id])),
    ).rejects.toMatchObject({ code: "GN423" });
    const deleted = await asUser(db, RUBY, (tx) =>
      tx.query("delete from entry where id = $1", [id]),
    );
    expect(deleted.affectedRows).toBe(1);
  });

  it("a shared entry can never be made private again", async () => {
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "shared" }));
    await expect(
      asUser(db, RUBY, (tx) =>
        tx.query("update entry set visibility = 'private', shared_at = null where id = $1", [id]),
      ),
    ).rejects.toMatchObject({ code: "GN422" });
  });

  it("every update increments the version used for optimistic concurrency", async () => {
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx));
    await asUser(db, RUBY, (tx) => tx.query("update entry set body = 'v2' where id = $1", [id]));
    const row = await db.query<{ version: number }>("select version from entry where id = $1", [
      id,
    ]);
    expect(row.rows[0]?.version).toBe(2);
  });
});

describe("change feed audience (sync)", () => {
  const feedFor = (user: string, entry: string) =>
    asUser(
      db,
      user,
      async (tx) =>
        (
          await tx.query<{ op: string; mutation_id: string | null }>(
            "select op, mutation_id from change_log where entity_id = $1 order by seq",
            [entry],
          )
        ).rows,
    );

  it("private draft activity never appears in the partner's feed, even its deletion", async () => {
    const mutation = freshId();
    const id = await asUser(db, RUBY, (tx) => insertEntry(tx, { visibility: "private" }), mutation);
    await asUser(db, RUBY, (tx) => tx.query("delete from entry where id = $1", [id]));

    expect(await feedFor(RUBY, id)).toEqual([
      { op: "upsert", mutation_id: mutation },
      { op: "delete", mutation_id: null },
    ]);
    expect(await feedFor(SAPPHIRE, id)).toEqual([]);
  });

  it("sharing makes the entry appear in the partner's feed from that point", async () => {
    const id = await asUser(db, RUBY, (tx) =>
      insertEntry(tx, { visibility: "private", body: "draft words" }),
    );
    await asUser(db, RUBY, (tx) =>
      tx.query("update entry set visibility = 'shared', shared_at = now() where id = $1", [id]),
    );
    expect((await feedFor(SAPPHIRE, id)).map((r) => r.op)).toEqual(["upsert"]);
    expect(await feedFor(AMETHYST, id)).toEqual([]);
  });
});

describe("Shared Spark stores no blame (P-09)", () => {
  it("shared_day has no per-partner columns", async () => {
    const cols = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'shared_day' order by ordinal_position",
    );
    expect(cols.rows.map((c) => c.column_name)).toEqual([
      "relationship_id",
      "day",
      "kind",
      "finalized_at",
    ]);
  });

  it("only members can read a relationship's days and milestones", async () => {
    await db.query(
      "insert into shared_day (relationship_id, day, kind) values ($1, '2026-11-01', 'connected')",
      [GARNET],
    );
    const read = (u: string) =>
      asUser(db, u, (tx) =>
        tx.query("select * from shared_day where relationship_id = $1", [GARNET]),
      );
    expect((await read(SAPPHIRE)).rows).toHaveLength(1);
    expect((await read(JASPER)).rows).toHaveLength(0);
  });
});

describe("Open When letters", () => {
  it("the recipient cannot see a draft letter, only a sealed one", async () => {
    const id = freshId();
    await asUser(db, RUBY, (tx) =>
      tx.query(
        `insert into open_when_letter (id, relationship_id, author_id, recipient_id, prompt, body)
         values ($1, $2, $3, $4, 'Open when you miss me', 'I am right here')`,
        [id, GARNET, RUBY, SAPPHIRE],
      ),
    );
    const read = () =>
      asUser(db, SAPPHIRE, (tx) => tx.query("select id from open_when_letter where id = $1", [id]));
    expect((await read()).rows).toHaveLength(0);
    await db.query(
      "update open_when_letter set status = 'sealed', sealed_at = now() where id = $1",
      [id],
    );
    expect((await read()).rows).toHaveLength(1);
  });
});

describe("KNOWN GAP — Open When body visibility (characterization, not a fix)", () => {
  // The spec says a sealed letter's body stays closed until the recipient opens it. The draft RLS
  // does NOT enforce this; enforcement must live at the API/data-access layer and is unverified.
  // This test pins the current behaviour so the gap cannot be forgotten or silently misreported.
  // If enforcement is added to the database, this test must fail, and the docs must be updated.
  it("the recipient can currently read the BODY of a sealed, unopened letter at the database level", async () => {
    const id = freshId();
    await asUser(db, RUBY, (tx) =>
      tx.query(
        `insert into open_when_letter (id, relationship_id, author_id, recipient_id, prompt, body)
         values ($1, $2, $3, $4, 'Open when you need a laugh', 'the secret joke')`,
        [id, GARNET, RUBY, SAPPHIRE],
      ),
    );
    await db.query(
      "update open_when_letter set status = 'sealed', sealed_at = now() where id = $1",
      [id],
    );
    const read = await asUser(db, SAPPHIRE, (tx) =>
      tx.query<{ body: string; status: string }>(
        "select body, status from open_when_letter where id = $1",
        [id],
      ),
    );
    expect(read.rows).toEqual([{ body: "the secret joke", status: "sealed" }]);
  });
});

describe("preferences default to privacy (§2, §5)", () => {
  it("generic lock-screen previews and quiet hours on; private to the user", async () => {
    await asUser(db, RUBY, (tx) =>
      tx.query("insert into user_preference (user_id) values ($1)", [RUBY]),
    );
    const mine = await asUser(db, RUBY, (tx) =>
      tx.query<{ lock_screen_preview: string; quiet_hours_enabled: boolean }>(
        "select lock_screen_preview, quiet_hours_enabled from user_preference",
      ),
    );
    expect(mine.rows).toEqual([{ lock_screen_preview: "generic", quiet_hours_enabled: true }]);
    const theirs = await asUser(db, SAPPHIRE, (tx) => tx.query("select * from user_preference"));
    expect(theirs.rows).toHaveLength(0);
  });
});
