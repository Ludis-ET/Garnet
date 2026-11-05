import * as SecureStore from "expo-secure-store";

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
} as const;
export type LocalKey = keyof typeof KEYS;

export function readLocal(key: LocalKey): string | null {
  try {
    return SecureStore.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

export function writeLocal(key: LocalKey, value: string): void {
  try {
    SecureStore.setItem(KEYS[key], value);
  } catch {
    // The phone keeps working; the value is simply not remembered.
  }
}

export async function clearLocal(...keys: LocalKey[]): Promise<void> {
  for (const key of keys) {
    try {
      await SecureStore.deleteItemAsync(KEYS[key]);
    } catch {
      // Nothing to clear.
    }
  }
}
