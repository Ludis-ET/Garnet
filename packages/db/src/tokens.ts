import { createHash, randomBytes } from "node:crypto";

/**
 * Session tokens (ADR-0006): 32 random bytes, sent as base64url (43 characters). The server only
 * ever stores their SHA-256, so a database leak reveals no usable token. One definition, used by
 * whatever issues sessions and by the API's session guard.
 */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}
