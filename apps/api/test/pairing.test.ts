/**
 * Setup and pairing as two new people go through them (SETUP, PAIR, P-18, P-51), through the
 * API's own routes. probes.test.ts checks what strangers and partners see; this follows the
 * flows and their every unusable case.
 */
import {
  checkInviteResultSchema,
  createInviteResultSchema,
  pairingStatusSchema,
  setupStateSchema,
} from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

async function invite(cookie: string): Promise<string> {
  const res = await api.call("POST", "/v1/invitations", { cookie });
  expect(res.statusCode).toBe(200);
  return createInviteResultSchema.parse(res.json()).code;
}

const check = (cookie: string, code: string) =>
  api.call("POST", "/v1/invitations/check", { cookie, body: { code } });
const accept = (cookie: string, code: string) =>
  api.call("POST", "/v1/invitations/accept", { cookie, body: { code } });
const status = async (cookie: string) =>
  pairingStatusSchema.parse((await api.call("GET", "/v1/pairing", { cookie })).json());

describe("pairing two new people (PAIR-01 to PAIR-07)", () => {
  it("pairs them once: check shows the inviter, accept joins, and the code is spent", async () => {
    const a = await api.newAccount("Amara");
    const b = await api.newAccount("Bilal");
    expect(await status(a.cookie)).toEqual({ me: "Amara", partnerName: null, invite: null });
    const code = await invite(a.cookie);
    const waiting = await status(a.cookie);
    expect(waiting.invite?.expired).toBe(false);
    // Typed loosely: lower case, spaces and dashes are fine.
    const loose = `${code.slice(0, 4).toLowerCase()} - ${code.slice(4)}`;
    expect(checkInviteResultSchema.parse((await check(b.cookie, loose)).json())).toEqual({
      ok: true,
      inviterName: "Amara",
    });
    expect((await accept(b.cookie, code)).json()).toEqual({ ok: true, partnerName: "Amara" });
    expect(await status(a.cookie)).toMatchObject({ partnerName: "Bilal", invite: null });
    expect(await status(b.cookie)).toMatchObject({ partnerName: "Amara" });
    const c = await api.newAccount("Chen");
    expect((await accept(c.cookie, code)).json()).toEqual({ ok: false });
    // Paired people can't invite a third.
    expect((await api.call("POST", "/v1/invitations", { cookie: a.cookie })).statusCode).toBe(400);
  });

  it("answers every unusable code the same: unknown, one's own, withdrawn, replaced, expired", async () => {
    const owner = await api.newAccount("Dawit");
    const other = await api.newAccount("Elif");
    const own = await invite(owner.cookie);
    const replacedBy = await invite(owner.cookie); // a new code replaces the old one
    const answers = [
      await check(other.cookie, "ZZZZZZZZ"),
      await check(owner.cookie, replacedBy),
      await check(other.cookie, own),
    ];
    await api.call("DELETE", "/v1/invitations", { cookie: owner.cookie });
    answers.push(await check(other.cookie, replacedBy));
    const late = await invite(owner.cookie);
    await api.db.query(
      `update invitation set created_at = created_at - interval '25 hours',
                             expires_at = expires_at - interval '25 hours'
        where consumed_at is null and revoked_at is null`,
    );
    answers.push(await check(other.cookie, late), await accept(other.cookie, late));
    for (const a of answers) {
      expect(a.statusCode).toBe(200);
      expect(a.json()).toEqual({ ok: false });
    }
    expect((await status(owner.cookie)).invite).toMatchObject({ expired: true });
  });

  it("caps invitations at the configured lifetime, and the database at 24 hours", async () => {
    const owner = await api.newAccount("Farah");
    const res = await api.call("POST", "/v1/invitations", { cookie: owner.cookie });
    const { expiresAt } = createInviteResultSchema.parse(res.json());
    const hours = (Date.parse(expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("moves a joiner who had invited someone into the inviter's relationship", async () => {
    const inviter = await api.newAccount("Gabi");
    const joiner = await api.newAccount("Hiro");
    const joinerOwn = await invite(joiner.cookie);
    const code = await invite(inviter.cookie);
    expect((await accept(joiner.cookie, code)).json()).toMatchObject({ ok: true });
    // The joiner's own invitation went with their old relationship.
    const third = await api.newAccount("Ines");
    expect((await check(third.cookie, joinerOwn)).json()).toEqual({ ok: false });
    const memberships = await api.db.query<{ n: number }>(
      "select count(*)::int as n from relationship_member where user_id = $1",
      [joiner.id],
    );
    expect(memberships.rows).toEqual([{ n: 1 }]);
  });

  it("limits guessing to ten codes per person per ten minutes, without telling anything", async () => {
    const guesser = await api.newAccount("Jun");
    for (let i = 0; i < 10; i++)
      expect((await check(guesser.cookie, "ZZZZZZZZ")).statusCode).toBe(200);
    const res = await check(guesser.cookie, "ZZZZZZZZ");
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: "rate_limited" });
    // Others are unaffected.
    const other = await api.newAccount("Kofi");
    expect((await check(other.cookie, "ZZZZZZZZ")).statusCode).toBe(200);
  });

  it("refuses a code that can't be one with a validation problem that echoes nothing", async () => {
    const person = await api.newAccount("Lena");
    for (const code of ["", "ABC", "X".repeat(41), 12345678]) {
      const res = await api.call("POST", "/v1/invitations/check", {
        cookie: person.cookie,
        body: { code },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ code: "validation_failed" });
    }
  });
});

describe("setup (SETUP-01 to SETUP-08, P-51)", () => {
  it("saves as the person goes, keeps steps, and completes only with every required step", async () => {
    const a = await api.newAccount("Mira");
    const first = setupStateSchema.parse(
      (await api.call("GET", "/v1/me/setup", { cookie: a.cookie })).json(),
    );
    expect(first.profile).toMatchObject({
      displayName: "Mira",
      side: null,
      done: [],
      complete: false,
    });
    await api.call("PATCH", "/v1/me/setup", {
      cookie: a.cookie,
      body: { nickname: "M", timeZone: "Europe/London", done: ["name", "time"] },
    });
    await api.call("PATCH", "/v1/me/setup", { cookie: a.cookie, body: { done: ["alerts"] } });
    const missing = await api.call("POST", "/v1/me/setup/complete", { cookie: a.cookie });
    expect(missing.json()).toEqual({ ok: false, missing: ["side"] });
    await api.call("POST", "/v1/me/setup/side", { cookie: a.cookie, body: { side: "sapphire" } });
    expect((await api.call("POST", "/v1/me/setup/complete", { cookie: a.cookie })).json()).toEqual({
      ok: true,
    });
    const after = setupStateSchema.parse(
      (await api.call("GET", "/v1/me/setup", { cookie: a.cookie })).json(),
    );
    expect(after.profile).toMatchObject({
      nickname: "M",
      timeZone: "Europe/London",
      side: "sapphire",
      complete: true,
    });
    expect([...after.profile.done].sort()).toEqual(["alerts", "name", "side", "time"]);
  });

  it("never lets the two partners hold the same side (P-51)", async () => {
    const a = await api.newAccount("Nadia");
    const b = await api.newAccount("Omar");
    await accept(b.cookie, await invite(a.cookie));
    const side = (cookie: string, s: string) =>
      api.call("POST", "/v1/me/setup/side", { cookie, body: { side: s } });
    expect((await side(a.cookie, "sapphire")).json()).toEqual({ ok: true });
    expect((await side(b.cookie, "sapphire")).json()).toEqual({
      ok: false,
      reason: "taken",
      partnerSide: "sapphire",
    });
    expect((await side(b.cookie, "ruby")).json()).toEqual({ ok: true });
    // Swapping isn't possible either while the other holds it.
    expect((await side(a.cookie, "ruby")).json()).toMatchObject({ ok: false, reason: "taken" });
    expect((await side(a.cookie, "emerald")).statusCode).toBe(400);
  });

  it("refuses unknown fields, bad values and oversize names, naming only where", async () => {
    const a = await api.newAccount("Pita");
    for (const body of [
      { displayName: "" },
      { displayName: "x".repeat(101) },
      { appearance: "neon" },
      { avatar: { kind: "photo" } },
      { done: ["everything"] },
      { extra: true },
    ]) {
      const res = await api.call("PATCH", "/v1/me/setup", { cookie: a.cookie, body });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ code: "validation_failed" });
      expect(res.body).not.toContain("neon");
    }
  });
});
