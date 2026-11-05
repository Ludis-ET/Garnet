import { createHash } from "node:crypto";

/**
 * Invitation codes (P-18) are stored only as their SHA-256, so a database leak reveals no usable
 * code. One definition, used by the API when it makes, checks and spends codes.
 */
export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}
