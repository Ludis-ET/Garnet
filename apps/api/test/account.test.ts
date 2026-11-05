/**
 * The person's own account in Settings (B2, P-80): devices, the birthday, the ways in, and
 * changing the email. Anything that changes how someone gets in needs a recent sign-in.
 */
import { accountMethodsSchema, devicesSchema, problemSchema } from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deviceName } from "../src/account/device-name";
import { ageCheckToday } from "../src/auth/today";
import {
  PASSWORD,
  REGISTRATION,
  sessionCookieOf,
  startTestApi,
  tokenOf,
  type TestApi,
} from "./harness";

const HANDOFF = "http://127.0.0.1:3000/v1/auth/app-handoff";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi({
    social: {
      google: { clientId: "test-google-client", clientSecret: "test-google-secret" },
    },
  });
});
afterAll(async () => {
  await api.close();
});

const me = (cookie: string) => api.call("GET", "/v1/me", { cookie });
const devices = async (cookie: string) =>
  devicesSchema.parse((await api.call("GET", "/v1/me/devices", { cookie })).json()).devices;
const methods = async (cookie: string) =>
  accountMethodsSchema.parse((await api.call("GET", "/v1/me/sign-in-methods", { cookie })).json());

/** Makes a session look as if it signed in two days ago. */
const age = (cookie: string) =>
  api.db.query("update session set created_at = now() - interval '2 days' where token = $1", [
    tokenOf(cookie),
  ]);

const linkGoogle = async (userId: string, sub: string) => {
  const ctx = await api.auth.$context;
  await ctx.internalAdapter.linkAccount({ providerId: "google", accountId: sub, userId });
};

describe("device names", () => {
  it.each([
    ["Garnet (Android; Pixel 8)", "Pixel 8"],
    ["Garnet (iOS)", "iPhone"],
    ["Garnet (Android)", "Android phone"],
    ["Garnet (Android; <script>alert(1)</script>)", "Android phone"],
    [`Garnet (Android; ${"x".repeat(60)})`, "Android phone"],
    ["okhttp/4.12.0", "Android phone"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone"],
    ["Mozilla/5.0 (Linux; Android 15; Pixel 8) Chrome/131", "Android phone"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64)", "Computer"],
    ["curl/8.1", "A device"],
    ["", "A device"],
    [null, "A device"],
  ])("names %s as %s", (ua, name) => {
    expect(deviceName(ua)).toBe(name);
  });
});

describe("devices (SET-12, ADR-0006)", () => {
  it("lists live sessions, this one first, with no token, address or user agent", async () => {
    const person = await api.newAccount("Bo");
    const phone = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: person.email, password: PASSWORD },
      headers: { "user-agent": "Garnet (Android; Pixel 8)" },
    });
    const list = await api.call("GET", "/v1/me/devices", { cookie: sessionCookieOf(phone) ?? "" });
    const parsed = devicesSchema.parse(list.json()).devices;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ current: true, name: "Pixel 8" });
    expect(parsed[1]?.current).toBe(false);
    expect(list.body).not.toContain(tokenOf(person.cookie));
    expect(list.body).not.toMatch(/token|ipAddress|127\.0\.0\.1|userAgent/);
  });

  it("leaves out sessions that have ended", async () => {
    const person = await api.newAccount("Cal");
    const old = await api.signIn(person.email);
    await api.db.query(
      "update session set expires_at = now() - interval '1 day' where token = $1",
      [tokenOf(old)],
    );
    expect(await devices(person.cookie)).toHaveLength(1);
  });

  it("signs out another device at once, and that device is simply signed out", async () => {
    const person = await api.newAccount("Dom");
    const other = await api.signIn(person.email);
    const target = (await devices(person.cookie)).find((d) => !d.current);
    const res = await api.call("DELETE", `/v1/me/devices/${target?.id ?? ""}`, {
      cookie: person.cookie,
    });
    expect(res.statusCode).toBe(204);
    expect((await me(other)).statusCode).toBe(401);
    expect((await me(person.cookie)).statusCode).toBe(200);
  });

  it("won't sign out this device from the list: that's Sign out", async () => {
    const person = await api.newAccount("Eli");
    const [current] = await devices(person.cookie);
    const res = await api.call("DELETE", `/v1/me/devices/${current?.id ?? ""}`, {
      cookie: person.cookie,
    });
    expect(res.statusCode).toBe(404);
    expect((await me(person.cookie)).statusCode).toBe(200);
  });

  it("signs out every other device, and only those", async () => {
    const person = await api.newAccount("Fen");
    const a = await api.signIn(person.email);
    const b = await api.signIn(person.email);
    await api.call("POST", "/v1/me/devices/sign-out-others", { cookie: person.cookie, body: {} });
    expect((await me(a)).statusCode).toBe(401);
    expect((await me(b)).statusCode).toBe(401);
    expect((await me(person.cookie)).statusCode).toBe(200);
  });
});

describe("the birthday in Settings (P-79)", () => {
  const change = (cookie: string, birthDate: string) =>
    api.call("PATCH", "/v1/me/account", { cookie, body: { birthDate } });

  it("can be corrected, and the partner sees the new one", async () => {
    const person = await api.newAccount("Gia");
    expect((await change(person.cookie, "1999-12-31")).statusCode).toBe(204);
    const row = await api.db.query<{ birth_date: string }>(
      "select birth_date from app_user where id = $1",
      [person.id],
    );
    expect(row.rows).toEqual([{ birth_date: "1999-12-31" }]);
  });

  it("refuses a date under 16 and never removes an existing account", async () => {
    const person = await api.newAccount("Hal");
    const year = Number(ageCheckToday().slice(0, 4)) - 10;
    const res = await change(person.cookie, `${String(year)}-01-01`);
    expect(res.statusCode).toBe(400);
    expect(problemSchema.parse(res.json()).issues).toEqual([
      { path: ["birthDate"], code: "too_young" },
    ]);
    // The same through registration: refused, the account stays.
    const again = await api.call("POST", "/v1/me/registration", {
      cookie: person.cookie,
      body: { ...REGISTRATION, birthDate: `${String(year)}-01-01` },
    });
    expect(again.json()).toEqual({ ok: false, reason: "too-young" });
    expect((await me(person.cookie)).statusCode).toBe(200);
  });
});

describe("the ways in (P-79, P-80)", () => {
  it("shows a password and what the server offers", async () => {
    const person = await api.newAccount("Ike");
    expect(await methods(person.cookie)).toEqual({
      password: true,
      google: { available: true, connected: false },
      apple: { available: false, connected: false },
    });
    await linkGoogle(person.id, "sub-ike");
    expect((await methods(person.cookie)).google.connected).toBe(true);
  });

  it("disconnects Google, keeping the password", async () => {
    const person = await api.newAccount("Jax");
    await linkGoogle(person.id, "sub-jax");
    const res = await api.call("DELETE", "/v1/me/sign-in-methods/google", {
      cookie: person.cookie,
    });
    expect(res.json()).toEqual({ ok: true });
    expect((await methods(person.cookie)).google.connected).toBe(false);
    expect((await methods(person.cookie)).password).toBe(true);
  });

  it("never removes the last way in", async () => {
    const person = await api.newAccount("Kit");
    await linkGoogle(person.id, "sub-kit");
    await api.db.query("delete from account where user_id = $1 and provider_id = 'credential'", [
      person.id,
    ]);
    const res = await api.call("DELETE", "/v1/me/sign-in-methods/google", {
      cookie: person.cookie,
    });
    expect(res.json()).toEqual({ ok: false, reason: "last-one" });
    expect((await methods(person.cookie)).google.connected).toBe(true);
  });

  it("answers not found for a provider that isn't one, or isn't connected", async () => {
    const person = await api.newAccount("Lou");
    for (const provider of ["google", "credential", "__proto__"]) {
      const res = await api.call("DELETE", `/v1/me/sign-in-methods/${provider}`, {
        cookie: person.cookie,
      });
      expect(res.statusCode).toBe(404);
    }
    expect((await methods(person.cookie)).password).toBe(true);
  });

  it("needs a recent sign-in to disconnect", async () => {
    const person = await api.newAccount("Mae");
    await linkGoogle(person.id, "sub-mae");
    await age(person.cookie);
    const res = await api.call("DELETE", "/v1/me/sign-in-methods/google", {
      cookie: person.cookie,
    });
    expect(res.statusCode).toBe(403);
    expect(problemSchema.parse(res.json()).code).toBe("recent_sign_in_required");
    expect((await methods(person.cookie)).google.connected).toBe(true);
  });

  it("adds a password to a Google-only account through a reset email", async () => {
    const person = await api.newAccount("Ned");
    await linkGoogle(person.id, "sub-ned");
    await api.db.query("delete from account where user_id = $1 and provider_id = 'credential'", [
      person.id,
    ]);
    expect((await methods(person.cookie)).password).toBe(false);
    await api.call("POST", "/v1/auth/request-password-reset", {
      body: { email: person.email, redirectTo: "garnet://reset-password" },
    });
    const token = api.mail.findLast((m) => m.to === person.email && m.kind === "reset")?.token;
    const reset = await api.call("POST", "/v1/auth/reset-password", {
      body: { token, newPassword: "a brand new long passphrase" },
    });
    expect(reset.statusCode).toBe(200);
    const fresh = await api.signIn(person.email, "a brand new long passphrase");
    expect((await methods(fresh)).password).toBe(true);
    expect((await methods(fresh)).google.connected).toBe(true);
  });
});

describe("connecting Google to a signed-in account", () => {
  const connect = (cookie: string, body: Record<string, unknown>) =>
    api.call("POST", "/v1/auth/link-social", { cookie, body });

  it("opens Google's page and comes back with no session in the link", async () => {
    const person = await api.newAccount("Oda");
    const res = await connect(person.cookie, {
      provider: "google",
      callbackURL: `${HANDOFF}/linked`,
      errorCallbackURL: `${HANDOFF}/failed`,
      disableRedirect: true,
    });
    expect(res.statusCode).toBe(200);
    expect(new URL(res.json<{ url: string }>().url).hostname).toBe("accounts.google.com");
    const back = await api.call("GET", "/v1/auth/app-handoff/linked");
    expect(back.headers.location).toBe("garnet://auth-callback?linked=1");
    expect(back.headers["set-cookie"]).toBeUndefined();
  });

  it.each([
    ["a garnet:// link", { callbackURL: "garnet://settings" }],
    ["another site", { callbackURL: "https://evil.example/" }],
    ["the sign-in hand-off", { callbackURL: `${HANDOFF}/start?challenge=${"a".repeat(43)}` }],
    ["extra scopes", { callbackURL: `${HANDOFF}/linked`, scopes: ["drive"] }],
  ])("refuses %s", async (_, extra) => {
    const person = await api.newAccount("Pax");
    expect((await connect(person.cookie, { provider: "google", ...extra })).statusCode).toBe(400);
  });

  it("needs a session, and a recent sign-in", async () => {
    const body = { provider: "google", callbackURL: `${HANDOFF}/linked` };
    expect((await api.call("POST", "/v1/auth/link-social", { body })).statusCode).toBe(401);
    const person = await api.newAccount("Quinn");
    await age(person.cookie);
    const res = await connect(person.cookie, body);
    expect(res.statusCode).toBe(403);
    expect(problemSchema.parse(res.json()).code).toBe("recent_sign_in_required");
  });

  it("tells the app when that Google account belongs to someone else", async () => {
    const res = await api.call(
      "GET",
      "/v1/auth/app-handoff/failed?error=account_already_linked_to_different_user",
    );
    expect(res.headers.location).toBe("garnet://auth-callback?error=taken");
  });
});

describe("changing the email (P-80)", () => {
  const change = (cookie: string, newEmail: string) =>
    api.call("POST", "/v1/auth/change-email", { cookie, body: { newEmail } });

  it("asks the current address first, then the new one, and only then changes it", async () => {
    const person = await api.newAccount("Rio");
    const next = "rio.new@example.test";
    expect((await change(person.cookie, next)).statusCode).toBe(200);
    const first = api.mail.findLast((m) => m.kind === "change" && m.to === person.email);
    expect(first?.token).toBeTruthy();
    // Nothing changes until both have answered.
    const stored = async () =>
      (
        await api.db.query<{ email: string }>("select email from app_user where id = $1", [
          person.id,
        ])
      ).rows[0]?.email;
    expect(await stored()).toBe(person.email);

    await api.call("GET", `/v1/auth/verify-email?token=${first?.token ?? ""}`, {
      cookie: person.cookie,
    });
    expect(await stored()).toBe(person.email);
    const second = api.mail.findLast((m) => m.kind === "verify" && m.to === next);
    expect(second?.token).toBeTruthy();

    await api.call("GET", `/v1/auth/verify-email?token=${second?.token ?? ""}`, {
      cookie: person.cookie,
    });
    expect(await stored()).toBe(next);
    expect((await api.signIn(next)).length).toBeGreaterThan(0);
    await expect(api.signIn(person.email)).rejects.toThrow();
  });

  it("answers the same for an address that already has an account", async () => {
    const person = await api.newAccount("Sky");
    const taken = await api.newAccount("Taj");
    const free = await change(person.cookie, "nobody.here@example.test");
    const used = await change(person.cookie, taken.email);
    expect(used.statusCode).toBe(free.statusCode);
    expect(used.body).toBe(free.body);
  });

  it("needs a session and a recent sign-in", async () => {
    const person = await api.newAccount("Uma");
    await age(person.cookie);
    const res = await change(person.cookie, "new.address@example.test");
    expect(problemSchema.parse(res.json()).code).toBe("recent_sign_in_required");
    const nobody = await api.call("POST", "/v1/auth/change-email", {
      body: { newEmail: "x@example.test" },
    });
    expect(nobody.statusCode).toBe(401);
  });

  it("limits emails to the new address (no inbox flooding)", async () => {
    const person = await api.newAccount("Val");
    const target = "flooded@example.test";
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await change(person.cookie, target)).statusCode);
    expect(statuses).toContain(429);
  });
});

describe("changing the password", () => {
  it("uses the shared password rules, and keeps this device signed in", async () => {
    const person = await api.newAccount("Wes");
    const other = await api.signIn(person.email);
    const weak = await api.call("POST", "/v1/auth/change-password", {
      cookie: person.cookie,
      body: { currentPassword: PASSWORD, newPassword: "passwordpassword" },
    });
    expect(weak.statusCode).toBe(400);
    const wrong = await api.call("POST", "/v1/auth/change-password", {
      cookie: person.cookie,
      body: { currentPassword: "not the password at all", newPassword: "a fine new passphrase" },
    });
    expect(wrong.statusCode).toBe(400);
    const ok = await api.call("POST", "/v1/auth/change-password", {
      cookie: person.cookie,
      body: { currentPassword: PASSWORD, newPassword: "a fine new passphrase" },
    });
    expect(ok.statusCode).toBe(200);
    expect((await me(other)).statusCode).toBe(401);
    expect((await me(sessionCookieOf(ok) ?? "")).statusCode).toBe(200);
  });
});
