import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Seals an invitation code for its inviter (P-97): AES-256-GCM with a key derived from the API's
 * secret, bound to the inviter's user id as associated data, so a sealed code copied to another
 * person's row can't be opened for them. Format: "v1.<iv>.<ciphertext+tag>" in base64url.
 */
export interface CodeSealer {
  seal(code: string, userId: string): string;
  /** The code, or null for anything that doesn't open (wrong person, tampered, other key). */
  open(sealed: string, userId: string): string | null;
}

export function createCodeSealer(secret: string): CodeSealer {
  const key = Buffer.from(hkdfSync("sha256", secret, "garnet", "garnet invitation code v1", 32));
  return {
    seal(code, userId) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(userId, "utf8"));
      const body = Buffer.concat([
        cipher.update(code, "utf8"),
        cipher.final(),
        cipher.getAuthTag(),
      ]);
      return `v1.${iv.toString("base64url")}.${body.toString("base64url")}`;
    },
    open(sealed, userId) {
      const [version, ivText, bodyText] = sealed.split(".");
      if (version !== "v1" || ivText === undefined || bodyText === undefined) return null;
      try {
        const iv = Buffer.from(ivText, "base64url");
        const body = Buffer.from(bodyText, "base64url");
        if (iv.length !== 12 || body.length < 17) return null;
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAAD(Buffer.from(userId, "utf8"));
        decipher.setAuthTag(body.subarray(body.length - 16));
        return Buffer.concat([
          decipher.update(body.subarray(0, body.length - 16)),
          decipher.final(),
        ]).toString("utf8");
      } catch {
        return null;
      }
    },
  };
}

/** Nest injection token for the sealer (app.ts). */
export const CODE_SEALER = Symbol("CODE_SEALER");
