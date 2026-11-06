/**
 * Client-generated UUID generator (P-04, ADR-0003).
 */
import * as Crypto from "expo-crypto";

export function generateUuid(): string {
  try {
    const id = Crypto.randomUUID();
    if (typeof id === "string" && id.length > 0) return id;
  } catch {
    // Native module unavailable in test environments
  }

  try {
    if (typeof globalThis.crypto !== "undefined") {
      const id = globalThis.crypto.randomUUID();
      if (typeof id === "string" && id.length > 0) return id;
    }
  } catch {
    // Web crypto unavailable
  }

  // Standard RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
