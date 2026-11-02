/**
 * The probe harness (B-23, AGENTS.md §6): every endpoint ships with a cross-relationship and a
 * partner-private probe. A route that is neither listed as public nor probed here fails this
 * file, so a new endpoint can't land without its privacy tests. Every private route is also
 * checked against every kind of bad session automatically.
 */
import { DEV_RELATIONSHIP_ID } from "@garnet/db";
import { Kysely, PostgresDialect, sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asViewer, type Database } from "../src/db/database";
import { bearer, DEV_PEOPLE, startTestApi, STRANGER, type TestApi } from "./harness";
import { pglitePool } from "./pglite-pool";

/** Routes anyone may call. Keep this list short and obvious. */
const PUBLIC_ROUTES = new Set(["GET /v1/health"]);

/**
 * For each private route: what a stranger (another relationship) and the partner get. "Not
 * yours" must look exactly like "not found", and partner-private data must never show.
 */
const PROBES: Record<string, (api: TestApi) => Promise<void>> = {
  "GET /v1/me": async (api) => {
    const stranger = await api.inject({
      method: "GET",
      url: "/v1/me",
      headers: bearer(api.tokens.stranger),
    });
    expect(stranger.json()).toEqual({
      userId: STRANGER.id,
      relationshipId: STRANGER.relationshipId,
    });
    const partner = await api.inject({
      method: "GET",
      url: "/v1/me",
      headers: bearer(api.tokens.noah),
    });
    expect(partner.json()).toEqual({
      userId: DEV_PEOPLE.noah.id,
      relationshipId: DEV_RELATIONSHIP_ID,
    });
  },
};

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

describe("probe harness (B-23)", () => {
  it("knows every route: each one is public or has probes", () => {
    expect(api.routes.length).toBeGreaterThan(0);
    for (const route of api.routes) {
      expect(PUBLIC_ROUTES.has(route) || route in PROBES, `${route} needs probes`).toBe(true);
    }
    for (const route of [...PUBLIC_ROUTES, ...Object.keys(PROBES)])
      expect(api.routes, `${route} is listed but no longer exists`).toContain(route);
  });

  it("refuses every private route without a live session, the same way each time", async () => {
    const bad = [
      {},
      { authorization: "Bearer nope" },
      bearer(api.tokens.revoked),
      bearer(api.tokens.expired),
    ];
    for (const route of api.routes.filter((r) => !PUBLIC_ROUTES.has(r))) {
      const [method = "GET", url = "/"] = route.split(" ");
      for (const headers of bad) {
        const res = await api.inject({ method, url, headers });
        expect(res.statusCode, `${route} without a live session`).toBe(401);
        expect(res.json()).toMatchObject({ code: "unauthorized" });
      }
    }
  });

  it.each(Object.keys(PROBES))(
    "%s: a stranger and the partner see only what is theirs",
    async (route) => {
      await PROBES[route]?.(api);
    },
  );
});

describe("row-level security under asViewer (ADR-0004)", () => {
  it("limits even an unfiltered query to the viewer's own relationship", async () => {
    const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: pglitePool(api.db) }) });
    try {
      const everything = (viewer: string) =>
        asViewer(db, { userId: viewer, sessionId: "unused" }, (trx) =>
          trx.selectFrom("relationship_member").select("user_id").execute(),
        );
      const strangers = await everything(STRANGER.id);
      expect(strangers.map((r) => r.user_id)).toEqual([STRANGER.id]);
      const selams = (await everything(DEV_PEOPLE.selam.id)).map((r) => r.user_id).sort();
      expect(selams).toEqual([DEV_PEOPLE.selam.id, DEV_PEOPLE.noah.id].sort());
      // And the role really is the unprivileged one for the whole transaction.
      const role = await asViewer(db, { userId: STRANGER.id, sessionId: "unused" }, (trx) =>
        sql<{ r: string }>`select current_user as r`.execute(trx),
      );
      expect(role.rows[0]?.r).toBe("garnet_app");
    } finally {
      await db.destroy();
    }
  });
});
