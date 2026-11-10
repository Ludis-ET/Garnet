import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Small pieces of account and pairing state the phone keeps for itself (B1), in the secure
 * keystore: the email waiting for verification, whether it was just verified, whether this
 * phone had a session (so a lost one reads as "signed out for privacy", AUTH-07), the
 * invitation code this person made (the server keeps only its hash) and the code under review.
 */
const KEYS = {
  pendingEmail: "garnet.pending-email",
  justVerified: "garnet.just-verified",
  hadSession: "garnet.had-session",
  inviteCode: "garnet.invite-code",
  reviewingCode: "garnet.reviewing-code",
  handoffVerifier: "garnet.handoff-verifier",
} as const;
export type LocalKey = keyof typeof KEYS;

export function readLocal(key: LocalKey): string | null {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      return localStorage.getItem(KEYS[key]);
    }
    return SecureStore.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

export function writeLocal(key: LocalKey, value: string): void {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(KEYS[key], value);
      return;
    }
    SecureStore.setItem(KEYS[key], value);
  } catch {
    // The phone keeps working; the value is simply not remembered.
  }
}

export async function clearLocal(...keys: LocalKey[]): Promise<void> {
  for (const key of keys) {
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.removeItem(KEYS[key]);
        continue;
      }
      await SecureStore.deleteItemAsync(KEYS[key]);
    } catch {
      // Nothing to clear.
    }
  }
}

/**
 * Completely clears all local auth and session state: our local tokens/keys
 * as well as Better-Auth session tokens/cookies in SecureStore or localStorage.
 */
export async function clearAllAuthSessions(): Promise<void> {
  await clearLocal(
    "hadSession",
    "pendingEmail",
    "justVerified",
    "inviteCode",
    "reviewingCode",
    "handoffVerifier",
  );
  await clearSessionCookie();
}

/** Where Better Auth's Expo client keeps the session (storagePrefix "garnet", authClient.ts). */
const SESSION_KEYS = [
  "garnet_cookie",
  "garnet_session_data",
  "better-auth_cookie",
  "better-auth_session_data",
] as const;

/**
 * Forgets only the session cookie, keeping "this phone had a session", so the gate shows
 * "signed out for privacy" (AUTH-07) rather than the welcome page (production-fix-plan A5).
 */
export async function clearSessionCookie(): Promise<void> {
  const isWeb = Platform.OS === "web";
  for (const k of SESSION_KEYS) {
    try {
      if (isWeb && typeof localStorage !== "undefined") {
        localStorage.removeItem(k);
      } else {
        await SecureStore.deleteItemAsync(k);
      }
    } catch {
      // Nothing to clear.
    }
  }
}
