/**
 * Demo account state for the welcome and account flows (AUTH-01 to AUTH-08). Fictional and
 * local only: no account is created and no email is sent (Phase 2 scope rule).
 *
 * Prototype only: the password is kept as plain demo data. A real server stores only argon2id
 * hashes and opaque session-token hashes (P-11, P-25; ADR-0006, proposed).
 */
export interface DemoAccount {
  userId: string;
  displayName: string;
  email: string;
  /** Empty for an account made with Google or Apple only. */
  password: string;
  verified: boolean;
  /** Google and Apple ways in joined to this account (P-79). */
  providers: ("google" | "apple")[];
  /** Registration details (P-79); null until given. */
  birthDate: string | null;
  /** When the terms were accepted, for Settings. */
  termsAcceptedAt?: string;
  termsVersion: string | null;
}

/**
 * What the simulated Google and Apple sign-ins return. Google's email is the demo account's,
 * so it joins that account (no second account); Apple's is a private relay address, so it
 * makes a new account that still needs its birthday and the terms.
 */
export const DEMO_PROVIDER_IDENTITIES = {
  google: { email: "selam@example.test", name: "Selam" },
  apple: { email: "x7k2m9qp@privaterelay.appleid.com", name: "" },
} as const;

export type DemoAuthStatus =
  | { kind: "signedOut" }
  | { kind: "verifying"; email: string; verified: boolean }
  | { kind: "signedIn"; userId: string; keepSignedIn: boolean }
  | { kind: "expired" };

export type ResetLinkState = "valid" | "expired" | "used";

export interface DemoAuthState {
  accounts: DemoAccount[];
  status: DemoAuthStatus;
  /** Consecutive failed sign-ins and the simulated back-off (ADR-0006: no permanent lockout). */
  failedAttempts: number;
  lockedUntil: string | null;
  /** When the last verification email was (pretend-)sent, for the resend cooldown. */
  lastSentAt: string | null;
  /** What the next opened verification link does (prototype panel). */
  nextVerificationLink: "valid" | "expired";
  /** Reset links by token; anything else is "invalid". */
  resetLinks: Record<string, ResetLinkState>;
  /** Items waiting to send, shown in the sign-out dialog (AUTH-08). */
  unsentCount: number;
}

/** Demo sign-in: selam@example.test / garnet together. */
export const DEMO_EMAIL = "selam@example.test";
export const DEMO_PASSWORD = "garnet together";

/** Demo reset-link tokens, one per state (AUTH-06). */
export const DEMO_RESET_TOKENS = {
  valid: "demo-reset-valid",
  expired: "demo-reset-expired",
  used: "demo-reset-used",
  invalid: "demo-reset-unknown",
} as const;

export function createDemoAuth(meId: string, termsVersion: string): DemoAuthState {
  return {
    accounts: [
      {
        userId: meId,
        displayName: "Selam",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        verified: true,
        providers: [],
        birthDate: "1998-03-12",
        termsVersion,
      },
    ],
    status: { kind: "signedOut" },
    failedAttempts: 0,
    lockedUntil: null,
    lastSentAt: null,
    nextVerificationLink: "valid",
    resetLinks: {
      [DEMO_RESET_TOKENS.valid]: "valid",
      [DEMO_RESET_TOKENS.expired]: "expired",
      [DEMO_RESET_TOKENS.used]: "used",
    },
    unsentCount: 0,
  };
}
