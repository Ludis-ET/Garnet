/**
 * Accounts and sessions through Better Auth (B1, P-77) as the app uses them, and the hardening
 * owner direction P-78 chose: Argon2id, the password blocklist, the route allow-list, CSRF,
 * address and per-account limits, a password change ending other sessions, and a ceiling on a
 * session's life. Everything goes through the API's own routes, as the phone's requests do.
 */
import { problemSchema } from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLIENT_HEADER } from "../src/auth/client-header";
import {
  DEV_PEOPLE,
  PASSWORD,
  REGISTRATION,
  SESSION_COOKIE,
  sessionCookieOf,
  startTestApi,
  tokenOf,
  type TestApi,
} from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

const me = (cookie: string) => api.call("GET", "/v1/me", { cookie });
const lastMail = (to: string, kind: "verify" | "reset" | "exists") =>
  api.mail.findLast((m) => m.to === to && m.kind === kind);

describe("signing up and confirming the email (AUTH-02, AUTH-03)", () => {
  it("gives no session until the email is confirmed, then one, and the link works once", async () => {
    const email = "ada@example.test";
    const up = await api.call("POST", "/v1/auth/sign-up/email", {
      body: { name: "Ada", email, password: PASSWORD, ...REGISTRATION },
    });
    expect(up.statusCode).toBe(200);
    expect(sessionCookieOf(up)).toBeNull();
    // The right password before confirming: refused (and a fresh link goes out).
    const early = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email, password: PASSWORD },
    });
    expect(early.statusCode).toBe(403);
    expect(sessionCookieOf(early)).toBeNull();

    const token = lastMail(email, "verify")?.token ?? "";
    expect(token.length).toBeGreaterThan(0);
    const verified = await api.call("GET", `/v1/auth/verify-email?token=${token}`);
    const cookie = sessionCookieOf(verified);
    expect(cookie).not.toBeNull();
    expect((await me(cookie ?? "")).statusCode).toBe(200);
    const again = await api.call("GET", `/v1/auth/verify-email?token=${token}`);
    expect(sessionCookieOf(again)).toBeNull();
  });

  it("stores email links hashed: the token from the email is nowhere in the database", async () => {
    const { email } = await api.newAccount("Bea");
    await api.call("POST", "/v1/auth/request-password-reset", {
      body: { email, redirectTo: "garnet://reset-password" },
    });
    const token = lastMail(email, "reset")?.token ?? "";
    const rows = await api.db.query("select 1 from verification where identifier like $1", [
      `%${token}%`,
    ]);
    expect(token.length).toBeGreaterThan(0);
    expect(rows.rows).toEqual([]);
  });

  it("answers sign-up the same for a taken email, and tells the address's owner instead", async () => {
    const fresh = await api.call("POST", "/v1/auth/sign-up/email", {
      body: { name: "Cy", email: "cy@example.test", password: PASSWORD, ...REGISTRATION },
    });
    const taken = await api.call("POST", "/v1/auth/sign-up/email", {
      body: { name: "Cy", email: DEV_PEOPLE.noah.email, password: PASSWORD, ...REGISTRATION },
    });
    expect(taken.statusCode).toBe(fresh.statusCode);
    expect(Object.keys(taken.json<object>()).sort()).toEqual(
      Object.keys(fresh.json<object>()).sort(),
    );
    expect(sessionCookieOf(taken)).toBeNull();
    expect(lastMail(DEV_PEOPLE.noah.email, "exists")).toBeDefined();
    expect(lastMail(DEV_PEOPLE.noah.email, "verify")).toBeUndefined();
  });
});

describe("passwords (P-78)", () => {
  it("are stored as Argon2id, never as typed", async () => {
    const { id } = await api.newAccount("Dee");
    const row = await api.db.query<{ password: string }>(
      "select password from account where user_id = $1",
      [id],
    );
    const stored = row.rows[0]?.password ?? "";
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(stored).not.toContain(PASSWORD);
  });

  it("refuses one shorter than the policy", async () => {
    const res = await api.call("POST", "/v1/auth/sign-up/email", {
      body: { name: "Eve", email: "eve@example.test", password: "fourteen chars", ...REGISTRATION },
    });
    expect(res.statusCode).toBe(400);
  });

  it.each([
    ["a repeat", "passwordpassword"],
    ["a keyboard run", "qwertyuiopasdfgh"],
    ["the person's own name", "fatimafatima2026"],
    ["the email's name", "Fatima.K-2026-Fatima"],
    ["the name padded with a run", "fatima.k1234567!"],
  ])("refuses %s, naming only the field", async (_, password) => {
    const res = await api.call("POST", "/v1/auth/sign-up/email", {
      body: { name: "Fatima", email: "fatima.k@example.test", password, ...REGISTRATION },
    });
    expect(res.statusCode).toBe(400);
    expect(problemSchema.parse(res.json())).toMatchObject({
      code: "validation_failed",
      issues: [{ path: ["password"], code: "guessable" }],
    });
    expect(res.body).not.toContain(password);
  });

  it("checks new passwords on reset and change too", async () => {
    const { cookie } = await api.newAccount("Gus");
    const change = await api.call("POST", "/v1/auth/change-password", {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: "aaaaaaaaaaaaaaaaaaaa" },
    });
    expect(change.statusCode).toBe(400);
    const reset = await api.call("POST", "/v1/auth/reset-password", {
      body: { token: "anything", newPassword: "12345678901234567890" },
    });
    expect(reset.statusCode).toBe(400);
    expect(reset.json()).toMatchObject({ code: "validation_failed" });
  });
});

describe("signing in (AUTH-04)", () => {
  it("answers a wrong password and an unknown email exactly the same", async () => {
    const wrong = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: DEV_PEOPLE.noah.email, password: "not the right password" },
    });
    const unknown = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: "nobody@example.test", password: "not the right password" },
    });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.body).toBe(unknown.body);
  });

  it("sets an HttpOnly, SameSite cookie that isn't Secure only because the test API is http", async () => {
    const res = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: DEV_PEOPLE.noah.email, password: PASSWORD },
    });
    const header = [res.headers["set-cookie"] ?? []]
      .flat()
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\//);
  });

  it("sends no CORS headers: no web page may call the API", async () => {
    const res = await api.inject({
      method: "OPTIONS",
      url: "/v1/auth/sign-in/email",
      headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    const plain = await api.call("GET", "/v1/me", {
      cookie: api.cookies.selam,
      headers: { origin: "https://evil.example" },
    });
    expect(plain.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("only the routes the app uses (P-78)", () => {
  it.each([
    ["GET", "/v1/auth/list-accounts"],
    // Sessions go through /v1/me/devices, which never hands out a token (P-80).
    ["GET", "/v1/auth/list-sessions"],
    ["POST", "/v1/auth/revoke-session"],
    ["POST", "/v1/auth/revoke-sessions"],
    ["POST", "/v1/auth/revoke-other-sessions"],
    ["POST", "/v1/auth/unlink-account"],
    ["POST", "/v1/auth/update-user"],
    ["POST", "/v1/auth/delete-user"],
    ["POST", "/v1/auth/sign-in/social"],
    ["GET", "/v1/auth/reset-password/some-token"],
    ["GET", "/v1/auth/sign-in/email"],
    ["POST", "/v1/auth/get-session"],
  ] as const)("%s %s is not found", async (method, url) => {
    const res = await api.call(method, url, {
      cookie: api.cookies.selam,
      ...(method === "POST" ? { body: {} } : {}),
    });
    expect(res.statusCode).toBe(404);
    expect(problemSchema.parse(res.json()).code).toBe("not_found");
  });
});

describe("cross-site requests (CSRF)", () => {
  it("refuses Better Auth's writes without the app's header", async () => {
    const res = await api.inject({
      method: "POST",
      url: "/v1/auth/sign-out",
      headers: { cookie: api.cookies.selam, "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
    expect((await me(api.cookies.selam)).statusCode).toBe(200);
  });

  it("refuses a form post, which any web page could send", async () => {
    const res = await api.inject({
      method: "POST",
      url: "/v1/auth/sign-in/email",
      headers: {
        [CLIENT_HEADER.name]: CLIENT_HEADER.value,
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: `email=${DEV_PEOPLE.selam.email}&password=x`,
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(sessionCookieOf(res)).toBeNull();
  });
});

describe("password reset (AUTH-05, AUTH-06)", () => {
  it("answers the same for anyone, ends every session, and the link works once", async () => {
    const person = await api.newAccount("Hana");
    const second = await api.signIn(person.email);
    const ask = (email: string) =>
      api.call("POST", "/v1/auth/request-password-reset", {
        body: { email, redirectTo: "garnet://reset-password" },
      });
    const known = await ask(person.email);
    const unknown = await ask("nobody.at.all@example.test");
    expect(known.statusCode).toBe(unknown.statusCode);
    expect(known.body).toBe(unknown.body);

    const token = lastMail(person.email, "reset")?.token ?? "";
    const newPassword = "a brand new long passphrase";
    const reset = await api.call("POST", "/v1/auth/reset-password", {
      body: { token, newPassword },
    });
    expect(reset.statusCode).toBe(200);
    expect((await me(person.cookie)).statusCode).toBe(401);
    expect((await me(second)).statusCode).toBe(401);
    const reuse = await api.call("POST", "/v1/auth/reset-password", {
      body: { token, newPassword: "yet another long passphrase" },
    });
    expect(reuse.statusCode).toBe(400);
    await expect(api.signIn(person.email)).rejects.toThrow();
    expect((await me(await api.signIn(person.email, newPassword))).statusCode).toBe(200);
  });
});

describe("changing the password (ADR-0006)", () => {
  it("ends every other session even when the request asks to keep them", async () => {
    const person = await api.newAccount("Ida");
    const other = await api.signIn(person.email);
    const res = await api.call("POST", "/v1/auth/change-password", {
      cookie: person.cookie,
      body: {
        currentPassword: PASSWORD,
        newPassword: "a different long passphrase",
        revokeOtherSessions: false,
      },
    });
    expect(res.statusCode).toBe(200);
    expect((await me(other)).statusCode).toBe(401);
    // This device gets a fresh session.
    const fresh = sessionCookieOf(res);
    expect((await me(fresh ?? "")).statusCode).toBe(200);
  });
});

describe("sessions (ADR-0006, P-78)", () => {
  it("can't be used after signing out", async () => {
    const cookie = await api.signIn(DEV_PEOPLE.noah.email);
    await api.call("POST", "/v1/auth/sign-out", { cookie, body: {} });
    expect((await me(cookie)).statusCode).toBe(401);
  });

  it("end for good once their email is no longer confirmed", async () => {
    const person = await api.newAccount("Jo");
    await api.db.query("update app_user set email_verified = false where id = $1", [person.id]);
    expect((await me(person.cookie)).statusCode).toBe(401);
  });

  it("never outlive the ceiling from sign-in, however much they are used", async () => {
    const person = await api.newAccount("Ken");
    await api.db.query(
      `update session set created_at = now() - interval '91 days',
                          expires_at = now() + interval '20 days' where token = $1`,
      [tokenOf(person.cookie)],
    );
    expect((await me(person.cookie)).statusCode).toBe(401);
  });

  it("are extended while in use, but only up to the ceiling", async () => {
    const person = await api.newAccount("Lu");
    // Signed in 89 days ago, due for its daily extension.
    await api.db.query(
      `update session set created_at = now() - interval '89 days',
                          expires_at = now() + interval '1 hour' where token = $1`,
      [tokenOf(person.cookie)],
    );
    const res = await api.call("GET", "/v1/auth/get-session", { cookie: person.cookie });
    expect(res.statusCode).toBe(200);
    const row = await api.db.query<{ within: boolean; extended: boolean }>(
      `select expires_at <= created_at + interval '90 days' as within,
              expires_at > now() + interval '2 hours' as extended
         from session where token = $1`,
      [tokenOf(person.cookie)],
    );
    expect(row.rows[0]).toEqual({ within: true, extended: true });
  });

  it("are extended to the full idle time for a session well inside the ceiling", async () => {
    const person = await api.newAccount("Max");
    await api.db.query(
      "update session set expires_at = now() + interval '1 hour' where token = $1",
      [tokenOf(person.cookie)],
    );
    await api.call("GET", "/v1/auth/get-session", { cookie: person.cookie });
    const row = await api.db.query<{ days: number }>(
      "select round(extract(epoch from expires_at - now()) / 86400)::int as days from session where token = $1",
      [tokenOf(person.cookie)],
    );
    expect(row.rows[0]?.days).toBe(30);
  });
});

describe("per-account back-off (P-78, ADR-0006)", () => {
  it("slows wrong passwords for one email after five, whatever comes next, but not others", async () => {
    const target = await api.newAccount("Nia");
    for (let i = 0; i < 5; i++) {
      const res = await api.call("POST", "/v1/auth/sign-in/email", {
        body: { email: target.email, password: `wrong password number ${String(i)}` },
      });
      expect(res.statusCode).toBe(401);
    }
    const blocked = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: target.email, password: PASSWORD },
    });
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(sessionCookieOf(blocked)).toBeNull();
    // The same for an address with no account: the wait reveals nothing.
    for (let i = 0; i < 5; i++)
      await api.call("POST", "/v1/auth/sign-in/email", {
        body: { email: "no.account@example.test", password: "wrong password here" },
      });
    const ghost = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: "no.account@example.test", password: "wrong password here" },
    });
    expect(ghost.statusCode).toBe(429);
    expect(ghost.body.replace(/"instance":"[^"]+"/, "")).toBe(
      blocked.body.replace(/"instance":"[^"]+"/, ""),
    );
    // Everyone else signs in as usual, and the session the target already had still works.
    expect((await me(await api.signIn(DEV_PEOPLE.noah.email))).statusCode).toBe(200);
    expect((await me(target.cookie)).statusCode).toBe(200);
  });

  it("clears after a right password, so a few typos never add up", async () => {
    const person = await api.newAccount("Oz");
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 4; i++)
        await api.call("POST", "/v1/auth/sign-in/email", {
          body: { email: person.email, password: "a typo in the password" },
        });
      await api.signIn(person.email);
    }
  });

  it("limits emails to one address: three, then a wait (no inbox flooding)", async () => {
    const person = await api.newAccount("Pia");
    const ask = () =>
      api.call("POST", "/v1/auth/request-password-reset", {
        body: { email: person.email, redirectTo: "garnet://reset-password" },
      });
    // Sign-up already sent one (the verification email).
    expect((await ask()).statusCode).toBe(200);
    expect((await ask()).statusCode).toBe(200);
    const fourth = await ask();
    expect(fourth.statusCode).toBe(429);
    expect(api.mail.filter((m) => m.to === person.email)).toHaveLength(3);
  });
});

describe("address limits (Better Auth, per address)", () => {
  it("holds whatever address the request claims, and never limits session checks", async () => {
    // The harness signs in five times as it starts, from 127.0.0.1: three tries are left.
    const limited = await startTestApi({ policy: { rateMax: 8 } });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) {
        const res = await limited.call("POST", "/v1/auth/sign-in/email", {
          body: { email: `someone.${String(i)}@example.test`, password: "wrong password here" },
          headers: {
            "x-forwarded-for": `203.0.113.${String(i)}`,
            "x-real-ip": `198.51.100.${String(i)}`,
            "x-garnet-client-ip": `192.0.2.${String(i)}`,
          },
        });
        statuses.push(res.statusCode);
      }
      expect(statuses).toEqual([401, 401, 401, 429]);
      // A request really from another address has its own allowance.
      const elsewhere = await limited.call("POST", "/v1/auth/sign-in/email", {
        body: { email: "someone@example.test", password: "wrong password here" },
        remoteAddress: "10.0.0.9",
      });
      expect(elsewhere.statusCode).toBe(401);
      for (let i = 0; i < 10; i++) {
        const res = await limited.call("GET", "/v1/auth/get-session", {
          cookie: limited.cookies.noah,
        });
        expect(res.statusCode).toBe(200);
      }
    } finally {
      await limited.close();
    }
  });
});

describe("logs (AGENTS.md §6)", () => {
  it("never carry an email, a password, a token or a cookie from the auth routes", () => {
    const text = JSON.stringify(api.logs);
    expect(text).not.toContain("@example.test");
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(SESSION_COOKIE);
    for (const m of api.mail) if (m.token !== null) expect(text).not.toContain(m.token);
    const routes = new Set(api.logs.map((l) => l["route"]));
    expect(routes).toContain("/v1/auth/*");
  });
});
