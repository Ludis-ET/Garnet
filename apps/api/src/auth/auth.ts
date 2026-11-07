import { expo } from "@better-auth/expo";
import { isOldEnough, TERMS_VERSION } from "@garnet/contracts";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import type { Dialect } from "kysely";
import type { Pool } from "pg";
import type { AuthPolicy, SocialConfig } from "../config";
import {
  APP_ORIGIN,
  AUTH_BASE,
  CLIENT_IP_HEADER,
  PROVIDER_HOSTS,
  type ProviderId,
} from "./constants";
import { appHandoff } from "./handoff";
import type { Mailer } from "./mailer";
import { hashPassword, verifyPassword } from "./password";
import { ageCheckToday } from "./today";

/**
 * Accounts and sessions through Better Auth (owner direction P-77, B1). Email and password, a
 * verified email before any session, single-use hashed email links, every session revoked on a
 * password reset or change, rate limits without lockout, and the same answer whether or not an
 * email has an account. The values come from AuthPolicy: ADR-0006's policies are Proposed, so
 * they are required settings, never defaults here.
 *
 * Owner direction P-78 settles how ADR-0006 is met here:
 * - passwords: Argon2id (./password.ts), never Better Auth's default scrypt;
 * - session tokens are stored as issued, but every cookie carries an HMAC signature made with
 *   GARNET_AUTH_SECRET, which is never in the database: a leaked session table alone signs no
 *   one in (tested);
 * - sessions are server-side, checked on every request, so revocation is immediate; they slide
 *   while in use (sessionDays) but never outlive sessionMaxDays from sign-in, in place of
 *   short access tokens with rotating refresh tokens.
 *
 * Owner direction P-79 adds Google and Apple, each on only when configured:
 * - one account per person: a Google or Apple sign-in whose provider vouches for the email joins
 *   the account that already has it (trusted providers), never a second account;
 * - an existing account whose email was never confirmed could have been made by someone else
 *   with a password they know, so linking a verified Google or Apple identity to it first
 *   removes everything unproven (its password, links and sessions), as Better Auth does for
 *   magic links; the provider's verified email then confirms the account for its real owner;
 * - the browser sign-in returns to the app through ./handoff.ts, never as a cookie in a link;
 * - provider tokens are stored encrypted; every account gives a birthday (16 and over) and
 *   accepts the current terms once (additional user fields, checked here and in the bridge).
 *
 * Its routes live under /v1/auth and speak Better Auth's own protocol (the app uses Better Auth's
 * Expo client); ./bridge.ts exposes only the ones the app uses and adds per-account back-off and
 * the password blocklist. Every other route checks the session through `auth.api.getSession`.
 */
export interface AuthOptions {
  /** A pg Pool (the API) or a Kysely dialect (tests on PGlite). */
  database: Pool | { dialect: Dialect; type: "postgres" };
  secret: string;
  baseUrl: string;
  policy: AuthPolicy;
  mailer: Mailer;
  /** Allow-listed logging: a level and a fixed event name, never Better Auth's message. */
  log: (level: "error" | "warn" | "info" | "debug", event: string) => void;
  /** Google and Apple, when configured (P-79). */
  social?: SocialConfig;
}

/** The providers a configuration switches on. */
export function enabledProviders(social: SocialConfig): ProviderId[] {
  return (Object.keys(PROVIDER_HOSTS) as ProviderId[]).filter((id) => social[id] !== undefined);
}

/** Better Auth routes where a password or an email link is tried (strictly rate limited). */
export const CREDENTIAL_PATHS = [
  "/sign-in/email",
  "/sign-up/email",
  "/verify-email",
  "/send-verification-email",
  "/request-password-reset",
  "/reset-password",
  "/change-password",
  "/change-email",
] as const;

/** The limit for the other auth routes: high enough that normal use never meets it. */
const GENERAL_LIMIT = { windowSeconds: 60, max: 100 };

export { APP_ORIGIN };

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Refuses registration details that aren't the current terms and an old-enough birthday. Email
 * sign-ups give both; a Google or Apple sign-up gives neither and is asked next.
 */
function checkRegistration(user: Record<string, unknown>): void {
  const { birthDate, termsVersion } = user;
  if (birthDate == null && termsVersion == null) return;
  const valid =
    typeof birthDate === "string" &&
    isOldEnough(birthDate, ageCheckToday()) &&
    termsVersion === TERMS_VERSION;
  if (!valid)
    throw APIError.from("BAD_REQUEST", { code: "INVALID_REGISTRATION", message: "Invalid" });
}

export function createAuth(o: AuthOptions) {
  const p = o.policy;
  const social = o.social ?? {};
  const auth = betterAuth({
    appName: "Garnet",
    baseURL: o.baseUrl,
    basePath: AUTH_BASE,
    secret: o.secret,
    database: o.database,
    // AGENTS.md §5: no analytics. Off here, and the API refuses to start if the env enables it.
    telemetry: { enabled: false },
    // Apple posts its answer back from its own site (form_post).
    trustedOrigins: [
      APP_ORIGIN,
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      ...(social.apple === undefined ? [] : ["https://appleid.apple.com"]),
    ],
    plugins: [expo(), appHandoff()],
    socialProviders: {
      ...(social.google === undefined
        ? {}
        : {
            google: {
              clientId: social.google.clientId,
              clientSecret: social.google.clientSecret,
              // Always ask which Google account, so a shared browser never picks one silently.
              prompt: "select_account" as const,
            },
          }),
      ...(social.apple === undefined
        ? {}
        : {
            apple: {
              clientId: social.apple.clientId,
              clientSecret: social.apple.clientSecret,
              ...(social.apple.appBundleIdentifier === undefined
                ? {}
                : { appBundleIdentifier: social.apple.appBundleIdentifier }),
            },
          }),
    },
    logger: {
      level: "warn",
      log: (level) => {
        o.log(level, "auth");
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      // Only the address the API saw (set by the bridge); X-Forwarded-For and the like are
      // stripped, so nobody can dodge a rate limit by claiming another address.
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
      // Session cookies are HttpOnly and SameSite=Lax; over https they are Secure as well.
      useSecureCookies: o.baseUrl.startsWith("https://"),
    },
    user: {
      modelName: "app_user",
      fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
      // Step one goes to the current address, step two verifies the new one (P-80).
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, token }) => {
          await o.mailer.confirmEmailChange(
            user.email,
            newEmail,
            token,
            Math.round(p.verifyTokenMinutes / 60),
          );
        },
      },
      // Registration details (P-79). Accepted at sign-up only: Better Auth's update-user route
      // isn't exposed (bridge allow-list), and the acceptance time is always the server's.
      additionalFields: {
        birthDate: { type: "string", required: false, input: true, fieldName: "birth_date" },
        termsVersion: { type: "string", required: false, input: true, fieldName: "terms_version" },
        termsAcceptedAt: {
          type: "date",
          required: false,
          input: false,
          fieldName: "terms_accepted_at",
        },
      },
    },
    session: {
      modelName: "session",
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      expiresIn: p.sessionDays * DAY_SECONDS,
      updateAge: p.sessionRefreshHours * 60 * 60,
    },
    account: {
      modelName: "account",
      fields: {
        userId: "user_id",
        accountId: "account_id",
        providerId: "provider_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      // Google's and Apple's tokens are kept only encrypted with the secret.
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: enabledProviders(social),
        // Only for someone already signed in connecting a provider on purpose (an Apple private
        // relay address, say; P-80). Joining an account by itself still needs the same email.
        allowDifferentEmails: true,
        // An unconfirmed account is cleaned before linking (account.create hook below).
        requireLocalEmailVerified: false,
        // Name and picture follow the provider when it joins an account.
        updateUserInfoOnLink: true,
      },
    },
    verification: {
      modelName: "verification",
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
      // Email links are stored as hashes: a database leak reveals no usable link.
      storeIdentifier: "hashed",
    },
    rateLimit: {
      enabled: true,
      // Everything else under /v1/auth (sign-out, session lists): generous, per IP and path.
      window: GENERAL_LIMIT.windowSeconds,
      max: GENERAL_LIMIT.max,
      customRules: {
        // Where passwords and email links are tried: the policy's strict limit (ADR-0006).
        ...Object.fromEntries(
          CREDENTIAL_PATHS.map((path) => [path, { window: p.rateWindowSeconds, max: p.rateMax }]),
        ),
        // Reading one's own session is how the app knows it is signed in; never limited.
        "/get-session": false,
      },
      storage: "database",
      modelName: "rate_limit",
      fields: { lastRequest: "last_request" },
    },
    databaseHooks: {
      user: {
        create: {
          before: (user) => {
            checkRegistration(user);
            return Promise.resolve(
              user["termsVersion"] == null
                ? undefined
                : { data: { ...user, termsAcceptedAt: new Date() } },
            );
          },
        },
      },
      account: {
        create: {
          // Linking a Google or Apple identity to an account whose email was never confirmed:
          // whoever made it may not own the email, so nothing they set up survives (P-79).
          before: async (account, ctx) => {
            if (account.providerId === "credential") return;
            const adapter = ctx?.context.internalAdapter ?? (await auth.$context).internalAdapter;
            const user = await adapter.findUserById(account.userId);
            if (user === null || user.emailVerified) return;
            for (const existing of await adapter.findAccounts(user.id))
              await adapter.deleteAccount(existing.id);
            await adapter.deleteUserSessions(user.id);
            await adapter.updateUser(user.id, {
              birthDate: null,
              termsVersion: null,
              termsAcceptedAt: null,
            });
          },
        },
      },
      session: {
        update: {
          // Extending a session in use never takes it past sessionMaxDays from sign-in (P-78).
          // Better Auth sets the session being refreshed on the context before it updates it.
          before: (data, ctx) => {
            const createdAt = ctx?.context.session?.session.createdAt;
            if (createdAt === undefined || !(data.expiresAt instanceof Date))
              return Promise.resolve();
            const latest = sessionDeadline(new Date(createdAt), p.sessionMaxDays);
            return Promise.resolve(
              data.expiresAt > latest ? { data: { ...data, expiresAt: latest } } : undefined,
            );
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      password: { hash: hashPassword, verify: verifyPassword },
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: p.passwordMinLength,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: p.resetTokenMinutes * 60,
      sendResetPassword: async ({ user, token }) => {
        await o.mailer.resetPassword(user.email, token, p.resetTokenMinutes);
      },
      // Sign-up answers the same for a taken email; the owner of the address hears about it.
      onExistingUserSignUp: async ({ user }) => {
        await o.mailer.existingAccount(user.email);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: p.verifyTokenMinutes * 60,
      sendVerificationEmail: async ({ user, token }) => {
        await o.mailer.verifyEmail(
          user.email,
          user.name,
          token,
          Math.round(p.verifyTokenMinutes / 60),
        );
      },
    },
  });
  return auth;
}

export type Auth = ReturnType<typeof createAuth>;

/** When a session made at `createdAt` must end, however much it is used (P-78). */
export function sessionDeadline(createdAt: Date, maxDays: number): Date {
  return new Date(createdAt.getTime() + maxDays * DAY_SECONDS * 1000);
}
