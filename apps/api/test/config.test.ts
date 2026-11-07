import { describe, expect, it } from "vitest";
import { readConfig } from "../src/config";

const URL = "postgres://garnet_api:s3cret-value@127.0.0.1:5432/garnet";
const SECRET = "a-test-secret-that-is-long-enough-000000";

/** Everything the API requires: the ADR-0006 values have no defaults (P-78 values here). */
const ENV = {
  GARNET_API_DATABASE_URL: URL,
  GARNET_AUTH_SECRET: SECRET,
  GARNET_AUTH_BASE_URL: "http://127.0.0.1:3000",
  GARNET_PASSWORD_MIN_LENGTH: "15",
  GARNET_SESSION_DAYS: "30",
  GARNET_SESSION_MAX_DAYS: "90",
  GARNET_SESSION_REFRESH_HOURS: "24",
  GARNET_AUTH_RATE_WINDOW_SECONDS: "60",
  GARNET_AUTH_RATE_MAX: "10",
  GARNET_VERIFY_TOKEN_MINUTES: "1440",
  GARNET_RESET_TOKEN_MINUTES: "30",
  GARNET_INVITE_TTL_HOURS: "24",
  GARNET_SMTP_URL: "smtp://127.0.0.1:1025",
  GARNET_MAIL_FROM: "Garnet <hello@garnet.local>",
};

function errorOf(env: Record<string, string | undefined>): string {
  try {
    readConfig(env);
  } catch (error) {
    return String(error);
  }
  throw new Error("expected the configuration to be refused");
}

describe("API configuration", () => {
  it("reads every setting, with safe local defaults only for where it listens", () => {
    expect(readConfig(ENV)).toMatchObject({
      databaseUrl: URL,
      host: "127.0.0.1",
      port: 3000,
      logLevel: "info",
      auth: {
        secret: SECRET,
        baseUrl: "http://127.0.0.1:3000",
        policy: {
          passwordMinLength: 15,
          sessionDays: 30,
          sessionMaxDays: 90,
          sessionRefreshHours: 24,
          rateWindowSeconds: 60,
          rateMax: 10,
          verifyTokenMinutes: 1440,
          resetTokenMinutes: 30,
          inviteTtlHours: 24,
        },
      },
      mail: { smtpUrl: "smtp://127.0.0.1:1025", from: "Garnet <hello@garnet.local>" },
    });
    expect(readConfig(ENV).auth.social).toEqual({});
  });

  it("switches Google and Apple on only with every value they need (P-79)", () => {
    const google = { GARNET_GOOGLE_CLIENT_ID: "g-id", GARNET_GOOGLE_CLIENT_SECRET: "g-secret" };
    const apple = { GARNET_APPLE_CLIENT_ID: "a-id", GARNET_APPLE_CLIENT_SECRET: "a-jwt" };
    expect(readConfig({ ...ENV, ...google }).auth.social).toEqual({
      google: { clientId: "g-id", clientSecret: "g-secret" },
    });
    expect(
      readConfig({ ...ENV, ...apple, GARNET_APPLE_BUNDLE_ID: "app.garnet" }).auth.social,
    ).toEqual({
      apple: { clientId: "a-id", clientSecret: "a-jwt", appBundleIdentifier: "app.garnet" },
    });
    expect(errorOf({ ...ENV, GARNET_GOOGLE_CLIENT_ID: "g-id" })).toMatch(
      /GARNET_GOOGLE_CLIENT_SECRET/,
    );
    expect(errorOf({ ...ENV, GARNET_APPLE_CLIENT_SECRET: "a-jwt" })).toMatch(
      /GARNET_APPLE_CLIENT_SECRET/,
    );
    expect(errorOf({ ...ENV, GARNET_GOOGLE_CLIENT_ID: "g-id" })).not.toContain("g-id");
  });

  it("has no default for any account-security value (ADR-0006 is Proposed)", () => {
    for (const name of Object.keys(ENV).filter((n) => /PASSWORD|SESSION|RATE|TOKEN|INVITE/.test(n)))
      expect(errorOf({ ...ENV, [name]: undefined })).toContain(name);
  });

  it("names a missing or bad setting without ever echoing a value", () => {
    expect(errorOf({})).toMatch(/GARNET_API_DATABASE_URL/);
    const bad = errorOf({ ...ENV, GARNET_API_PORT: "99999" });
    expect(bad).toMatch(/GARNET_API_PORT/);
    expect(bad).not.toContain("s3cret-value");
    expect(bad).not.toContain(SECRET);
  });

  it("refuses a short secret, an invitation over 24 hours, and a session cap below its idle time", () => {
    expect(errorOf({ ...ENV, GARNET_AUTH_SECRET: "short" })).toMatch(/GARNET_AUTH_SECRET/);
    expect(errorOf({ ...ENV, GARNET_INVITE_TTL_HOURS: "25" })).toMatch(/GARNET_INVITE_TTL_HOURS/);
    expect(errorOf({ ...ENV, GARNET_SESSION_MAX_DAYS: "7" })).toMatch(/GARNET_SESSION_MAX_DAYS/);
  });

  it("refuses to start with Better Auth's telemetry switched on (AGENTS.md §5)", () => {
    expect(errorOf({ ...ENV, BETTER_AUTH_TELEMETRY: "1" })).toMatch(/BETTER_AUTH_TELEMETRY/);
  });

  it("configures S3/R2 storage when all required credentials are set (P-76, U-07)", () => {
    const s3 = {
      GARNET_S3_ENDPOINT: "https://3e6d6c75647cf0fa9065b6c77ba698b1.r2.cloudflarestorage.com",
      GARNET_S3_ACCESS_KEY_ID: "test-access-key",
      GARNET_S3_SECRET_ACCESS_KEY: "test-secret-key",
      GARNET_MEDIA_BUCKET: "my-bucket",
    };
    expect(readConfig({ ...ENV, ...s3 }).storage).toEqual({
      endpoint: "https://3e6d6c75647cf0fa9065b6c77ba698b1.r2.cloudflarestorage.com",
      region: "auto",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucket: "my-bucket",
    });
    expect(readConfig(ENV).storage).toBeUndefined();

    // Partial config must be rejected
    expect(
      errorOf({
        ...ENV,
        GARNET_S3_ENDPOINT: "https://3e6d6c75647cf0fa9065b6c77ba698b1.r2.cloudflarestorage.com",
      }),
    ).toMatch(/GARNET_S3_ENDPOINT/);
    expect(errorOf({ ...ENV, GARNET_S3_ACCESS_KEY_ID: "key" })).toMatch(/GARNET_S3_ENDPOINT/);
  });
});
