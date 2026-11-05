/**
 * Google and Apple sign-in (P-79), without the network: the sign-in request and its guards, the
 * proxy that opens the provider's page, Apple's form post, the PKCE-bound hand-off back to the
 * app, and one account per person when a provider joins an existing account.
 */
import { signInMethodsSchema } from "@garnet/contracts";
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEV_PEOPLE,
  PASSWORD,
  REGISTRATION,
  SESSION_COOKIE,
  sessionCookieOf,
  startTestApi,
  type TestApi,
} from "./harness";

const BASE = "http://127.0.0.1:3000/v1/auth";
const HANDOFF = `${BASE}/app-handoff`;

let api: TestApi;
let plain: TestApi;
beforeAll(async () => {
  api = await startTestApi({
    social: {
      google: { clientId: "test-google-client", clientSecret: "test-google-secret" },
      apple: { clientId: "app.garnet.signin", clientSecret: "test-apple-jwt" },
    },
  });
  plain = await startTestApi();
});
afterAll(async () => {
  await api.close();
  await plain.close();
});

function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

const startSocial = (body: Record<string, unknown>, on: TestApi = api) =>
  on.call("POST", "/v1/auth/sign-in/social", { body });

describe("which ways in are on", () => {
  it("reports Google and Apple only when configured", async () => {
    const on = signInMethodsSchema.parse((await api.call("GET", "/v1/sign-in-methods")).json());
    expect(on).toEqual({ email: true, google: true, apple: true });
    const off = signInMethodsSchema.parse((await plain.call("GET", "/v1/sign-in-methods")).json());
    expect(off).toEqual({ email: true, google: false, apple: false });
  });

  it("exposes none of their routes when they are off", async () => {
    const { challenge } = pkce();
    const res = await startSocial(
      { provider: "google", callbackURL: `${HANDOFF}/start?challenge=${challenge}` },
      plain,
    );
    expect(res.statusCode).toBe(404);
    expect((await plain.call("GET", "/v1/auth/callback/google")).statusCode).toBe(404);
    expect((await plain.call("GET", "/v1/auth/app-handoff/start")).statusCode).toBe(404);
  });
});

describe("starting a sign-in", () => {
  it("returns Google's page with PKCE and a state, coming back only to the hand-off", async () => {
    const { challenge } = pkce();
    const res = await startSocial({
      provider: "google",
      callbackURL: `${HANDOFF}/start?challenge=${challenge}`,
      errorCallbackURL: `${HANDOFF}/failed`,
      disableRedirect: true,
    });
    expect(res.statusCode).toBe(200);
    const url = new URL(res.json<{ url: string }>().url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")?.length).toBeGreaterThan(20);
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.get("redirect_uri")).toBe(`${BASE}/callback/google`);
  });

  it.each([
    ["a garnet:// link (the cookie would travel in it)", { callbackURL: "garnet://home" }],
    ["another site", { callbackURL: "https://evil.example/start?challenge=x" }],
    [
      "the hand-off without a proper challenge",
      { callbackURL: `${HANDOFF}/start?challenge=short` },
    ],
    ["no way back at all", { callbackURL: undefined }],
    ["a different error page", { errorCallbackURL: "garnet://oops" }],
    ["a new-user page", { newUserCallbackURL: "garnet://welcome" }],
  ])("refuses %s", async (_, extra) => {
    const { challenge } = pkce();
    const res = await startSocial({
      provider: "google",
      callbackURL: `${HANDOFF}/start?challenge=${challenge}`,
      ...extra,
    });
    expect(res.statusCode).toBe(400);
  });

  it("refuses an unknown provider and a request without the app's header", async () => {
    const { challenge } = pkce();
    const callbackURL = `${HANDOFF}/start?challenge=${challenge}`;
    expect((await startSocial({ provider: "github", callbackURL })).statusCode).toBe(400);
    const csrf = await api.inject({
      method: "POST",
      url: "/v1/auth/sign-in/social",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ provider: "google", callbackURL }),
    });
    expect(csrf.statusCode).toBe(400);
  });
});

describe("the authorisation proxy", () => {
  const proxy = (target: string, extra = "") =>
    api.call(
      "GET",
      `/v1/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(target)}${extra}`,
    );

  it("opens a provider's page and keeps the state in the browser", async () => {
    const res = await proxy("https://accounts.google.com/o/oauth2/v2/auth?state=abc123&x=1");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(String(res.headers["set-cookie"])).toMatch(/state=/);
  });

  it.each([
    ["another site", "https://evil.example/?state=abc"],
    ["a look-alike host", "https://accounts.google.com.evil.example/?state=abc"],
    ["plain http", "http://accounts.google.com/?state=abc"],
    ["credentials in the address", "https://user@accounts.google.com/?state=abc"],
    ["another port", "https://accounts.google.com:8443/?state=abc"],
    ["not an address", "javascript:alert(1)"],
  ])("refuses %s (no open redirect)", async (_, target) => {
    expect((await proxy(target)).statusCode).toBe(400);
  });

  it("refuses extra parameters", async () => {
    const res = await proxy("https://accounts.google.com/?state=abc", "&oauthState=planted");
    expect(res.statusCode).toBe(400);
  });
});

describe("Apple's answer", () => {
  it("accepts Apple's form post without the app header and turns it into a GET", async () => {
    const res = await api.inject({
      method: "POST",
      url: "/v1/auth/callback/apple",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "state=abc&code=xyz",
    });
    expect(res.statusCode).toBe(302);
    const location = new URL(String(res.headers.location));
    expect(location.pathname).toBe("/v1/auth/callback/apple");
    expect(location.searchParams.get("code")).toBe("xyz");
  });

  it("but no other route takes a form post", async () => {
    const res = await api.inject({
      method: "POST",
      url: "/v1/auth/callback/google",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "state=abc&code=xyz",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("the hand-off back to the app (PKCE-bound)", () => {
  /** The browser's session at the end of a provider sign-in, swapped for a code. */
  async function handOff(challenge: string) {
    const browser = await api.signIn(DEV_PEOPLE.noah.email);
    const res = await api.call("GET", `/v1/auth/app-handoff/start?challenge=${challenge}`, {
      cookie: browser,
    });
    return { res, browser, location: new URL(String(res.headers.location)) };
  }
  const redeem = (code: string, verifier: string) =>
    api.call("POST", "/v1/auth/app-handoff/redeem", { body: { code, verifier } });

  it("opens the app with a one-time code, never the session, and clears the browser", async () => {
    const { challenge } = pkce();
    const { res, browser, location } = await handOff(challenge);
    expect(res.statusCode).toBe(302);
    expect(`${location.protocol}//${location.host}${location.pathname}`).toBe(
      "garnet://auth-callback",
    );
    expect(location.searchParams.get("code")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(location.href).not.toContain(SESSION_COOKIE);
    expect(location.href).not.toContain(decodeURIComponent(browser.split("=")[1] ?? ""));
    const cleared = [res.headers["set-cookie"] ?? []]
      .flat()
      .find((c) => c.startsWith(SESSION_COOKIE));
    expect(cleared).toMatch(/Max-Age=0/i);
  });

  it("gives the session only to the app that holds the verifier, once", async () => {
    const { challenge, verifier } = pkce();
    const code = (await handOff(challenge)).location.searchParams.get("code") ?? "";
    // Someone who caught the link, with a verifier of their own.
    const stolen = await redeem(code, pkce().verifier);
    expect(stolen.statusCode).toBe(400);
    expect(sessionCookieOf(stolen)).toBeNull();
    // The wrong guess also used the code up: the real app must start again.
    const after = await redeem(code, verifier);
    expect(after.statusCode).toBe(400);
  });

  it("signs the app in with the right verifier, and the code can't be used twice", async () => {
    const { challenge, verifier } = pkce();
    const code = (await handOff(challenge)).location.searchParams.get("code") ?? "";
    const ok = await redeem(code, verifier);
    expect(ok.statusCode).toBe(200);
    expect(ok.body).not.toMatch(/"token"/);
    const cookie = sessionCookieOf(ok);
    expect(cookie).not.toBeNull();
    expect((await api.call("GET", "/v1/me", { cookie: cookie ?? "" })).json()).toMatchObject({
      userId: DEV_PEOPLE.noah.id,
    });
    expect((await redeem(code, verifier)).statusCode).toBe(400);
  });

  it("lasts only a minute", async () => {
    const { challenge, verifier } = pkce();
    const code = (await handOff(challenge)).location.searchParams.get("code") ?? "";
    await api.db.query(
      "update verification set expires_at = now() - interval '1 second' where value like $1",
      [`%${challenge}%`],
    );
    expect((await redeem(code, verifier)).statusCode).toBe(400);
  });

  it("needs the app's header to redeem, and a session in the browser to start", async () => {
    const { challenge, verifier } = pkce();
    const code = (await handOff(challenge)).location.searchParams.get("code") ?? "";
    const csrf = await api.inject({
      method: "POST",
      url: "/v1/auth/app-handoff/redeem",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ code, verifier }),
    });
    expect(csrf.statusCode).toBe(400);
    const nobody = await api.call("GET", `/v1/auth/app-handoff/start?challenge=${challenge}`);
    expect(nobody.headers.location).toBe("garnet://auth-callback?error=failed");
  });

  it("tells the app a cancelled sign-in from a failed one, and nothing more", async () => {
    const cancelled = await api.call("GET", "/v1/auth/app-handoff/failed?error=access_denied");
    expect(cancelled.headers.location).toBe("garnet://auth-callback?error=cancelled");
    const failed = await api.call(
      "GET",
      "/v1/auth/app-handoff/failed?error=please_restart_the_process",
    );
    expect(failed.headers.location).toBe("garnet://auth-callback?error=failed");
  });
});

describe("one account per person (P-79)", () => {
  it("joins Google to the confirmed account that has the email, keeping everything", async () => {
    const ctx = await api.auth.$context;
    await ctx.internalAdapter.linkAccount({
      providerId: "google",
      accountId: "google-sub-selam",
      userId: DEV_PEOPLE.selam.id,
    });
    const accounts = await api.db.query<{ provider_id: string }>(
      "select provider_id from account where user_id = $1 order by provider_id",
      [DEV_PEOPLE.selam.id],
    );
    expect(accounts.rows.map((r) => r.provider_id)).toEqual(["credential", "google"]);
    expect((await api.call("GET", "/v1/me", { cookie: api.cookies.selam })).statusCode).toBe(200);
  });

  it("removes what someone else set up on an unconfirmed account before Google joins it", async () => {
    // Someone signs up with another person's email and a password they know, never confirming.
    const email = "victim@example.test";
    await api.call("POST", "/v1/auth/sign-up/email", {
      body: { name: "Not me", email, password: PASSWORD, ...REGISTRATION },
    });
    const id = (
      await api.db.query<{ id: string }>("select id from app_user where email = $1", [email])
    ).rows[0]?.id;
    if (id === undefined) throw new Error("no account");
    const ctx = await api.auth.$context;
    await ctx.internalAdapter.linkAccount({
      providerId: "google",
      accountId: "google-sub-victim",
      userId: id,
    });
    const accounts = await api.db.query<{ provider_id: string }>(
      "select provider_id from account where user_id = $1",
      [id],
    );
    expect(accounts.rows.map((r) => r.provider_id)).toEqual(["google"]);
    const user = await api.db.query<{ birth_date: string | null; terms_version: string | null }>(
      "select birth_date, terms_version from app_user where id = $1",
      [id],
    );
    expect(user.rows).toEqual([{ birth_date: null, terms_version: null }]);
    // The planted password no longer opens anything.
    const res = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(401);
  });

  it("trusts only the configured providers, and keeps their tokens encrypted", () => {
    const linking = api.auth.options.account.accountLinking;
    expect(linking).toMatchObject({ enabled: true, trustedProviders: ["google", "apple"] });
    expect(api.auth.options.account.encryptOAuthTokens).toBe(true);
  });
});
