/** The health page tells how email is going (P-96): a state and a code, nothing else. */
import { healthSchema } from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetMailStatusForTest, setMailStatus } from "../src/mail/status";
import { startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  resetMailStatusForTest();
  await api.close();
});

describe("email on the health page", () => {
  it("says nothing until the mail server was tried, then how it went", async () => {
    resetMailStatusForTest();
    const before = healthSchema.parse((await api.call("GET", "/v1/health")).json());
    expect(before.mail).toBeUndefined();
    setMailStatus({ state: "failing", error: "EAUTH 535" });
    const res = await api.call("GET", "/v1/health");
    // Email failing never makes the API itself unhealthy.
    expect(res.statusCode).toBe(200);
    expect(healthSchema.parse(res.json())).toEqual({
      status: "ok",
      database: "ok",
      mail: { state: "failing", error: "EAUTH 535" },
    });
    setMailStatus({ state: "ok", error: null });
    expect(healthSchema.parse((await api.call("GET", "/v1/health")).json()).mail).toEqual({
      state: "ok",
      error: null,
    });
  });
});
