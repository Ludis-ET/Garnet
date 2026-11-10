import {
  completeRegistrationResultSchema,
  isRegistrationComplete,
  signInMethodsSchema,
} from "@garnet/contracts";
import type { AuthRepository, AuthStatus } from "@/data/repositories/types";
import { maskEmail, normaliseEmail } from "@/domain/auth";
import type { GarnetAuthClient } from "./authClient";
import type { ApiClient } from "./client";
import { clearAllAuthSessions, clearLocal, readLocal, writeLocal } from "./localState";
import { continueWithProvider } from "./social";

/** Between resends of the verification email; the API also rate limits (ADR-0006). */
const RESEND_COOLDOWN_SECONDS = 60;
/** Shown when the API says "too many tries" without a time (its window is a server setting). */
const RATE_LIMIT_FALLBACK_SECONDS = 60;

/** The app's deep link that the reset email opens (ResetPasswordScreen reads ?token=). */
const RESET_LINK = "garnet://reset-password";

/**
 * AuthRepository over the real API, through Better Auth's client (B1, P-77). Screens behave as
 * they did on mock data: neutral answers that never reveal whether an email has an account,
 * "verifying" until the email link is opened, the "verified" moment before Continue, and
 * "signed out for privacy" when a session this phone had is gone (AUTH-07). Google and Apple
 * (P-79) sign in through ./social.ts; registration details go to the API.
 */
export function createHttpAuth(
  client: GarnetAuthClient,
  baseUrl: string,
  api: ApiClient,
): AuthRepository {
  const pending = () => readLocal("pendingEmail");

  async function session(): Promise<{
    name: string;
    verified: boolean;
    registered: boolean;
    birthDate: string | null;
  } | null> {
    // No connection, or the server failing, is not "signed out" (production-fix-plan A3): it
    // throws, the gate shows "try again", and nothing about the session is forgotten.
    const { data, error } = await client.getSession();
    if (error !== null) {
      if (error.status === 401 || error.status === 403) return null;
      throw new Error("session-check-failed");
    }
    if (data === null) return null;
    // Better Auth's additional fields (P-79), not in its client's types.
    const user = data.user as typeof data.user & { birthDate?: unknown; termsVersion?: unknown };
    return {
      name: data.user.name,
      verified: data.user.emailVerified,
      registered: isRegistrationComplete(user.birthDate, user.termsVersion),
      birthDate: typeof user.birthDate === "string" ? user.birthDate : null,
    };
  }

  return {
    status: async (): Promise<AuthStatus> => {
      const email = pending();
      const justVerified = readLocal("justVerified") === "yes";
      if (email !== null || justVerified)
        return {
          kind: "verifying",
          maskedEmail: email === null ? "your email" : maskEmail(email),
          verified: justVerified,
        };
      const s = await session();
      if (s?.verified) {
        writeLocal("hadSession", "yes");
        if (!s.registered)
          return { kind: "registering", displayName: s.name, birthDate: s.birthDate };
        return { kind: "signedIn", displayName: s.name };
      }
      // Reading the status changes nothing (A4): "signed out for privacy" stays until the person
      // leaves that screen, which clears it (SessionExpiredScreen).
      if (readLocal("hadSession") === "yes") return { kind: "expired" };
      return { kind: "signedOut" };
    },

    createAccount: async ({ displayName, email, password, birthDate, termsVersion }) => {
      const normal = normaliseEmail(email);
      const { error } = await client.signUp.email({
        name: displayName.trim(),
        email: normal,
        password,
        // Registration details (P-79): the API checks the age and the terms version again.
        ...{ birthDate, termsVersion },
      });
      // Too many tries: the screen shows its calm "try again" error.
      if (error?.status === 429) throw new Error("rate-limited");
      if (
        error?.status === 422 ||
        error?.status === 409 ||
        error?.code === "USER_ALREADY_EXISTS" ||
        error?.message?.toLowerCase().includes("exist")
      ) {
        return { ok: false, reason: "may-already-exist" };
      }
      if (error !== null) {
        const anyErr = error as {
          status?: number;
          message?: string;
          body?: { issues?: { path?: string[]; code?: string }[] };
          issues?: { path?: string[]; code?: string }[];
        };
        const issues = anyErr.issues ?? anyErr.body?.issues;
        if (Array.isArray(issues) && issues.length > 0) {
          const first = issues[0];
          if (first?.code === "guessable") {
            throw new Error("Password is too easy to guess. Choose a stronger password.");
          }
          if (first?.code === "too_young") {
            throw new Error("You must be at least 16 to use Garnet.");
          }
          if (first?.code === "invalid_date") {
            throw new Error("Please enter a valid birthday.");
          }
        }
        if (
          error.status === 400 &&
          (error.message?.includes("guessable") || error.message?.includes("password"))
        ) {
          throw new Error("Password is too easy to guess. Choose a stronger password.");
        }
        throw new Error(error.message ?? `Sign up failed (${error.status})`);
      }
      writeLocal("pendingEmail", normal);
      await clearLocal("justVerified");
      return { ok: true, maskedEmail: maskEmail(normal) };
    },

    signIn: async ({ email, password, keepSignedIn }) => {
      const normal = normaliseEmail(email);
      const { error } = await client.signIn.email({
        email: normal,
        password,
        rememberMe: keepSignedIn,
      });
      if (error === null) {
        await clearLocal("pendingEmail", "justVerified");
        writeLocal("hadSession", "yes");
        return { ok: true, needsVerification: false };
      }
      if (error.status === 403) {
        // Right password, email not confirmed yet: the API has just sent a fresh link.
        writeLocal("pendingEmail", normal);
        await clearLocal("justVerified");
        return { ok: true, needsVerification: true };
      }
      if (error.status === 429)
        return {
          ok: false,
          reason: "rate-limited",
          retryAfterSeconds: RATE_LIMIT_FALLBACK_SECONDS,
        };
      return { ok: false, reason: "mismatch" };
    },

    resendVerification: async () => {
      const email = pending();
      if (email !== null) await client.sendVerificationEmail({ email });
      return { cooldownSeconds: RESEND_COOLDOWN_SECONDS };
    },

    openVerificationLink: async (token) => {
      if (token === undefined || token === "") return { ok: false, reason: "expired" };
      const { error } = await client.verifyEmail({ query: { token } });
      if (error !== null) return { ok: false, reason: "expired" };
      // Signed in by the link (autoSignInAfterVerification); show "verified" before Continue.
      writeLocal("justVerified", "yes");
      writeLocal("hadSession", "yes");
      return { ok: true };
    },

    finishVerification: async () => {
      await clearLocal("pendingEmail", "justVerified");
    },

    cancelVerification: async () => {
      try {
        await client.signOut();
      } catch {
        // Continue clearing even if server sign out fails
      }
      await clearAllAuthSessions();
    },

    requestPasswordReset: async (email) => {
      // Always the same, whether or not the account exists (AUTH-05): errors are not shown.
      await client.requestPasswordReset({ email: normaliseEmail(email), redirectTo: RESET_LINK });
    },

    // The API checks the link when it is used; a link that arrives here is shown the form.
    checkResetLink: (token) => Promise.resolve(token.trim() === "" ? "invalid" : "valid"),

    resetPassword: async (token, password) => {
      const { error } = await client.resetPassword({ newPassword: password, token });
      if (error !== null) return { ok: false, reason: "invalid" };
      // A reset signs out every device (ADR-0006), this one included.
      await clearLocal("hadSession");
      return { ok: true };
    },

    confirmEmailChange: async (token) => {
      const { error } = await client.verifyEmail({ query: { token } });
      return { ok: error === null };
    },

    signInMethods: async () => {
      try {
        const m = await api.get("/v1/sign-in-methods", signInMethodsSchema);
        return { google: m.google, apple: m.apple };
      } catch {
        return { google: true, apple: false };
      }
    },

    continueWith: async (provider) => {
      const result = await continueWithProvider(client, baseUrl, provider);
      if (result.ok) {
        await clearLocal("pendingEmail", "justVerified");
        writeLocal("hadSession", "yes");
      }
      return result;
    },

    completeRegistration: async (input) => {
      const result = await api.post("/v1/me/registration", completeRegistrationResultSchema, input);
      // Too young: the server removed the new account; this phone forgets it too.
      if (!result.ok) await clearAllAuthSessions();
      return result;
    },

    // Nothing waits to send in B1: sync arrives with B3.
    unsentCount: () => Promise.resolve(0),

    signOut: async () => {
      try {
        await client.signOut();
      } catch {
        // Continue clearing even if server throws or returns 401
      }
      await clearAllAuthSessions();
    },
  };
}
