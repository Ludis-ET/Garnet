/**
 * Email links that open the app (production-fix-plan A7) and the session guard telling a
 * refused session from a failing server (A5).
 */
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../src/auth/auth";
import { emailLink } from "../src/auth/mailer";
import { SessionGuard, sessionRefused } from "../src/auth/session.guard";
import { ApiProblem } from "../src/errors/problem";
import { startTestApi, TEST_POLICY, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

describe("the https page an account email links to", () => {
  const token = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InJAZXhhbXBsZS5jb20ifQ.sig-_~";

  it("opens the app's page with the token, and nothing else", async () => {
    const res = await api.call("GET", `/v1/open/verify-email?token=${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/html/);
    expect(res.body).toContain(`garnet://verify-email?token=${encodeURIComponent(token)}`);
    // No other site is involved: no external resources, no referrer, no framing, no caching.
    expect(res.body).not.toMatch(/https?:\/\//);
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(String(res.headers["content-security-policy"])).toContain("default-src 'none'");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("serves only the three account pages, and only a well-formed token", async () => {
    for (const page of ["reset-password", "confirm-email-change"]) {
      expect((await api.call("GET", `/v1/open/${page}?token=abc`)).statusCode).toBe(200);
    }
    for (const url of [
      "/v1/open/auth-callback?token=abc",
      "/v1/open/settings?token=abc",
      "/v1/open/verify-email",
      `/v1/open/verify-email?token=${encodeURIComponent('"><script>alert(1)</script>')}`,
      `/v1/open/verify-email?token=${"a".repeat(1025)}`,
    ]) {
      const res = await api.call("GET", url);
      expect(res.statusCode, url).toBe(404);
      expect(res.body, url).not.toContain("<script>");
    }
  });

  it("is the link in the emails once the API has a public address", () => {
    expect(emailLink("https://garnet.lunafh.com/", "reset-password", "a b")).toBe(
      "https://garnet.lunafh.com/v1/open/reset-password?token=a%20b",
    );
    expect(emailLink(null, "verify-email", "t")).toBe("garnet://verify-email?token=t");
  });
});

describe("the session guard (A5)", () => {
  it("treats Better Auth's refusals as no session, and anything else as the server failing", () => {
    expect(sessionRefused({ statusCode: 401 })).toBe(true);
    expect(sessionRefused({ statusCode: 400 })).toBe(true);
    expect(sessionRefused({ statusCode: 500 })).toBe(false);
    expect(sessionRefused(new Error("connection terminated"))).toBe(false);
    expect(sessionRefused(null)).toBe(false);
  });

  it("answers 503, not 401, when the session can't be looked up", async () => {
    const failing = {
      api: { getSession: () => Promise.reject(new Error("connection terminated")) },
    } as unknown as Auth;
    const guard = new SessionGuard(new Reflector(), failing, TEST_POLICY);
    const ctx = {
      getHandler: () => () => undefined,
      getClass: () => Object,
      switchToHttp: () => ({ getRequest: () => ({ method: "GET", headers: {} }) }),
    } as unknown as ExecutionContext;
    const outcome = await guard.canActivate(ctx).catch((e: unknown) => e);
    expect(outcome).toBeInstanceOf(ApiProblem);
    expect((outcome as ApiProblem).code).toBe("unavailable");
  });
});
