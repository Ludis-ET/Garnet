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
  type ChangeFeedResponse,
  type DayDetailResponse,
  type DaysOverviewResponse,
  type EntryDto,
  type SendSignalResponse,
  type SignalHistoryResponse,
  type SetupStateDto,
  type UsOverviewResponse,
  type ChatMessageDto,
  type ChatMessagesResponse,
  type ChatPresenceResponse,
  type ChatSettingsResponse,
  type ConversationSummaryResponse,
  type SearchChatResponse,
  type NotificationsListResponse,
} from "@garnet/contracts";
import { DEV_RELATIONSHIP_ID } from "@garnet/db";
import { Kysely, PostgresDialect, sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLIENT_HEADER } from "../src/auth/client-header";
import { asViewer, type Database } from "../src/db/database";
import {
  DEV_PEOPLE,
  PASSWORD,
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
  "GET /health",
  "GET /v1/health",
  "GET /v1/sign-in-methods",
  "GET /v1/auth/*",
  "POST /v1/auth/*",
  "GET /v1/me/export/download/:token",
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

  "POST /v1/mutations": async (api) => {
    // Stranger's mutation creates in their own relationship only
    const entryId = "0192f0a0-0000-7000-8000-000000009001";
    const mutationId = "0192f0a0-0000-7000-8000-000000009002";
    const res = await api.call("POST", "/v1/mutations", {
      cookie: api.cookies.stranger,
      body: {
        mutations: [
          {
            kind: "create",
            mutationId,
            entryId,
            entryKind: "text",
            body: "Stranger thought",
            visibility: "shared",
            occurredAt: "2026-11-05T12:00:00Z",
            occurredTimeZone: "Europe/London",
          },
        ],
      },
    });
    expect(res.statusCode).toBe(200);

    // Neither Selam nor Noah can see this entry
    const selamEntry = await api.call("GET", `/v1/entries/${entryId}`, {
      cookie: api.cookies.selam,
    });
    expect(selamEntry.statusCode).toBe(404);
    const noahEntry = await api.call("GET", `/v1/entries/${entryId}`, { cookie: api.cookies.noah });
    expect(noahEntry.statusCode).toBe(404);
  },

  "GET /v1/changes": async (api) => {
    const strangerChanges = await api.call("GET", "/v1/changes?since=0", {
      cookie: api.cookies.stranger,
    });
    expect(strangerChanges.statusCode).toBe(200);
    // Noah's or Selam's entries never enter stranger's change feed
    const body = strangerChanges.json<ChangeFeedResponse>();
    const items = body.changes;
    for (const item of items) {
      if (item.type === "upsert") {
        expect(item.entry.authorId).toBe(STRANGER.id);
      }
    }
  },

  "GET /v1/days": async (api) => {
    const strangerDays = await api.call("GET", "/v1/days", { cookie: api.cookies.stranger });
    expect(strangerDays.statusCode).toBe(200);
    // Overview has no partner for stranger
    const body = strangerDays.json<DaysOverviewResponse>();
    const days = body.days;
    for (const d of days) {
      expect(d.partner).toBe(false);
    }
  },

  "GET /v1/days/:date": async (api) => {
    const today = "2026-11-05";
    const res = await api.call("GET", `/v1/days/${today}`, { cookie: api.cookies.stranger });
    expect(res.statusCode).toBe(200);
    const body = res.json<DayDetailResponse>();
    expect(body.partner).toEqual([]);
  },

  "POST /v1/days/:date/finish": async (api) => {
    const today = "2026-11-05";
    const res = await api.call("POST", `/v1/days/${today}/finish`, {
      cookie: api.cookies.stranger,
      body: {},
    });
    expect(res.statusCode).toBe(200);
    // Stranger finishing day does not mark partnerReady for Selam or Noah
    const selamDay = await api.call("GET", `/v1/days/${today}`, { cookie: api.cookies.selam });
    const selamBody = selamDay.json<DayDetailResponse>();
    expect(selamBody.partnerReady).toBe(false);
  },

  "GET /v1/entries/:id": async (api) => {
    // 1. Cross-relationship: stranger cannot access an entry of Selam
    const entryId = "0192f0a0-0000-7000-8000-000000009003";
    await api.call("POST", "/v1/mutations", {
      cookie: api.cookies.selam,
      body: {
        mutations: [
          {
            kind: "create",
            mutationId: "0192f0a0-0000-7000-8000-000000009004",
            entryId,
            entryKind: "text",
            body: "Selam secret",
            visibility: "private",
            occurredAt: "2026-11-05T12:00:00Z",
            occurredTimeZone: "Europe/London",
          },
        ],
      },
    });

    const strangerGet = await api.call("GET", `/v1/entries/${entryId}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerGet.statusCode).toBe(404);

    // 2. Partner-private: Noah cannot access Selam's private draft
    const noahGet = await api.call("GET", `/v1/entries/${entryId}`, {
      cookie: api.cookies.noah,
    });
    expect(noahGet.statusCode).toBe(404);

    // 3. Selam herself can access it
    const selamGet = await api.call("GET", `/v1/entries/${entryId}`, {
      cookie: api.cookies.selam,
    });
    expect(selamGet.statusCode).toBe(200);
    const selamGetBody = selamGet.json<EntryDto>();
    expect(selamGetBody.body).toBe("Selam secret");
  },

  "GET /v1/us/overview": async (api) => {
    const strangerRes = await api.call("GET", "/v1/us/overview", { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(200);
    const strangerBody = strangerRes.json<UsOverviewResponse>();
    expect(strangerBody.me.name).toBe("Not Noah");
    expect(strangerBody.partner.name).toBe("Partner");
    expect(strangerBody.distance).toBeNull();
    expect(strangerBody.recent).toEqual([]);

    const selamRes = await api.call("GET", "/v1/us/overview", { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
    const selamBody = selamRes.json<UsOverviewResponse>();
    expect(selamBody.me.name).toBe("Selam");
    expect(selamBody.partner.name).toBe("Noah");
  },

  "GET /v1/signals": async (api) => {
    // Selam sends a signal
    await api.call("POST", "/v1/signals", {
      cookie: api.cookies.selam,
      body: { signal: "thought-of-you", payload: { note: "Hello Noah" } },
    });

    // Stranger cannot see Selam's signals
    const strangerRes = await api.call("GET", "/v1/signals", { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(200);
    const strangerBody = strangerRes.json<SignalHistoryResponse>();
    expect(strangerBody.signals).toEqual([]);

    // Noah can see Selam's signal
    const noahRes = await api.call("GET", "/v1/signals", { cookie: api.cookies.noah });
    expect(noahRes.statusCode).toBe(200);
    const noahBody = noahRes.json<SignalHistoryResponse>();
    expect(noahBody.signals.length).toBeGreaterThan(0);
    expect(noahBody.signals[0]?.mine).toBe(false);
  },

  "POST /v1/signals": async (api) => {
    const res = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.selam,
      body: { signal: "missing-you", payload: { level: "A little" } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<SendSignalResponse>();
    expect(body.signal).toBe("missing-you");
    expect(body.id).toBeTruthy();
  },

  "POST /v1/signals/:id/respond": async (api) => {
    // Selam sends a support signal
    const sendRes = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.selam,
      body: { signal: "need-you", payload: { need: "comfort" } },
    });
    const signalId = sendRes.json<SendSignalResponse>().id;

    // Stranger cannot respond to Selam's signal (cross-relationship isolation)
    const strangerRes = await api.call("POST", `/v1/signals/${signalId}/respond`, {
      cookie: api.cookies.stranger,
      body: { response: "here" },
    });
    expect(strangerRes.statusCode).toBe(404);

    // Noah (partner) can respond
    const noahRes = await api.call("POST", `/v1/signals/${signalId}/respond`, {
      cookie: api.cookies.noah,
      body: { response: "comfort", body: "Here for you" },
    });
    expect(noahRes.statusCode).toBe(204);
  },

  "PUT /v1/me/location": async (api) => {
    // Selam updates her coarse location
    const putRes = await api.call("PUT", "/v1/me/location", {
      cookie: api.cookies.selam,
      body: { lat: 9.03, lon: 38.74 },
    });
    expect(putRes.statusCode).toBe(204);

    // Stranger cannot see Selam's location (stranger distance remains null)
    const strangerRes = await api.call("GET", "/v1/us/overview", { cookie: api.cookies.stranger });
    const strangerBody = strangerRes.json<UsOverviewResponse>();
    expect(strangerBody.distance).toBeNull();

    // Clearing location
    const clearRes = await api.call("PUT", "/v1/me/location", {
      cookie: api.cookies.selam,
      body: { lat: null, lon: null },
    });
    expect(clearRes.statusCode).toBe(204);
  },

  "GET /v1/chat/summary": async (api) => {
    const stranger = await api.call("GET", "/v1/chat/summary", { cookie: api.cookies.stranger });
    expect(stranger.statusCode).toBe(200);
    const body = stranger.json<ConversationSummaryResponse>();
    expect(body.partner.name).not.toBe("Noah");
  },

  "GET /v1/chat/messages": async (api) => {
    const stranger = await api.call("GET", "/v1/chat/messages", { cookie: api.cookies.stranger });
    expect(stranger.statusCode).toBe(200);
    const body = stranger.json<ChatMessagesResponse>();
    expect(body.messages).toEqual([]);
  },

  "POST /v1/chat/messages": async (api) => {
    const res = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Probe message" },
    });
    expect(res.statusCode).toBe(200);
    const msg = res.json<ChatMessageDto>();

    // Stranger cannot see it
    const stranger = await api.call("GET", "/v1/chat/messages", { cookie: api.cookies.stranger });
    const strangerMsgs = stranger.json<ChatMessagesResponse>().messages;
    expect(strangerMsgs.some((m) => m.id === msg.id)).toBe(false);
  },

  "PATCH /v1/chat/messages/:id": async (api) => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "To be edited" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Stranger cannot edit
    const strangerRes = await api.call("PATCH", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.stranger,
      body: { text: "Hacked" },
    });
    expect(strangerRes.statusCode).toBe(404);

    // Author can edit
    const editRes = await api.call("PATCH", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.selam,
      body: { text: "Edited safely" },
    });
    expect(editRes.statusCode).toBe(200);
  },

  "DELETE /v1/chat/messages/:id": async (api) => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "To be deleted" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Stranger cannot delete
    const strangerRes = await api.call("DELETE", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.stranger,
      body: { mode: "for-me" },
    });
    expect(strangerRes.statusCode).toBe(404);

    // Selam deletes for-me
    const delRes = await api.call("DELETE", `/v1/chat/messages/${msg.id}`, {
      cookie: api.cookies.selam,
      body: { mode: "for-me" },
    });
    expect(delRes.statusCode).toBe(204);
  },

  "POST /v1/chat/messages/:id/reactions": async (api) => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "React here" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Stranger cannot react
    const strangerRes = await api.call("POST", `/v1/chat/messages/${msg.id}/reactions`, {
      cookie: api.cookies.stranger,
      body: { emoji: "❤️" },
    });
    expect(strangerRes.statusCode).toBe(404);

    // Partner can react
    const noahRes = await api.call("POST", `/v1/chat/messages/${msg.id}/reactions`, {
      cookie: api.cookies.noah,
      body: { emoji: "❤️" },
    });
    expect(noahRes.statusCode).toBe(200);
  },

  "POST /v1/chat/messages/:id/pin": async (api) => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Pin here" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Stranger cannot pin
    const strangerRes = await api.call("POST", `/v1/chat/messages/${msg.id}/pin`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    // Partner can pin
    const noahRes = await api.call("POST", `/v1/chat/messages/${msg.id}/pin`, {
      cookie: api.cookies.noah,
    });
    expect(noahRes.statusCode).toBe(200);
  },

  "POST /v1/chat/messages/:id/save-memory": async (api) => {
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Save memory" },
    });
    const msg = sendRes.json<ChatMessageDto>();

    // Stranger cannot save
    const strangerRes = await api.call("POST", `/v1/chat/messages/${msg.id}/save-memory`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    // Selam can save
    const selamRes = await api.call("POST", `/v1/chat/messages/${msg.id}/save-memory`, {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(204);
  },

  "POST /v1/chat/read": async (api) => {
    const res = await api.call("POST", "/v1/chat/read", {
      cookie: api.cookies.selam,
    });
    expect(res.statusCode).toBe(204);
  },

  "GET /v1/chat/presence": async (api) => {
    const stranger = await api.call("GET", "/v1/chat/presence", { cookie: api.cookies.stranger });
    expect(stranger.statusCode).toBe(200);
    const body = stranger.json<ChatPresenceResponse>();
    expect(body.partnerHere).toBe(false);
  },

  "POST /v1/chat/presence/typing": async (api) => {
    const res = await api.call("POST", "/v1/chat/presence/typing", {
      cookie: api.cookies.selam,
      body: { typing: true },
    });
    expect(res.statusCode).toBe(204);
  },

  "POST /v1/chat/presence/watching": async (api) => {
    const res = await api.call("POST", "/v1/chat/presence/watching", {
      cookie: api.cookies.selam,
      body: { watching: true },
    });
    expect(res.statusCode).toBe(204);
  },

  "GET /v1/chat/settings": async (api) => {
    const res = await api.call("GET", "/v1/chat/settings", { cookie: api.cookies.selam });
    expect(res.statusCode).toBe(200);
    const body = res.json<ChatSettingsResponse>();
    expect(body).toHaveProperty("readReceipts");
    expect(body).toHaveProperty("typingIndicators");
  },

  "PATCH /v1/chat/settings": async (api) => {
    const res = await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.selam,
      body: { typingIndicators: true },
    });
    expect(res.statusCode).toBe(200);
  },

  "GET /v1/chat/pinned": async (api) => {
    const stranger = await api.call("GET", "/v1/chat/pinned", { cookie: api.cookies.stranger });
    expect(stranger.statusCode).toBe(200);
    expect(stranger.json<ChatMessagesResponse>().messages).toEqual([]);
  },

  "GET /v1/chat/shared-media": async (api) => {
    const stranger = await api.call("GET", "/v1/chat/shared-media", {
      cookie: api.cookies.stranger,
    });
    expect(stranger.statusCode).toBe(200);
    expect(stranger.json<ChatMessagesResponse>().messages).toEqual([]);
  },

  "GET /v1/chat/search": async (api) => {
    const stranger = await api.call("GET", "/v1/chat/search?q=test", {
      cookie: api.cookies.stranger,
    });
    expect(stranger.statusCode).toBe(200);
    expect(stranger.json<SearchChatResponse>().messages).toEqual([]);
  },

  "POST /v1/me/push-devices": async (api) => {
    const res = await api.call("POST", "/v1/me/push-devices", {
      cookie: api.cookies.stranger,
      body: { token: "stranger-probe-token", platform: "android" },
    });
    expect(res.statusCode).toBe(204);
  },

  "DELETE /v1/me/push-devices/:token": async (api) => {
    const res = await api.call("DELETE", "/v1/me/push-devices/stranger-probe-token", {
      cookie: api.cookies.stranger,
    });
    expect(res.statusCode).toBe(204);
  },

  "GET /v1/notifications": async (api) => {
    const res = await api.call("GET", "/v1/notifications", {
      cookie: api.cookies.stranger,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<NotificationsListResponse>().items).toEqual([]);
  },

  "PATCH /v1/notifications/:id/read": async (api) => {
    const res = await api.call(
      "PATCH",
      "/v1/notifications/0192f0a0-0000-7000-8000-000000000001/read",
      {
        cookie: api.cookies.stranger,
        body: {},
      },
    );
    expect(res.statusCode).toBe(204);
  },

  "PATCH /v1/notifications/:id/unread": async (api) => {
    const res = await api.call(
      "PATCH",
      "/v1/notifications/0192f0a0-0000-7000-8000-000000000001/unread",
      {
        cookie: api.cookies.stranger,
        body: {},
      },
    );
    expect(res.statusCode).toBe(204);
  },

  "POST /v1/notifications/read-all": async (api) => {
    const res = await api.call("POST", "/v1/notifications/read-all", {
      cookie: api.cookies.stranger,
      body: {},
    });
    expect(res.statusCode).toBe(204);
  },

  "POST /v1/media/upload": async (api) => {
    // Selam requests an upload URL for a chat message
    const res = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        entityType: "chat_message",
        entityId: "0192e2b3-5798-7521-8254-e6be95232a99",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; uploadUrl: string }>();
    expect(body.uploadUrl).toBeDefined();

    // Stranger cannot use Selam's media ID with different parameters (GN400)
    const strangerAttempt = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.stranger,
      body: {
        id: body.id,
        contentType: "image/png",
        byteSize: 2048,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        entityType: "chat_message",
        entityId: "0192e2b3-5798-7521-8254-e6be95232a99",
      },
    });
    expect(strangerAttempt.statusCode).toBe(400);
  },

  "POST /v1/media/:id/commit": async (api) => {
    // Register media for Selam
    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        entityType: "chat_message",
        entityId: "0192e2b3-5798-7521-8254-e6be95232a98",
      },
    });
    const { id } = upRes.json<{ id: string }>();

    // Stranger cannot commit Selam's media
    const strangerCommit = await api.call("POST", `/v1/media/${id}/commit`, {
      cookie: api.cookies.stranger,
      body: { entityId: "0192e2b3-5798-7521-8254-e6be95232a98" },
    });
    expect(strangerCommit.json()).toMatchObject({ status: "rejected", reason: "not-found" });
  },

  "GET /v1/media/:id/url": async (api) => {
    // Register and prepare media for Selam
    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        entityType: "chat_message",
        entityId: "0192e2b3-5798-7521-8254-e6be95232a97",
      },
    });
    const { id } = upRes.json<{ id: string }>();

    // Selam can read her own URL even when pending
    const selamUrl = await api.call("GET", `/v1/media/${id}/url`, {
      cookie: api.cookies.selam,
    });
    expect(selamUrl.statusCode).toBe(200);

    // Stranger cannot access Selam's media
    const strangerUrl = await api.call("GET", `/v1/media/${id}/url`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerUrl.statusCode).toBe(404);
  },

  "DELETE /v1/media/:id": async (api) => {
    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: 1024,
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        entityType: "chat_message",
        entityId: "0192e2b3-5798-7521-8254-e6be95232a96",
      },
    });
    const { id } = upRes.json<{ id: string }>();

    // Stranger trying to delete Selam's media affects nothing
    const strangerDel = await api.call("DELETE", `/v1/media/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerDel.statusCode).toBe(204);

    // Media still exists for Selam
    const stillThere = await api.call("GET", `/v1/media/${id}/url`, {
      cookie: api.cookies.selam,
    });
    expect(stillThere.statusCode).toBe(200);

    // Selam deletes her media
    const selamDel = await api.call("DELETE", `/v1/media/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(selamDel.statusCode).toBe(204);
  },

  "POST /v1/media/admin/purge": async (api) => {
    const res = await api.call("POST", "/v1/media/admin/purge", {
      cookie: api.cookies.selam,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("purged");
  },

  // --- Moments: Open When Letters --------------------------------------------

  "GET /v1/letters": async (api) => {
    const strangerRes = await api.call("GET", "/v1/letters", { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("GET", "/v1/letters", { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
    expect(Array.isArray(selamRes.json())).toBe(true);
  },

  "POST /v1/letters/draft": async (api) => {
    const strangerRes = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.stranger,
      body: { prompt: "Open when you miss me", body: "Thinking of you" },
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when you miss me", body: "Thinking of you" },
    });
    expect(selamRes.statusCode).toBe(201);
    expect(selamRes.json()).toHaveProperty("id");
  },

  "GET /v1/letters/:id": async (api) => {
    const create = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when probe get", body: "Secret draft" },
    });
    const { id } = create.json<{ id: string }>();

    // Stranger cannot read
    const strangerRes = await api.call("GET", `/v1/letters/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    // Partner Noah cannot read draft (drafts are private to author!)
    const noahRes = await api.call("GET", `/v1/letters/${id}`, { cookie: api.cookies.noah });
    expect(noahRes.statusCode).toBe(404);

    // Author Selam can read
    const selamRes = await api.call("GET", `/v1/letters/${id}`, { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
  },

  "PATCH /v1/letters/:id": async (api) => {
    const create = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when probe patch", body: "Draft v1" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("PATCH", `/v1/letters/${id}`, {
      cookie: api.cookies.stranger,
      body: { body: "Hacked" },
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("PATCH", `/v1/letters/${id}`, {
      cookie: api.cookies.selam,
      body: { body: "Draft v2" },
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ body: string }>().body).toBe("Draft v2");
  },

  "POST /v1/letters/:id/seal": async (api) => {
    const create = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when probe seal", body: "To be sealed" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("POST", `/v1/letters/${id}/seal`, {
      cookie: api.cookies.stranger,
      body: { unlockRule: { type: "manual" } },
    });
    expect(strangerRes.statusCode).toBe(404);

    const sealRes = await api.call("POST", `/v1/letters/${id}/seal`, {
      cookie: api.cookies.selam,
      body: { unlockRule: { type: "manual" } },
    });
    expect(sealRes.statusCode).toBe(201);
    expect(sealRes.json<{ status: string }>().status).toBe("sealed");
  },

  "POST /v1/letters/:id/open": async (api) => {
    const create = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when probe open", body: "A gift of words" },
    });
    const { id } = create.json<{ id: string }>();
    await api.call("POST", `/v1/letters/${id}/seal`, {
      cookie: api.cookies.selam,
      body: { unlockRule: { type: "manual" } },
    });

    // Stranger cannot open
    const strangerRes = await api.call("POST", `/v1/letters/${id}/open`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(201);
    expect(strangerRes.json<{ ok: boolean }>().ok).toBe(false);

    // Recipient Noah opens it
    const openRes = await api.call("POST", `/v1/letters/${id}/open`, {
      cookie: api.cookies.noah,
    });
    expect(openRes.statusCode).toBe(201);
    const openData = openRes.json<{ ok: boolean; view: { body: string } }>();
    expect(openData.ok).toBe(true);
    expect(openData.view.body).toBe("A gift of words");
  },

  "DELETE /v1/letters/:id": async (api) => {
    const create = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when probe delete", body: "Will be deleted" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/letters/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    const delRes = await api.call("DELETE", `/v1/letters/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(delRes.statusCode).toBe(200);
  },

  // --- Moments: Surprises ----------------------------------------------------

  "GET /v1/surprises": async (api) => {
    const strangerRes = await api.call("GET", "/v1/surprises", { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("GET", "/v1/surprises", { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json()).toHaveProperty("items");
  },

  "POST /v1/surprises": async (api) => {
    const surpriseInput = {
      content: { kind: "idea", textContent: "Sunset picnic" },
      safeTitle: "Weekend surprise",
      reveal: { kind: "now" },
    };

    const strangerRes = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.stranger,
      body: surpriseInput,
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: surpriseInput,
    });
    expect(selamRes.statusCode).toBe(201);
    expect(selamRes.json()).toHaveProperty("id");
  },

  "GET /v1/surprises/:id": async (api) => {
    const create = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: {
        content: { kind: "idea", textContent: "Stargazing trip" },
        safeTitle: "Under the stars",
        reveal: { kind: "now" },
      },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", `/v1/surprises/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("GET", `/v1/surprises/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
  },

  "POST /v1/surprises/:id/open": async (api) => {
    const create = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: {
        content: { kind: "song", textContent: "A special melody" },
        safeTitle: "Music for you",
        reveal: { kind: "now" },
      },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("POST", `/v1/surprises/${id}/open`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    // Recipient Noah opens it
    const openRes = await api.call("POST", `/v1/surprises/${id}/open`, {
      cookie: api.cookies.noah,
    });
    expect(openRes.statusCode).toBe(201);
    const openSurprise = openRes.json<{ state: string; content: { textContent: string } }>();
    expect(openSurprise.state).toBe("opened");
    expect(openSurprise.content.textContent).toBe("A special melody");
  },

  "PATCH /v1/surprises/:id/retitle": async (api) => {
    const create = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: {
        content: { kind: "idea", textContent: "Secret" },
        safeTitle: "Old title",
        reveal: { kind: "now" },
      },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("PATCH", `/v1/surprises/${id}/retitle`, {
      cookie: api.cookies.stranger,
      body: { safeTitle: "Hacked title" },
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("PATCH", `/v1/surprises/${id}/retitle`, {
      cookie: api.cookies.selam,
      body: { safeTitle: "New sweet title" },
    });
    expect(selamRes.statusCode).toBe(200);
  },

  "POST /v1/surprises/:id/cancel": async (api) => {
    const create = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: {
        content: { kind: "idea", textContent: "Secret" },
        safeTitle: "Cancel test",
        reveal: { kind: "now" },
      },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("POST", `/v1/surprises/${id}/cancel`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    const cancelRes = await api.call("POST", `/v1/surprises/${id}/cancel`, {
      cookie: api.cookies.selam,
    });
    expect(cancelRes.statusCode).toBe(201);
  },

  "DELETE /v1/surprises/:id": async (api) => {
    const create = await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: {
        content: { kind: "idea", textContent: "Secret" },
        safeTitle: "Delete test",
        reveal: { kind: "now" },
      },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/surprises/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    const delRes = await api.call("DELETE", `/v1/surprises/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(delRes.statusCode).toBe(200);
  },

  // --- Moments: Events & Chapters --------------------------------------------

  "GET /v1/events": async (api) => {
    const strangerRes = await api.call("GET", "/v1/events", { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("GET", "/v1/events", { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json()).toHaveProperty("events");
  },

  "POST /v1/events": async (api) => {
    const eventInput = {
      title: "Trip to Hawassa",
      kind: "travel",
      firstDate: "2026-12-20",
      repeats: "none",
    };

    const strangerRes = await api.call("POST", "/v1/events", {
      cookie: api.cookies.stranger,
      body: eventInput,
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("POST", "/v1/events", {
      cookie: api.cookies.selam,
      body: eventInput,
    });
    expect(selamRes.statusCode).toBe(201);
    expect(selamRes.json()).toHaveProperty("id");
  },

  "GET /v1/events/:id": async (api) => {
    const create = await api.call("POST", "/v1/events", {
      cookie: api.cookies.selam,
      body: { title: "Get event probe", kind: "date", firstDate: "2026-11-25", repeats: "none" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", `/v1/events/${id}`, { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json()).toBeNull();

    const selamRes = await api.call("GET", `/v1/events/${id}`, { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ title: string }>().title).toBe("Get event probe");
  },

  "DELETE /v1/events/:id": async (api) => {
    const create = await api.call("POST", "/v1/events", {
      cookie: api.cookies.selam,
      body: { title: "Delete event probe", kind: "date", firstDate: "2026-11-25", repeats: "none" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/events/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);

    const selamRes = await api.call("DELETE", `/v1/events/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
  },

  "GET /v1/events/chapters": async (api) => {
    const strangerRes = await api.call("GET", "/v1/events/chapters", {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("GET", "/v1/events/chapters", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(Array.isArray(selamRes.json())).toBe(true);
  },

  "GET /v1/events/chapters/:month": async (api) => {
    const strangerRes = await api.call("GET", "/v1/events/chapters/2026-11", {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("GET", "/v1/events/chapters/2026-11", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json()).toHaveProperty("reflections");
  },

  "POST /v1/events/chapters/:month/reflect/:promptId": async (api) => {
    const strangerRes = await api.call("POST", "/v1/events/chapters/2026-11/reflect/prompt-1", {
      cookie: api.cookies.stranger,
      body: { reflection: "Our best walk" },
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("POST", "/v1/events/chapters/2026-11/reflect/prompt-1", {
      cookie: api.cookies.selam,
      body: { reflection: "Our best walk" },
    });
    expect(selamRes.statusCode).toBe(201);
  },

  "POST /v1/events/chapters/:month/rename": async (api) => {
    const strangerRes = await api.call("POST", "/v1/events/chapters/2026-11/rename", {
      cookie: api.cookies.stranger,
      body: { title: "A November to Remember" },
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("POST", "/v1/events/chapters/2026-11/rename", {
      cookie: api.cookies.selam,
      body: { title: "A November to Remember" },
    });
    expect(selamRes.statusCode).toBe(201);
  },

  // --- Moments: Memories & Collections ---------------------------------------

  "GET /v1/memories": async (api) => {
    const create = await api.call("POST", "/v1/memories", {
      cookie: api.cookies.selam,
      body: { title: "Selam memory probe", date: "2026-10-15", tags: [] },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", "/v1/memories", { cookie: api.cookies.stranger });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json<{ id: string }[]>().some((m) => m.id === id)).toBe(false);

    const selamRes = await api.call("GET", "/v1/memories", { cookie: api.cookies.selam });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ id: string }[]>().some((m) => m.id === id)).toBe(true);
  },

  "POST /v1/memories": async (api) => {
    const memoryInput = {
      title: "Stranger memory",
      date: "2026-10-15",
      tags: [],
    };

    const strangerRes = await api.call("POST", "/v1/memories", {
      cookie: api.cookies.stranger,
      body: memoryInput,
    });
    expect(strangerRes.statusCode).toBe(201);
    const { id: strangerMemId } = strangerRes.json<{ id: string }>();

    // Selam cannot see stranger's memory
    const selamRes = await api.call("GET", "/v1/memories", { cookie: api.cookies.selam });
    expect(selamRes.json<{ id: string }[]>().some((m) => m.id === strangerMemId)).toBe(false);
  },

  "GET /v1/memories/:id": async (api) => {
    const create = await api.call("POST", "/v1/memories", {
      cookie: api.cookies.selam,
      body: { title: "Memory get probe", date: "2026-10-15", tags: [] },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", `/v1/memories/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json()).toBeNull();

    const selamRes = await api.call("GET", `/v1/memories/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ title: string }>().title).toBe("Memory get probe");
  },

  "DELETE /v1/memories/:id": async (api) => {
    const create = await api.call("POST", "/v1/memories", {
      cookie: api.cookies.selam,
      body: { title: "Memory delete probe", date: "2026-10-15", tags: [] },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/memories/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);

    const selamRes = await api.call("DELETE", `/v1/memories/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
  },

  "GET /v1/memories/collections": async (api) => {
    const create = await api.call("POST", "/v1/memories/collections", {
      cookie: api.cookies.selam,
      body: { title: "Selam Collection", description: "" },
    });
    const { id: colId } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", "/v1/memories/collections", {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json<{ id: string }[]>().some((c) => c.id === colId)).toBe(false);

    const selamRes = await api.call("GET", "/v1/memories/collections", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ id: string }[]>().some((c) => c.id === colId)).toBe(true);
  },

  "POST /v1/memories/collections": async (api) => {
    const colInput = { title: "Stranger Collection", description: "", art: "plane" };

    const strangerRes = await api.call("POST", "/v1/memories/collections", {
      cookie: api.cookies.stranger,
      body: colInput,
    });
    expect(strangerRes.statusCode).toBe(201);
    const { id: strangerColId } = strangerRes.json<{ id: string }>();

    const selamRes = await api.call("GET", "/v1/memories/collections", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.json<{ id: string }[]>().some((c) => c.id === strangerColId)).toBe(false);
  },

  "DELETE /v1/memories/collections/:id": async (api) => {
    const create = await api.call("POST", "/v1/memories/collections", {
      cookie: api.cookies.selam,
      body: { title: "Col to delete", description: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/memories/collections/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);

    const selamRes = await api.call("DELETE", `/v1/memories/collections/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
  },

  "POST /v1/memories/:id/collections/:colId": async (api) => {
    const mem = await api.call("POST", "/v1/memories", {
      cookie: api.cookies.selam,
      body: { title: "Item in col", date: "2026-10-15", tags: [] },
    });
    const col = await api.call("POST", "/v1/memories/collections", {
      cookie: api.cookies.selam,
      body: { title: "Col target", description: "" },
    });
    const { id: memId } = mem.json<{ id: string }>();
    const { id: colId } = col.json<{ id: string }>();

    const strangerRes = await api.call("POST", `/v1/memories/${memId}/collections/${colId}`, {
      cookie: api.cookies.stranger,
      body: { inIt: true },
    });
    expect(strangerRes.statusCode).toBe(404);

    const selamRes = await api.call("POST", `/v1/memories/${memId}/collections/${colId}`, {
      cookie: api.cookies.selam,
      body: { inIt: true },
    });
    expect(selamRes.statusCode).toBe(201);
  },

  // --- Moments: Together (Our World) -----------------------------------------

  "GET /v1/together/plans": async (api) => {
    const create = await api.call("POST", "/v1/together/plans", {
      cookie: api.cookies.selam,
      body: { title: "Selam Plan", theme: "date", place: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", "/v1/together/plans", {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json<{ id: string }[]>().some((p) => p.id === id)).toBe(false);

    const selamRes = await api.call("GET", "/v1/together/plans", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ id: string }[]>().some((p) => p.id === id)).toBe(true);
  },

  "POST /v1/together/plans": async (api) => {
    const planInput = {
      title: "Stranger Plan",
      theme: "date",
      place: "Entoto",
      when: { kind: "soon" },
    };

    const strangerRes = await api.call("POST", "/v1/together/plans", {
      cookie: api.cookies.stranger,
      body: planInput,
    });
    expect(strangerRes.statusCode).toBe(201);
    const { id: strangerPlanId } = strangerRes.json<{ id: string }>();

    const selamRes = await api.call("GET", "/v1/together/plans", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.json<{ id: string }[]>().some((p) => p.id === strangerPlanId)).toBe(false);
  },

  "POST /v1/together/plans/:id/complete": async (api) => {
    const create = await api.call("POST", "/v1/together/plans", {
      cookie: api.cookies.selam,
      body: { title: "Complete test", theme: "date", place: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("POST", `/v1/together/plans/${id}/complete`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(201);

    const completeRes = await api.call("POST", `/v1/together/plans/${id}/complete`, {
      cookie: api.cookies.selam,
    });
    expect(completeRes.statusCode).toBe(201);
  },

  "DELETE /v1/together/plans/:id": async (api) => {
    const create = await api.call("POST", "/v1/together/plans", {
      cookie: api.cookies.selam,
      body: { title: "Delete plan test", theme: "date", place: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/together/plans/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);

    const delRes = await api.call("DELETE", `/v1/together/plans/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(delRes.statusCode).toBe(200);
  },

  "GET /v1/together/places": async (api) => {
    const create = await api.call("POST", "/v1/together/places", {
      cookie: api.cookies.selam,
      body: { name: "Selam Place", note: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", "/v1/together/places", {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json<{ id: string }[]>().some((p) => p.id === id)).toBe(false);

    const selamRes = await api.call("GET", "/v1/together/places", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ id: string }[]>().some((p) => p.id === id)).toBe(true);
  },

  "POST /v1/together/places": async (api) => {
    const placeInput = { name: "Stranger Place", note: "" };

    const strangerRes = await api.call("POST", "/v1/together/places", {
      cookie: api.cookies.stranger,
      body: placeInput,
    });
    expect(strangerRes.statusCode).toBe(201);
    const { id: strangerPlaceId } = strangerRes.json<{ id: string }>();

    const selamRes = await api.call("GET", "/v1/together/places", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.json<{ id: string }[]>().some((p) => p.id === strangerPlaceId)).toBe(false);
  },

  "DELETE /v1/together/places/:id": async (api) => {
    const create = await api.call("POST", "/v1/together/places", {
      cookie: api.cookies.selam,
      body: { name: "Place to delete", note: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/together/places/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);

    const delRes = await api.call("DELETE", `/v1/together/places/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(delRes.statusCode).toBe(200);
  },

  "GET /v1/together/songs": async (api) => {
    const create = await api.call("POST", "/v1/together/songs", {
      cookie: api.cookies.selam,
      body: { title: "Selam Song", artist: "Artist", link: "https://example.com/s", note: "" },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("GET", "/v1/together/songs", {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);
    expect(strangerRes.json<{ id: string }[]>().some((s) => s.id === id)).toBe(false);

    const selamRes = await api.call("GET", "/v1/together/songs", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.statusCode).toBe(200);
    expect(selamRes.json<{ id: string }[]>().some((s) => s.id === id)).toBe(true);
  },

  "POST /v1/together/songs": async (api) => {
    const songInput = {
      title: "Stranger Song",
      artist: "Ethiopian Jazz",
      link: "https://example.com/song",
      note: "",
    };

    const strangerRes = await api.call("POST", "/v1/together/songs", {
      cookie: api.cookies.stranger,
      body: songInput,
    });
    expect(strangerRes.statusCode).toBe(201);
    const { id: strangerSongId } = strangerRes.json<{ id: string }>();

    const selamRes = await api.call("GET", "/v1/together/songs", {
      cookie: api.cookies.selam,
    });
    expect(selamRes.json<{ id: string }[]>().some((s) => s.id === strangerSongId)).toBe(false);
  },

  "DELETE /v1/together/songs/:id": async (api) => {
    const create = await api.call("POST", "/v1/together/songs", {
      cookie: api.cookies.selam,
      body: {
        title: "Song to delete",
        artist: "Artist",
        link: "https://example.com/song",
        note: "",
      },
    });
    const { id } = create.json<{ id: string }>();

    const strangerRes = await api.call("DELETE", `/v1/together/songs/${id}`, {
      cookie: api.cookies.stranger,
    });
    expect(strangerRes.statusCode).toBe(200);

    const delRes = await api.call("DELETE", `/v1/together/songs/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(delRes.statusCode).toBe(200);
  },

  "GET /v1/me/export": async (api) => {
    const res = await api.call("GET", "/v1/me/export", {
      cookie: api.cookies.stranger,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ state: string }>().state).toBeDefined();
  },

  "POST /v1/me/export": async (api) => {
    const res = await api.call("POST", "/v1/me/export", {
      cookie: api.cookies.stranger,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ state: string }>().state).toBe("ready");
  },

  "POST /v1/me/export/expire": async (api) => {
    const res = await api.call("POST", "/v1/me/export/expire", {
      cookie: api.cookies.stranger,
    });
    expect(res.statusCode).toBe(204);
  },

  "POST /v1/me/reauth": async (api) => {
    const refused = await api.call("POST", "/v1/me/reauth", {
      cookie: api.cookies.stranger,
      body: { password: "bad-password" },
    });
    expect(refused.statusCode).toBe(400);

    const ok = await api.call("POST", "/v1/me/reauth", {
      cookie: api.cookies.stranger,
      body: { password: PASSWORD },
    });
    expect(ok.statusCode).toBe(200);
  },

  "POST /v1/me/end-space": async (api) => {
    const refused = await api.call("POST", "/v1/me/end-space", {
      cookie: api.cookies.stranger,
      body: { confirmWord: "NO" },
    });
    expect(refused.statusCode).toBe(400);
  },

  "DELETE /v1/me/account": async (api) => {
    const refused = await api.call("DELETE", "/v1/me/account", {
      cookie: api.cookies.stranger,
      body: { confirmWord: "NO" },
    });
    expect(refused.statusCode).toBe(400);
  },

  "GET /v1/search": async (api) => {
    // 1. Stranger search sees only stranger's content (0 results from Noah/Selam)
    const stranger = await api.call("GET", "/v1/search?q=London", {
      cookie: api.cookies.stranger,
    });
    expect(stranger.statusCode).toBe(200);
    expect(stranger.json()).toMatchObject({
      results: [],
      totalEstimated: 0,
    });

    // 2. Partner search responds cleanly
    const partner = await api.call("GET", "/v1/search?q=London", {
      cookie: api.cookies.noah,
    });
    expect(partner.statusCode).toBe(200);
    const data = partner.json<{ results: unknown[] }>();
    expect(Array.isArray(data.results)).toBe(true);
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
