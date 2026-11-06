import { z } from "zod";

/**
 * The API's settings, from the environment, checked once at start-up. A bad or missing value
 * stops the process with the variable's name only (never its value: it may hold a password).
 *
 * The account-security values are ADR-0006 policies, which are **Proposed, not accepted**: they
 * are required here with no defaults in code (AGENTS.md §4). apps/api/.env.example carries the
 * values chosen under owner direction P-78, labelled as such, for local use.
 */
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const schema = z
  .object({
    /** The API's own login role (not the owner): RLS always applies to it (AGENTS.md §6). */
    GARNET_API_DATABASE_URL: z.string().min(1),
    GARNET_API_HOST: z.string().min(1).default("127.0.0.1"),
    GARNET_API_PORT: int(1, 65_535).default(3000),
    GARNET_API_LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "silent"])
      .default("info"),

    /** Signs Better Auth's cookies. At least 32 characters of randomness. */
    GARNET_AUTH_SECRET: z.string().min(32),
    /** Where the API is reached, e.g. http://127.0.0.1:3000 (Better Auth's baseURL). */
    GARNET_AUTH_BASE_URL: z.url(),

    // ADR-0006 policies (Proposed): required, no defaults.
    GARNET_PASSWORD_MIN_LENGTH: int(8, 64),
    /** A session ends after this many days unused (it is extended while in use)... */
    GARNET_SESSION_DAYS: int(1, 365),
    /** ...and after this many days in all, however much it is used (P-78). */
    GARNET_SESSION_MAX_DAYS: int(1, 365),
    GARNET_SESSION_REFRESH_HOURS: int(1, 24 * 30),
    GARNET_AUTH_RATE_WINDOW_SECONDS: int(1, 3600),
    GARNET_AUTH_RATE_MAX: int(1, 1000),
    GARNET_VERIFY_TOKEN_MINUTES: int(5, 7 * 24 * 60),
    GARNET_RESET_TOKEN_MINUTES: int(5, 24 * 60),
    /** P-18 (Proposed): the database also caps invitations at 24 hours. */
    GARNET_INVITE_TTL_HOURS: int(1, 24),

    /** Where emails go: the local Mailpit (smtp://127.0.0.1:1025) until U-07 picks a provider. */
    GARNET_SMTP_URL: z.url(),
    GARNET_MAIL_FROM: z.string().min(3),

    // Google and Apple (P-79): each is on only when all its values are set. Never committed:
    // they live in apps/api/.env (see .env.example and infra/README.md).
    /** Google's OAuth "Web application" client. */
    GARNET_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GARNET_GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    /** Apple's Services ID (web sign-in) and its client secret, a signed JWT (scripts/). */
    GARNET_APPLE_CLIENT_ID: z.string().min(1).optional(),
    GARNET_APPLE_CLIENT_SECRET: z.string().min(1).optional(),
    /** The iPhone app's bundle id, for Sign in with Apple on the phone itself. */
    GARNET_APPLE_BUNDLE_ID: z.string().min(1).optional(),

    /** Better Auth's telemetry must stay off (AGENTS.md §5: no analytics). */
    BETTER_AUTH_TELEMETRY: z.undefined({ error: "must not be set" }).optional(),
  })
  .refine((c) => c.GARNET_SESSION_MAX_DAYS >= c.GARNET_SESSION_DAYS, {
    path: ["GARNET_SESSION_MAX_DAYS"],
    error: "must be at least GARNET_SESSION_DAYS",
  })
  .refine(
    (c) =>
      (c.GARNET_GOOGLE_CLIENT_ID === undefined) === (c.GARNET_GOOGLE_CLIENT_SECRET === undefined),
    {
      path: ["GARNET_GOOGLE_CLIENT_SECRET"],
      error: "set both Google values or neither",
    },
  )
  .refine(
    (c) =>
      (c.GARNET_APPLE_CLIENT_ID === undefined) === (c.GARNET_APPLE_CLIENT_SECRET === undefined),
    {
      path: ["GARNET_APPLE_CLIENT_SECRET"],
      error: "set both Apple values or neither",
    },
  );

/** Google and Apple sign-in, when configured (P-79). */
export interface SocialConfig {
  google?: { clientId: string; clientSecret: string };
  apple?: { clientId: string; clientSecret: string; appBundleIdentifier?: string };
}

export interface AuthPolicy {
  passwordMinLength: number;
  sessionDays: number;
  sessionMaxDays: number;
  sessionRefreshHours: number;
  rateWindowSeconds: number;
  rateMax: number;
  verifyTokenMinutes: number;
  resetTokenMinutes: number;
  inviteTtlHours: number;
}

export interface ApiConfig {
  databaseUrl: string;
  host: string;
  port: number;
  logLevel: z.infer<typeof schema>["GARNET_API_LOG_LEVEL"];
  auth: { secret: string; baseUrl: string; policy: AuthPolicy; social: SocialConfig };
  mail: { smtpUrl: string; from: string };
}

export function readConfig(env: Readonly<Record<string, string | undefined>>): ApiConfig {
  const normalized = {
    ...env,
    ...(env["PORT"] !== undefined && env["GARNET_API_PORT"] === undefined
      ? { GARNET_API_PORT: env["PORT"] }
      : {}),
  };
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Invalid or missing configuration: ${names}`);
  }
  const c = parsed.data;
  return {
    databaseUrl: c.GARNET_API_DATABASE_URL,
    host: c.GARNET_API_HOST,
    port: c.GARNET_API_PORT,
    logLevel: c.GARNET_API_LOG_LEVEL,
    auth: {
      secret: c.GARNET_AUTH_SECRET,
      baseUrl: c.GARNET_AUTH_BASE_URL,
      policy: {
        passwordMinLength: c.GARNET_PASSWORD_MIN_LENGTH,
        sessionDays: c.GARNET_SESSION_DAYS,
        sessionMaxDays: c.GARNET_SESSION_MAX_DAYS,
        sessionRefreshHours: c.GARNET_SESSION_REFRESH_HOURS,
        rateWindowSeconds: c.GARNET_AUTH_RATE_WINDOW_SECONDS,
        rateMax: c.GARNET_AUTH_RATE_MAX,
        verifyTokenMinutes: c.GARNET_VERIFY_TOKEN_MINUTES,
        resetTokenMinutes: c.GARNET_RESET_TOKEN_MINUTES,
        inviteTtlHours: c.GARNET_INVITE_TTL_HOURS,
      },
      social: {
        ...(c.GARNET_GOOGLE_CLIENT_ID === undefined || c.GARNET_GOOGLE_CLIENT_SECRET === undefined
          ? {}
          : {
              google: {
                clientId: c.GARNET_GOOGLE_CLIENT_ID,
                clientSecret: c.GARNET_GOOGLE_CLIENT_SECRET,
              },
            }),
        ...(c.GARNET_APPLE_CLIENT_ID === undefined || c.GARNET_APPLE_CLIENT_SECRET === undefined
          ? {}
          : {
              apple: {
                clientId: c.GARNET_APPLE_CLIENT_ID,
                clientSecret: c.GARNET_APPLE_CLIENT_SECRET,
                ...(c.GARNET_APPLE_BUNDLE_ID === undefined
                  ? {}
                  : { appBundleIdentifier: c.GARNET_APPLE_BUNDLE_ID }),
              },
            }),
      },
    },
    mail: { smtpUrl: c.GARNET_SMTP_URL, from: c.GARNET_MAIL_FROM },
  };
}
