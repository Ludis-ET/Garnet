import { describe, expect, it } from "vitest";
import { healthSchema, meSchema, PROBLEM_CODES, PROBLEMS, problemSchema, problemType } from ".";

describe("problem details (RFC 9457)", () => {
  it("gives every code a fixed client-error or server-error status and a title", () => {
    for (const code of PROBLEM_CODES) {
      const { status, title } = PROBLEMS[code];
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
      expect(title.length).toBeGreaterThan(0);
      expect(problemType(code)).toBe(`urn:garnet:problem:${code}`);
    }
  });

  it("reads the same for 'not signed in' and any session problem (one code, one title)", () => {
    expect(PROBLEMS.unauthorized).toEqual({ status: 401, title: "Please sign in again." });
  });

  it("accepts a problem the API sends and rejects an unknown code", () => {
    const ok = {
      type: problemType("not_found"),
      title: PROBLEMS.not_found.title,
      status: 404,
      code: "not_found",
      instance: "4f1c3a5e-0000-4000-8000-000000000001",
    };
    expect(problemSchema.parse(ok)).toEqual(ok);
    expect(problemSchema.safeParse({ ...ok, code: "teapot" }).success).toBe(false);
  });
});

describe("health and me", () => {
  it("accepts only the known health states", () => {
    expect(healthSchema.parse({ status: "ok", database: "ok" })).toEqual({
      status: "ok",
      database: "ok",
    });
    expect(healthSchema.safeParse({ status: "fine", database: "ok" }).success).toBe(false);
  });

  it("requires UUID ids and allows no relationship yet", () => {
    const userId = "0192f0a0-0000-7000-8000-000000000001";
    expect(meSchema.parse({ userId, relationshipId: null })).toEqual({
      userId,
      relationshipId: null,
    });
    expect(meSchema.safeParse({ userId: "selam", relationshipId: null }).success).toBe(false);
  });
});
