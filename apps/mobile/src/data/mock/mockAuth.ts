import { AGE_CHECK_ZONE, isOldEnough, isRegistrationComplete } from "@garnet/contracts";
import { Temporal } from "temporal-polyfill";
import { maskEmail, normaliseEmail } from "@/domain/auth";
import { DEMO_PROVIDER_IDENTITIES, type DemoAuthState } from "@/data/fixtures/demoAuth";
import type { AuthRepository, AuthStatus } from "@/data/repositories/types";
import type { MockStore } from "./MockStore";

/**
 * Simulated back-off after repeated failed sign-ins (ADR-0006 proposes back-off with no
 * permanent lockout; the real thresholds are not decided). Prototype values only.
 */
export const DEMO_MAX_ATTEMPTS = 5;
export const DEMO_LOCK_SECONDS = 30;
/** Cooldown between verification resends in the prototype. */
export const DEMO_RESEND_COOLDOWN_SECONDS = 30;

function publicStatus(auth: DemoAuthState): AuthStatus {
  const s = auth.status;
  switch (s.kind) {
    case "signedOut":
    case "expired":
      return { kind: s.kind };
    case "verifying":
      return { kind: "verifying", maskedEmail: maskEmail(s.email), verified: s.verified };
    case "signedIn": {
      const account = auth.accounts.find((a) => a.userId === s.userId);
      const displayName = account?.displayName ?? "";
      if (account !== undefined && !isRegistrationComplete(account.birthDate, account.termsVersion))
        return { kind: "registering", displayName, birthDate: account.birthDate };
      return { kind: "signedIn", displayName };
    }
  }
}

/** Mock adapter for AuthRepository. Nothing leaves the device; `now` keeps tests deterministic. */
export function createMockAuth(store: MockStore, now: () => Temporal.Instant): AuthRepository {
  const setAuth = (mutate: (auth: DemoAuthState) => DemoAuthState) => {
    store.update((s) => ({ ...s, auth: mutate(s.auth) }));
  };
  const auth = () => store.read().auth;

  return {
    status: () => store.simulate(() => publicStatus(auth())),

    createAccount: ({ displayName, email, password, birthDate, termsVersion }) =>
      store.simulate(() => {
        const normal = normaliseEmail(email);
        if (auth().accounts.some((a) => a.email === normal)) {
          return { ok: false as const, reason: "may-already-exist" as const };
        }
        setAuth((a) => ({
          ...a,
          accounts: [
            ...a.accounts,
            {
              userId: `demo-user-${a.accounts.length + 1}`,
              displayName: displayName.trim(),
              email: normal,
              password,
              verified: false,
              providers: [],
              birthDate,
              termsVersion,
            },
          ],
          status: { kind: "verifying", email: normal, verified: false },
          lastSentAt: now().toString(),
        }));
        return { ok: true as const, maskedEmail: maskEmail(normal) };
      }),

    signIn: ({ email, password, keepSignedIn }) =>
      store.simulate(() => {
        const a = auth();
        if (a.lockedUntil !== null) {
          const remaining = Temporal.Instant.from(a.lockedUntil).since(now()).total("seconds");
          if (remaining > 0) {
            return {
              ok: false as const,
              reason: "rate-limited" as const,
              retryAfterSeconds: Math.ceil(remaining),
            };
          }
        }
        const account = a.accounts.find((x) => x.email === normaliseEmail(email));
        if (account?.password !== password) {
          const failed = a.failedAttempts + 1;
          const lock = failed >= DEMO_MAX_ATTEMPTS;
          setAuth((x) => ({
            ...x,
            failedAttempts: lock ? 0 : failed,
            lockedUntil: lock
              ? now().add({ seconds: DEMO_LOCK_SECONDS }).toString()
              : x.lockedUntil,
          }));
          return lock
            ? {
                ok: false as const,
                reason: "rate-limited" as const,
                retryAfterSeconds: DEMO_LOCK_SECONDS,
              }
            : { ok: false as const, reason: "mismatch" as const };
        }
        setAuth((x) => ({
          ...x,
          failedAttempts: 0,
          lockedUntil: null,
          status: account.verified
            ? { kind: "signedIn", userId: account.userId, keepSignedIn }
            : { kind: "verifying", email: account.email, verified: false },
        }));
        return { ok: true as const, needsVerification: !account.verified };
      }),

    resendVerification: () =>
      store.simulate(() => {
        setAuth((a) => ({ ...a, lastSentAt: now().toString(), nextVerificationLink: "valid" }));
        return { cooldownSeconds: DEMO_RESEND_COOLDOWN_SECONDS };
      }),

    openVerificationLink: () =>
      store.simulate(() => {
        const a = auth();
        if (a.status.kind !== "verifying")
          return { ok: false as const, reason: "expired" as const };
        if (a.nextVerificationLink === "expired")
          return { ok: false as const, reason: "expired" as const };
        const email = a.status.email;
        setAuth((x) => ({
          ...x,
          accounts: x.accounts.map((acc) =>
            acc.email === email ? { ...acc, verified: true } : acc,
          ),
          status: { kind: "verifying", email, verified: true },
        }));
        return { ok: true as const };
      }),

    finishVerification: () =>
      store.simulate(() => {
        setAuth((a) => {
          if (a.status.kind !== "verifying" || !a.status.verified) return a;
          const email = a.status.email;
          const account = a.accounts.find((acc) => acc.email === email);
          return account === undefined
            ? a
            : { ...a, status: { kind: "signedIn", userId: account.userId, keepSignedIn: false } };
        });
      }),

    cancelVerification: () =>
      store.simulate(() => {
        setAuth((a) => ({ ...a, status: { kind: "signedOut" } }));
      }),

    requestPasswordReset: () =>
      // Deliberately identical for every email (AUTH-05): no lookup, no branch, no timing hint.
      store.simulate(() => undefined),

    checkResetLink: (token) => store.simulate(() => auth().resetLinks[token] ?? "invalid"),

    resetPassword: (token, password) =>
      store.simulate(() => {
        const state = auth().resetLinks[token] ?? "invalid";
        if (state !== "valid") return { ok: false as const, reason: state };
        setAuth((a) => ({
          ...a,
          // The demo link belongs to the demo account; using it once marks it used.
          accounts: a.accounts.map((acc, i) => (i === 0 ? { ...acc, password } : acc)),
          resetLinks: { ...a.resetLinks, [token]: "used" },
          // A reset signs out every device (ADR-0006).
          status: { kind: "signedOut" },
        }));
        return { ok: true as const };
      }),

    signInMethods: () => store.simulate(() => ({ google: true, apple: true })),

    confirmEmailChange: () => store.simulate(() => ({ ok: true })),

    continueWith: (provider) =>
      store.simulate(() => {
        const identity = DEMO_PROVIDER_IDENTITIES[provider];
        const existing = auth().accounts.find((a) => a.email === identity.email);
        if (existing !== undefined) {
          // One account per person: the provider joins it. An unconfirmed account keeps
          // nothing someone else may have set up (its password), as on the server (P-79).
          setAuth((a) => ({
            ...a,
            accounts: a.accounts.map((acc) =>
              acc.userId !== existing.userId
                ? acc
                : {
                    ...acc,
                    verified: true,
                    password: acc.verified ? acc.password : "",
                    providers: [...new Set([...acc.providers, provider])],
                  },
            ),
            status: { kind: "signedIn", userId: existing.userId, keepSignedIn: true },
          }));
          return { ok: true as const };
        }
        const userId = `demo-user-${String(auth().accounts.length + 1)}`;
        setAuth((a) => ({
          ...a,
          accounts: [
            ...a.accounts,
            {
              userId,
              displayName: identity.name,
              email: identity.email,
              password: "",
              verified: true,
              providers: [provider],
              birthDate: null,
              termsVersion: null,
            },
          ],
          status: { kind: "signedIn", userId, keepSignedIn: true },
        }));
        return { ok: true as const };
      }),

    completeRegistration: ({ birthDate, termsVersion }) =>
      store.simulate(() => {
        const s = auth().status;
        if (s.kind !== "signedIn") throw new Error("Not signed in");
        const today = now().toZonedDateTimeISO(AGE_CHECK_ZONE).toPlainDate().toString();
        if (!isOldEnough(birthDate, today)) {
          // Too young (P-79): the new account goes, nothing is kept.
          setAuth((a) => ({
            ...a,
            accounts: a.accounts.filter((acc) => acc.userId !== s.userId),
            status: { kind: "signedOut" },
          }));
          return { ok: false as const, reason: "too-young" as const };
        }
        setAuth((a) => ({
          ...a,
          accounts: a.accounts.map((acc) =>
            acc.userId === s.userId ? { ...acc, birthDate, termsVersion } : acc,
          ),
        }));
        return { ok: true as const };
      }),

    unsentCount: () => store.simulate(() => auth().unsentCount),

    signOut: () =>
      store.simulate(() => {
        setAuth((a) => ({ ...a, status: { kind: "signedOut" } }));
      }),
  };
}
