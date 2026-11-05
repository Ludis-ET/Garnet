/**
 * The API foundation (B0, B-12): health, the session guard, /v1/me under RLS, RFC 9457
 * problems, request ids, headers, and allow-listed logs (AGENTS.md §6). Sessions are real
 * Better Auth sessions, made by signing in through the API (B1, P-77).
 */
import { healthSchema, meSchema, PROBLEMS, problemSchema } from "@garnet/contracts";
import { DEV_RELATIONSHIP_ID } from "@garnet/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEV_PEOPLE,
  SESSION_COOKIE,
  startTestApi,
  STRANGER,
  tokenOf,
  type TestApi,
} from "./harness";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** The only fields a log line may carry (pino's own plus the allow-list). */
const LOG_KEYS = new Set([
  "level",
  "time",
  "pid",
  "hostname",
  "reqId",
  "msg",
  "requestId",
  "method",
  "route",
  "status",
  "latencyMs",
  "code",
  "error",
  "sqlState",
]);

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

describe("health", () => {
  it("answers ok with the database, without a session", async () => {
    const res = await api.inject({ method: "GET", url: "/v1/health" });
    expect(res.statusCode).toBe(200);
    expect(healthSchema.parse(res.json())).toEqual({ status: "ok", database: "ok" });
  });

  it("says degraded with 503 when the database is down", async () => {
    const down = await startTestApi({ databaseDown: true });
    try {
      const res = await down.inject({ method: "GET", url: "/v1/health" });
      expect(res.statusCode).toBe(503);
      expect(healthSchema.parse(res.json())).toEqual({
        status: "degraded",
        database: "unavailable",
      });
    } finally {
      await down.close();
    }
  });
});

describe("/v1/me", () => {
  it("returns the session's own person and relationship", async () => {
    const res = await api.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: api.cookies.selam },
    });
    expect(res.statusCode).toBe(200);
    expect(meSchema.parse(res.json())).toEqual({
      userId: DEV_PEOPLE.selam.id,
      relationshipId: DEV_RELATIONSHIP_ID,
    });
  });

  it("gives someone in another relationship only their own", async () => {
    const res = await api.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: api.cookies.stranger },
    });
    expect(res.json()).toEqual({ userId: STRANGER.id, relationshipId: STRANGER.relationshipId });
  });

  it("ignores any user named in the request: identity comes from the session", async () => {
    const res = await api.inject({
      method: "GET",
      url: `/v1/me?userId=${DEV_PEOPLE.noah.id}`,
      headers: { cookie: api.cookies.selam, "x-user-id": DEV_PEOPLE.noah.id },
    });
    expect(res.json()).toMatchObject({ userId: DEV_PEOPLE.selam.id });
  });
});

describe("sessions (ADR-0006, P-78)", () => {
  const cases: [string, (api: TestApi) => Record<string, string>][] = [
    ["no cookie", () => ({})],
    ["a bearer token instead", (a) => ({ authorization: `Bearer ${tokenOf(a.cookies.selam)}` })],
    ["a malformed cookie", () => ({ cookie: `${SESSION_COOKIE}=not-a-token` })],
    [
      "a live session's token without its signature (a leaked session table)",
      (a) => ({ cookie: `${SESSION_COOKIE}=${tokenOf(a.cookies.selam)}` }),
    ],
    [
      "a live session's token with a forged signature",
      (a) => ({ cookie: `${SESSION_COOKIE}=${tokenOf(a.cookies.selam)}.${"A".repeat(43)}%3D` }),
    ],
  ];

  it.each(cases)("refuses %s with the one 401 problem", async (_, headersFor) => {
    const res = await api.inject({ method: "GET", url: "/v1/me", headers: headersFor(api) });
    expect(res.statusCode).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = problemSchema.parse(res.json());
    expect(body).toEqual({
      type: "urn:garnet:problem:unauthorized",
      title: PROBLEMS.unauthorized.title,
      status: 401,
      code: "unauthorized",
      instance: res.headers["x-request-id"],
    });
  });

  it("treats revoked and expired sessions exactly like unknown ones", async () => {
    for (const cookie of [api.cookies.revoked, api.cookies.expired]) {
      const res = await api.inject({ method: "GET", url: "/v1/me", headers: { cookie } });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        code: "unauthorized",
        title: PROBLEMS.unauthorized.title,
      });
    }
  });
});

describe("problems, ids and headers (B-12)", () => {
  it("answers unknown routes with a 404 problem that echoes nothing from the request", async () => {
    const res = await api.inject({ method: "GET", url: "/v1/nothing-here/secret-word" });
    expect(res.statusCode).toBe(404);
    expect(problemSchema.parse(res.json()).code).toBe("not_found");
    expect(res.body).not.toContain("secret-word");
  });

  it("issues its own request id, ignoring one the caller sends", async () => {
    const res = await api.inject({
      method: "GET",
      url: "/v1/health",
      headers: { "x-request-id": "caller-chosen", "request-id": "caller-chosen" },
    });
    expect(res.headers["x-request-id"]).toMatch(UUID);
  });

  it("marks every response uncacheable and unsniffable", async () => {
    for (const url of ["/v1/health", "/v1/me", "/v1/nothing"]) {
      const res = await api.inject({ method: "GET", url });
      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    }
  });

  it("turns an unexpected failure into a bare 500 and logs no message", async () => {
    const broken = await startTestApi();
    try {
      await broken.db.exec("alter table relationship_member rename to relationship_member_gone");
      const res = await broken.inject({
        method: "GET",
        url: "/v1/me",
        headers: { cookie: broken.cookies.selam },
      });
      expect(res.statusCode).toBe(500);
      expect(problemSchema.parse(res.json()).code).toBe("internal");
      expect(res.body).not.toMatch(/relationship_member|does not exist/);
      const failure = broken.logs.find((l) => l["msg"] === "request failed");
      expect(failure).toMatchObject({ code: "internal", sqlState: "42P01" });
      expect(JSON.stringify(failure)).not.toMatch(/relationship_member|does not exist/);
    } finally {
      await broken.close();
    }
  });
});

describe("logs (AGENTS.md §6)", () => {
  it("write one allow-listed line per request: route pattern, never paths, tokens or headers", async () => {
    const before = api.logs.length;
    await api.inject({
      method: "GET",
      url: "/v1/me?word=private",
      headers: { cookie: api.cookies.noah, "user-agent": "garnet-test" },
    });
    const lines = api.logs.slice(before);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ route: "/v1/me", method: "GET", status: 200 });
    for (const line of api.logs) {
      for (const key of Object.keys(line)) expect(LOG_KEYS).toContain(key);
      const text = JSON.stringify(line);
      for (const cookie of Object.values(api.cookies)) expect(text).not.toContain(tokenOf(cookie));
      expect(text).not.toMatch(/private|garnet-test|authorization|cookie|@example/i);
    }
  });
});
