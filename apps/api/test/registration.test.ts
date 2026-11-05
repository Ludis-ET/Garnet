/**
 * Registration details (P-79): a birthday, 16 and over, and the current terms, given with an
 * email sign-up or right after a first Google or Apple sign-in, before anything else works.
 */
import { problemSchema, registrationStateSchema, TERMS_VERSION } from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/auth/password";
import { ageCheckToday } from "../src/auth/today";
import { PASSWORD, REGISTRATION, sessionCookieOf, startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

/** A date `years` years before today's age-check date (P-79). */
function yearsAgo(years: number, dayOffset = 0): string {
  const [y, m, d] = ageCheckToday().split("-").map(Number) as [number, number, number];
  const day = d + dayOffset;
  // Stay on real dates: the 28th exists in every month.
  const safeDay = Math.min(Math.max(day, 1), 28);
  return `${String(y - years)}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

const signUp = (email: string, extra: Record<string, unknown>) =>
  api.call("POST", "/v1/auth/sign-up/email", {
    body: { name: "Rin", email, password: PASSWORD, ...extra },
  });

/** An account as a first Google or Apple sign-in leaves it: confirmed, no birthday, no terms. */
async function providerOnlyAccount(name: string): Promise<{ id: string; cookie: string }> {
  const email = `${name.toLowerCase()}@provider.example`;
  const id = (
    await api.db.query<{ id: string }>(
      "insert into app_user (email, name, email_verified) values ($1, $2, true) returning id",
      [email, name],
    )
  ).rows[0]?.id;
  if (id === undefined) throw new Error("no id");
  // A password only so the test can sign in; a real one would have a Google or Apple link.
  await api.db.query(
    `insert into account (user_id, account_id, provider_id, password)
     values ($1::uuid, $1::text, 'credential', $2)`,
    [id, await hashPassword(PASSWORD)],
  );
  return { id, cookie: await api.signIn(email) };
}

describe("email sign-up asks for the details with the account", () => {
  it.each([
    ["no birthday", { termsVersion: TERMS_VERSION }, "birthDate", "invalid_date"],
    [
      "a date that doesn't exist",
      { birthDate: "2001-02-29", termsVersion: TERMS_VERSION },
      "birthDate",
      "invalid_date",
    ],
    [
      "someone under 16",
      { birthDate: yearsAgo(15), termsVersion: TERMS_VERSION },
      "birthDate",
      "too_young",
    ],
    [
      "a birthday in the future",
      { birthDate: yearsAgo(-1), termsVersion: TERMS_VERSION },
      "birthDate",
      "too_young",
    ],
    ["no terms", { birthDate: "2000-01-01" }, "termsVersion", "terms"],
    ["old terms", { birthDate: "2000-01-01", termsVersion: "2020-01-01" }, "termsVersion", "terms"],
  ])("refuses %s, naming only the field", async (_, extra, path, code) => {
    const res = await signUp(`refused.${code}.${path}@example.test`, extra);
    expect(res.statusCode).toBe(400);
    expect(problemSchema.parse(res.json()).issues).toContainEqual({ path: [path], code });
    // Nothing was created.
    const rows = await api.db.query("select 1 from app_user where email like 'refused.%'");
    expect(rows.rows).toEqual([]);
  });

  it("lets in someone who turns 16 today", async () => {
    const res = await signUp("sixteen.today@example.test", {
      birthDate: yearsAgo(16),
      termsVersion: TERMS_VERSION,
    });
    expect(res.statusCode).toBe(200);
  });

  it("never takes the acceptance time from the request", async () => {
    const res = await signUp("early@example.test", {
      ...REGISTRATION,
      termsAcceptedAt: "1999-01-01",
    });
    expect(res.statusCode).toBe(400);
  });

  it("records the birthday, the terms and when they were accepted, by the server's clock", async () => {
    const res = await signUp("rin@example.test", REGISTRATION);
    expect(res.statusCode).toBe(200);
    const row = await api.db.query<{ birth_date: string; terms_version: string; recent: boolean }>(
      `select birth_date, terms_version, terms_accepted_at > now() - interval '1 minute' as recent
         from app_user where email = 'rin@example.test'`,
    );
    expect(row.rows).toEqual([
      { birth_date: REGISTRATION.birthDate, terms_version: TERMS_VERSION, recent: true },
    ]);
  });
});

describe("after a first Google or Apple sign-in", () => {
  it("allows only finishing registration (and /v1/me) until it is done", async () => {
    const person = await providerOnlyAccount("Tao");
    const blocked = await api.call("GET", "/v1/me/setup", { cookie: person.cookie });
    expect(blocked.statusCode).toBe(403);
    expect(problemSchema.parse(blocked.json()).code).toBe("registration_required");
    for (const url of ["/v1/pairing"]) {
      expect((await api.call("GET", url, { cookie: person.cookie })).statusCode).toBe(403);
    }
    expect((await api.call("POST", "/v1/invitations", { cookie: person.cookie })).statusCode).toBe(
      403,
    );
    expect((await api.call("GET", "/v1/me", { cookie: person.cookie })).statusCode).toBe(200);
    const state = registrationStateSchema.parse(
      (await api.call("GET", "/v1/me/registration", { cookie: person.cookie })).json(),
    );
    expect(state).toEqual({
      complete: false,
      birthDate: null,
      termsVersion: null,
      currentTermsVersion: TERMS_VERSION,
    });

    const done = await api.call("POST", "/v1/me/registration", {
      cookie: person.cookie,
      body: REGISTRATION,
    });
    expect(done.json()).toEqual({ ok: true });
    expect((await api.call("GET", "/v1/me/setup", { cookie: person.cookie })).statusCode).toBe(200);
  });

  it("refuses details that aren't a real date or the current terms", async () => {
    const person = await providerOnlyAccount("Uma");
    for (const body of [
      { birthDate: "2000-13-01", termsVersion: TERMS_VERSION },
      { birthDate: "2000-01-01", termsVersion: "2020-01-01" },
      { birthDate: "2000-01-01", termsVersion: TERMS_VERSION, admin: true },
    ]) {
      const res = await api.call("POST", "/v1/me/registration", { cookie: person.cookie, body });
      expect(res.statusCode).toBe(400);
    }
  });

  it("removes a new account that is under 16, with its session (nothing is kept)", async () => {
    const person = await providerOnlyAccount("Vic");
    const res = await api.call("POST", "/v1/me/registration", {
      cookie: person.cookie,
      body: { birthDate: yearsAgo(15), termsVersion: TERMS_VERSION },
    });
    expect(res.json()).toEqual({ ok: false, reason: "too-young" });
    const left = await api.db.query("select 1 from app_user where id = $1", [person.id]);
    expect(left.rows).toEqual([]);
    expect((await api.call("GET", "/v1/me", { cookie: person.cookie })).statusCode).toBe(401);
  });

  it("asks everyone again when the terms change", async () => {
    const person = await api.newAccount("Wes");
    await api.db.query("update app_user set terms_version = '2020-01-01' where id = $1", [
      person.id,
    ]);
    const res = await api.call("GET", "/v1/me/setup", { cookie: person.cookie });
    expect(problemSchema.parse(res.json()).code).toBe("registration_required");
    await api.call("POST", "/v1/me/registration", { cookie: person.cookie, body: REGISTRATION });
    expect((await api.call("GET", "/v1/me/setup", { cookie: person.cookie })).statusCode).toBe(200);
  });

  it("sign-in answers carry no raw session token in their body", async () => {
    const res = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: "rin@example.test", password: PASSWORD },
    });
    expect(sessionCookieOf(res)).toBeNull(); // not confirmed yet: 403, no session
    const person = await api.newAccount("Xia");
    const signIn = await api.call("POST", "/v1/auth/sign-in/email", {
      body: { email: person.email, password: PASSWORD },
    });
    expect(signIn.statusCode).toBe(200);
    expect(signIn.json()).not.toHaveProperty("token");
    const session = await api.call("GET", "/v1/auth/get-session", { cookie: person.cookie });
    expect(session.json<{ session: object }>().session).not.toHaveProperty("token");
    expect(session.body).not.toMatch(/"token"/);
  });
});
