/**
 * The probe harness (B-23, AGENTS.md §6): every endpoint ships with a cross-relationship and a
 * partner-private probe. A route that is neither listed as public nor probed here fails this
 * file, so a new endpoint can't land without its privacy tests. Every private route is also
 * checked against every kind of bad session automatically.
 */
import {
  TERMS_VERSION,
  createInviteResultSchema,
  devicesSchema,
  pairingStatusSchema,
  settingsViewSchema,
  setupStateSchema,
  type SetupStateDto,
} from "@garnet/contracts";
import { DEV_RELATIONSHIP_ID } from "@garnet/db";
import { Kysely, PostgresDialect, sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLIENT_HEADER } from "../src/auth/client-header";
import { asViewer, type Database } from "../src/db/database";
import {
  DEV_PEOPLE,
  SESSION_COOKIE,
  startTestApi,
  STRANGER,
  tokenOf,
  type TestApi,
} from "./harness";
import { pglitePool } from "./pglite-pool";

/**
 * Routes anyone may call. Keep this list short and obvious. Better Auth's routes are public by
 * nature (signing in needs no session); auth.test.ts covers them and the bridge's allow-list.
 */
const PUBLIC_ROUTES = new Set([
  "GET /v1/health",
  "GET /v1/sign-in-methods",
  "GET /v1/auth/*",
  "POST /v1/auth/*",
]);

async function setupOf(api: TestApi, cookie: string): Promise<SetupStateDto> {
  return setupStateSchema.parse((await api.call("GET", "/v1/me/setup", { cookie })).json());
}

/** The only fields the partner's answers may show (P-51): never nickname, avatar, alerts... */
const PARTNER_KEYS = ["birthDate", "homeCity", "name", "ready", "side", "timeZone"];

/**
 * For each private route: what a stranger (another relationship) and the partner get. "Not
 * yours" must look exactly like "not found", and partner-private data must never show.
 */
const PROBES: Record<string, (api: TestApi) => Promise<void>> = {
  "GET /v1/me": async (api) => {
    const stranger = await api.call("GET", "/v1/me", { cookie: api.cookies.stranger });
    expect(stranger.json()).toEqual({
      userId: STRANGER.id,
      relationshipId: STRANGER.relationshipId,
    });
    const partner = await api.call("GET", "/v1/me", { cookie: api.cookies.noah });
    expect(partner.json()).toEqual({
      userId: DEV_PEOPLE.noah.id,
      relationshipId: DEV_RELATIONSHIP_ID,
    });
  },

  "GET /v1/me/setup": async (api) => {
    await api.call("PATCH", "/v1/me/setup", {
      cookie: api.cookies.selam,
      body: { nickname: "Sunshine", timeZone: "Africa/Addis_Ababa" },
    });
    const stranger = await setupOf(api, api.cookies.stranger);
    expect(stranger.partner).toBeNull();
    expect(stranger.profile.displayName).toBe(STRANGER.name);
    const noah = await setupOf(api, api.cookies.noah);
    expect(noah.profile.nickname).not.toBe("Sunshine");
    expect(Object.keys(noah.partner ?? {}).sort()).toEqual(PARTNER_KEYS);
    expect(noah.partner).toMatchObject({
      name: "Selam",
      timeZone: "Africa/Addis_Ababa",
      // P-79: the partner sees the full birthday.
      birthDate: DEV_PEOPLE.selam.birthDate,
    });
    expect(JSON.stringify(noah)).not.toContain("Sunshine");
  },

  "PATCH /v1/me/setup": async (api) => {
    const before = await setupOf(api, api.cookies.noah);
    const res = await api.call("PATCH", "/v1/me/setup", {
      cookie: api.cookies.stranger,
      body: { displayName: "Not Noah", nickname: "x", appearance: "dark" },
    });
    expect(res.statusCode).toBe(204);
    // A stranger's save touches only their own row; the partner pair is unchanged.
    expect(await setupOf(api, api.cookies.noah)).toEqual(before);
    expect((await setupOf(api, api.cookies.stranger)).profile.displayName).toBe("Not Noah");
    // Nobody can set a side or completion through a save (P-51).
    for (const body of [{ side: "ruby" }, { complete: true }, { userId: DEV_PEOPLE.noah.id }]) {
      const refused = await api.call("PATCH", "/v1/me/setup", { cookie: api.cookies.selam, body });
      expect(refused.statusCode).toBe(400);
      expect(refused.json()).toMatchObject({ code: "validation_failed" });
    }
  },

  "POST /v1/me/setup/side": async (api) => {
    const selam = await api.call("POST", "/v1/me/setup/side", {
      cookie: api.cookies.selam,
      body: { side: "ruby" },
    });
    expect(selam.json()).toEqual({ ok: true });
    // Another relationship's sides never collide with this one's.
    const stranger = await api.call("POST", "/v1/me/setup/side", {
      cookie: api.cookies.stranger,
      body: { side: "ruby" },
    });
    expect(stranger.json()).toEqual({ ok: true });
    // The partner learns only that the side is taken, and which (P-51).
    const noah = await api.call("POST", "/v1/me/setup/side", {
      cookie: api.cookies.noah,
      body: { side: "ruby" },
    });
    expect(noah.json()).toEqual({ ok: false, reason: "taken", partnerSide: "ruby" });
    expect((await setupOf(api, api.cookies.noah)).profile.side).not.toBe("ruby");
  },

  "POST /v1/me/setup/together-since": async (api) => {
    const set = await api.call("POST", "/v1/me/setup/together-since", {
      cookie: api.cookies.selam,
      body: { togetherSince: "2021-05-02" },
    });
    expect(set.statusCode).toBe(204);
    // One answer for the pair: the partner sees it, a stranger's own relationship doesn't.
    expect((await setupOf(api, api.cookies.noah)).togetherSince).toBe("2021-05-02");
    expect((await setupOf(api, api.cookies.stranger)).togetherSince).toBeNull();
    const alone = await api.call("POST", "/v1/me/setup/together-since", {
      cookie: api.cookies.stranger,
      body: { togetherSince: "2020-01-01" },
    });
    expect(alone.statusCode).toBe(400);
    expect((await setupOf(api, api.cookies.selam)).togetherSince).toBe("2021-05-02");
  },

  "GET /v1/me/registration": async (api) => {
    for (const cookie of [api.cookies.stranger, api.cookies.noah]) {
      const res = await api.call("GET", "/v1/me/registration", { cookie });
      expect(res.json()).toMatchObject({ complete: true });
    }
    const noah = await api.call("GET", "/v1/me/registration", { cookie: api.cookies.noah });
    // Only one's own: Noah's birthday, never Selam's.
    expect(noah.json()).toMatchObject({ birthDate: DEV_PEOPLE.noah.birthDate });
  },

  "POST /v1/me/registration": async (api) => {
    const res = await api.call("POST", "/v1/me/registration", {
      cookie: api.cookies.stranger,
      body: { birthDate: "1990-01-01", termsVersion: TERMS_VERSION },
    });
    expect(res.json()).toEqual({ ok: true });
    // The stranger's change is theirs alone.
    const noah = await api.call("GET", "/v1/me/registration", { cookie: api.cookies.noah });
    expect(noah.json()).toMatchObject({ birthDate: DEV_PEOPLE.noah.birthDate });
    const selam = await setupOf(api, api.cookies.noah);
    expect(selam.partner?.birthDate).toBe(DEV_PEOPLE.selam.birthDate);
  },

  "GET /v1/me/settings": async (api) => {
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.selam,
      body: { partnerNickname: "Honey", customGreeting: "Morning, {name}" },
    });
    // Neither the partner nor a stranger can see it, by any route.
    for (const cookie of [api.cookies.noah, api.cookies.stranger]) {
      const res = await api.call("GET", "/v1/me/settings", { cookie });
      expect(res.body).not.toContain("Honey");
      expect(res.body).not.toContain(DEV_PEOPLE.selam.email);
      const setup = await api.call("GET", "/v1/me/setup", { cookie });
      expect(setup.body).not.toContain("Honey");
    }
    const own = settingsViewSchema.parse(
      (await api.call("GET", "/v1/me/settings", { cookie: api.cookies.selam })).json(),
    );
    expect(own.settings.partnerNickname).toBe("Honey");
    expect(own.account.email).toBe(DEV_PEOPLE.selam.email);
    // The partner appears only as a name, a side and a zone.
    expect(Object.keys(own.partner ?? {}).sort()).toEqual(["name", "side", "zone"]);
  },

  "PATCH /v1/me/settings": async (api) => {
    const noah = (await api.call("GET", "/v1/me/settings", { cookie: api.cookies.noah })).body;
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.stranger,
      body: { previews: "full", sound: false },
    });
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.selam,
      body: { sound: false, userId: DEV_PEOPLE.noah.id },
    });
    // One person's save never touches another's, and no request can name someone else.
    expect((await api.call("GET", "/v1/me/settings", { cookie: api.cookies.noah })).body).toBe(
      noah,
    );
  },

  "PATCH /v1/me/account": async (api) => {
    const res = await api.call("PATCH", "/v1/me/account", {
      cookie: api.cookies.stranger,
      body: { birthDate: "1991-02-03" },
    });
    expect(res.statusCode).toBe(204);
    const selam = await setupOf(api, api.cookies.noah);
    expect(selam.partner?.birthDate).toBe(DEV_PEOPLE.selam.birthDate);
    const named = await api.call("PATCH", "/v1/me/account", {
      cookie: api.cookies.noah,
      body: { birthDate: "1991-02-03", userId: DEV_PEOPLE.selam.id },
    });
    expect(named.statusCode).toBe(400);
  },

  "GET /v1/me/sign-in-methods": async (api) => {
    const res = await api.call("GET", "/v1/me/sign-in-methods", { cookie: api.cookies.noah });
    expect(res.json()).toEqual({
      password: true,
      google: { available: false, connected: false },
      apple: { available: false, connected: false },
    });
  },

  "DELETE /v1/me/sign-in-methods/:provider": async (api) => {
    // Someone else's connection can't be reached: only the caller's own accounts are looked at.
    const ctx = await api.auth.$context;
    await ctx.internalAdapter.linkAccount({
      providerId: "google",
      accountId: "google-sub-probe",
      userId: DEV_PEOPLE.selam.id,
    });
    const other = await api.call("DELETE", "/v1/me/sign-in-methods/google", {
      cookie: api.cookies.stranger,
    });
    expect(other.statusCode).toBe(404);
    expect(
      (await api.db.query("select 1 from account where account_id = 'google-sub-probe'")).rows,
    ).toHaveLength(1);
  },

  "GET /v1/me/devices": async (api) => {
    const noah = devicesSchema.parse(
      (await api.call("GET", "/v1/me/devices", { cookie: api.cookies.noah })).json(),
    );
    const selamSessions = await api.db.query<{ id: string }>(
      "select id from session where user_id = $1",
      [DEV_PEOPLE.selam.id],
    );
    for (const row of selamSessions.rows)
      expect(noah.devices.map((d) => d.id)).not.toContain(row.id);
  },

  "POST /v1/me/devices/sign-out-others": async (api) => {
    const person = await api.newAccount("Rae");
    await api.call("POST", "/v1/me/devices/sign-out-others", { cookie: person.cookie, body: {} });
    // Only their own: the couple stay signed in.
    expect((await api.call("GET", "/v1/me", { cookie: api.cookies.selam })).statusCode).toBe(200);
    expect((await api.call("GET", "/v1/me", { cookie: api.cookies.noah })).statusCode).toBe(200);
  },

  "DELETE /v1/me/devices/:id": async (api) => {
    const noahs = devicesSchema.parse(
      (await api.call("GET", "/v1/me/devices", { cookie: api.cookies.noah })).json(),
    );
    const id = noahs.devices[0]?.id ?? "";
    // A partner's device reads like one that doesn't exist.
    const partner = await api.call("DELETE", `/v1/me/devices/${id}`, { cookie: api.cookies.selam });
    const nothing = await api.call(
      "DELETE",
      "/v1/me/devices/0192f0a0-0000-7000-8000-00000000ffff",
      { cookie: api.cookies.selam },
    );
    expect(partner.statusCode).toBe(404);
    expect(nothing.statusCode).toBe(404);
    expect((await api.call("GET", "/v1/me", { cookie: api.cookies.noah })).statusCode).toBe(200);
  },

  "POST /v1/me/setup/complete": async (api) => {
    const missing = await api.call("POST", "/v1/me/setup/complete", {
      cookie: api.cookies.stranger,
    });
    expect(missing.json()).toMatchObject({ ok: false });
    await api.call("PATCH", "/v1/me/setup", {
      cookie: api.cookies.stranger,
      body: { done: ["name", "time", "alerts"] },
    });
    await api.call("POST", "/v1/me/setup/side", {
      cookie: api.cookies.stranger,
      body: { side: "sapphire" },
    });
    const done = await api.call("POST", "/v1/me/setup/complete", {
      cookie: api.cookies.stranger,
    });
    expect(done.json()).toEqual({ ok: true });
    // Readiness shows only to one's own partner: the stranger has none, Selam's is unaffected.
    expect((await setupOf(api, api.cookies.stranger)).partner).toBeNull();
    expect((await setupOf(api, api.cookies.selam)).partner?.ready).toBe(false);
  },

  "GET /v1/pairing": async (api) => {
    const stranger = pairingStatusSchema.parse(
      (await api.call("GET", "/v1/pairing", { cookie: api.cookies.stranger })).json(),
    );
    expect(stranger.partnerName).toBeNull();
    const noah = pairingStatusSchema.parse(
      (await api.call("GET", "/v1/pairing", { cookie: api.cookies.noah })).json(),
    );
    expect(noah).toMatchObject({ me: "Noah", partnerName: "Selam", invite: null });
  },

  "POST /v1/invitations": async (api) => {
    // Already paired: nothing to invite into.
    const paired = await api.call("POST", "/v1/invitations", { cookie: api.cookies.selam });
    expect(paired.statusCode).toBe(400);
    const made = await api.call("POST", "/v1/invitations", { cookie: api.cookies.stranger });
    const { code } = createInviteResultSchema.parse(made.json());
    // The code is never stored or shown again: only its hash is in the database.
    const stored = await api.db.query("select 1 from invitation where token_hash::text like $1", [
      `%${code}%`,
    ]);
    expect(stored.rows).toEqual([]);
    const later = pairingStatusSchema.parse(
      (await api.call("GET", "/v1/pairing", { cookie: api.cookies.stranger })).json(),
    );
    expect(JSON.stringify(later)).not.toContain(code);
    // The paired couple see nothing of it.
    const noah = await api.call("GET", "/v1/pairing", { cookie: api.cookies.noah });
    expect(noah.json()).toMatchObject({ invite: null });
  },

  "DELETE /v1/invitations": async (api) => {
    const inviter = await api.newAccount("Lia");
    const { code } = createInviteResultSchema.parse(
      (await api.call("POST", "/v1/invitations", { cookie: inviter.cookie })).json(),
    );
    // Someone else withdrawing withdraws only their own.
    const other = await api.call("DELETE", "/v1/invitations", { cookie: api.cookies.stranger });
    expect(other.statusCode).toBe(204);
    const joiner = await api.newAccount("Kai");
    const check = await api.call("POST", "/v1/invitations/check", {
      cookie: joiner.cookie,
      body: { code },
    });
    expect(check.json()).toEqual({ ok: true, inviterName: "Lia" });
    await api.call("DELETE", "/v1/invitations", { cookie: inviter.cookie });
    const gone = await api.call("POST", "/v1/invitations/check", {
      cookie: joiner.cookie,
      body: { code },
    });
    expect(gone.json()).toEqual({ ok: false });
  },

  "POST /v1/invitations/check": async (api) => {
    const inviter = await api.newAccount("Mo");
    const { code } = createInviteResultSchema.parse(
      (await api.call("POST", "/v1/invitations", { cookie: inviter.cookie })).json(),
    );
    // Someone already paired learns nothing from a real code: the same answer as a wrong one.
    const partner = await api.call("POST", "/v1/invitations/check", {
      cookie: api.cookies.noah,
      body: { code },
    });
    const wrong = await api.call("POST", "/v1/invitations/check", {
      cookie: api.cookies.noah,
      body: { code: "ZZZZZZZZ" },
    });
    expect(partner.json()).toEqual({ ok: false });
    expect(partner.body).toBe(wrong.body);
  },

  "POST /v1/invitations/accept": async (api) => {
    const inviter = await api.newAccount("Ari");
    const { code } = createInviteResultSchema.parse(
      (await api.call("POST", "/v1/invitations", { cookie: inviter.cookie })).json(),
    );
    // A third person can't join a pair: Noah stays with Selam, the inviter stays unpaired.
    const noah = await api.call("POST", "/v1/invitations/accept", {
      cookie: api.cookies.noah,
      body: { code },
    });
    expect(noah.json()).toEqual({ ok: false });
    expect((await api.call("GET", "/v1/me", { cookie: api.cookies.noah })).json()).toMatchObject({
      relationshipId: DEV_RELATIONSHIP_ID,
    });
    const status = await api.call("GET", "/v1/pairing", { cookie: inviter.cookie });
    expect(status.json()).toMatchObject({ partnerName: null });
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
      { cookie: `${SESSION_COOKIE}=nope` },
      { cookie: `${SESSION_COOKIE}=${tokenOf(api.cookies.selam)}` },
      { cookie: api.cookies.revoked },
      { cookie: api.cookies.expired },
    ];
    for (const route of api.routes.filter((r) => !PUBLIC_ROUTES.has(r))) {
      const [method = "GET", url = "/"] = route.split(" ");
      for (const headers of bad) {
        const res = await api.inject({
          method,
          url,
          headers: { ...headers, [CLIENT_HEADER.name]: CLIENT_HEADER.value },
        });
        expect(res.statusCode, `${route} without a live session`).toBe(401);
        expect(res.json()).toMatchObject({ code: "unauthorized" });
      }
    }
  });

  it("refuses every change without the app's header, even with a live session (CSRF)", async () => {
    for (const route of api.routes.filter((r) => !PUBLIC_ROUTES.has(r) && !r.startsWith("GET"))) {
      const [method = "POST", url = "/"] = route.split(" ");
      const res = await api.inject({
        method,
        url,
        headers: { cookie: api.cookies.selam, "content-type": "application/json" },
        payload: "{}",
      });
      expect(res.statusCode, `${route} without the app header`).toBe(400);
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
        asViewer(db, { userId: viewer, sessionId: "unused", name: "x" }, (trx) =>
          trx.selectFrom("relationship_member").select("user_id").execute(),
        );
      const strangers = await everything(STRANGER.id);
      expect(strangers.map((r) => r.user_id)).toEqual([STRANGER.id]);
      const selams = (await everything(DEV_PEOPLE.selam.id)).map((r) => r.user_id).sort();
      expect(selams).toEqual([DEV_PEOPLE.selam.id, DEV_PEOPLE.noah.id].sort());
      // Profiles too: only one's own row, even unfiltered.
      const profiles = await asViewer(
        db,
        { userId: DEV_PEOPLE.noah.id, sessionId: "unused", name: "x" },
        (trx) => trx.selectFrom("profile").select("user_id").execute(),
      );
      expect(profiles.map((r) => r.user_id)).toEqual([DEV_PEOPLE.noah.id]);
      // And the role really is the unprivileged one for the whole transaction.
      const role = await asViewer(
        db,
        { userId: STRANGER.id, sessionId: "unused", name: "x" },
        (trx) => sql<{ r: string }>`select current_user as r`.execute(trx),
      );
      expect(role.rows[0]?.r).toBe("garnet_app");
    } finally {
      await db.destroy();
    }
  });
});
