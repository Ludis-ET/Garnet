import { describe, expect, it } from "vitest";
import { readConfig } from "../src/config";

const URL = "postgres://garnet_api:s3cret-value@127.0.0.1:5432/garnet";

describe("API configuration", () => {
  it("reads the database URL and fills in safe local defaults", () => {
    expect(readConfig({ GARNET_API_DATABASE_URL: URL })).toEqual({
      databaseUrl: URL,
      host: "127.0.0.1",
      port: 3000,
      logLevel: "info",
    });
  });

  it("names a missing or bad setting without ever echoing a value", () => {
    expect(() => readConfig({})).toThrow(/GARNET_API_DATABASE_URL/);
    try {
      readConfig({ GARNET_API_DATABASE_URL: URL, GARNET_API_PORT: "99999" });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).toMatch(/GARNET_API_PORT/);
      expect(String(error)).not.toContain("s3cret-value");
    }
  });
});
