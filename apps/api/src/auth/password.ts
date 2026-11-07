import { hashPassword as scryptHash, verifyPassword as verifyScrypt } from "better-auth/crypto";
import * as crypto from "node:crypto";

const { randomBytes, timingSafeEqual } = crypto;

type Argon2Fn = (
  type: "argon2id",
  options: {
    message: string;
    nonce: Buffer;
    memory: number;
    passes: number;
    parallelism: number;
    tagLength: number;
  },
  callback: (error: Error | null, key: Buffer) => void,
) => void;

/** Node 24.7+ exports built-in argon2 on node:crypto; on Node 20/22 it is undefined (U-07). */
const nodeArgon2: Argon2Fn | undefined = (crypto as unknown as { argon2?: Argon2Fn }).argon2;

/**
 * Password hashing (P-78, ADR-0006): Argon2id from Node's own crypto (Node 24.7 or later, no
 * native add-on), with OWASP's baseline parameters (19 MiB, 2 passes, 1 lane). When hosting on
 * Node < 24.7 (U-07), falls back safely to Better Auth's standard scrypt algorithm.
 *
 * Stored as a PHC string: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash> (base64, no padding).
 * Passwords are NFKC-normalised first (NIST SP 800-63B-4), so the same password typed on two
 * keyboards matches.
 */
export const ARGON2ID = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 } as const;
const SALT_BYTES = 16;

/** Ceilings for parameters read back from the database: a tampered row can't stall the API. */
const LIMITS = { memory: 262_144, passes: 10, parallelism: 8, tagLength: 64 } as const;

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

interface Params {
  memory: number;
  passes: number;
  parallelism: number;
  tagLength: number;
}

const b64 = (b: Buffer) => b.toString("base64").replace(/=+$/, "");

function derive(password: string, nonce: Buffer, p: Params): Promise<Buffer> {
  if (!nodeArgon2) {
    return Promise.reject(new Error("Node built-in argon2 is not available on this Node runtime"));
  }
  return new Promise((resolve, reject) => {
    nodeArgon2("argon2id", { message: password.normalize("NFKC"), nonce, ...p }, (error, key) => {
      if (error === null) resolve(key);
      else reject(error);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (!nodeArgon2) {
    // Hosting compatibility (Node < 24.7, U-07): use Better Auth's standard scrypt hash
    return scryptHash(password);
  }
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, ARGON2ID);
  const { memory: m, passes: t, parallelism: p } = ARGON2ID;
  return `$argon2id$v=19$m=${String(m)},t=${String(t)},p=${String(p)}$${b64(salt)}$${b64(key)}`;
}

/**
 * Checks a password against a stored hash in constant time. Hashes from before P-78 (Better
 * Auth's scrypt, "salt:key") still verify, so local accounts made earlier keep working; anything
 * else, or anything malformed, is simply a mismatch.
 */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const m = PHC.exec(hash);
  if (m === null)
    return /^[0-9a-f]+:[0-9a-f]+$/.test(hash) ? verifyScrypt({ hash, password }) : false;
  if (!nodeArgon2) return false;
  const params: Params = {
    memory: Number(m[1]),
    passes: Number(m[2]),
    parallelism: Number(m[3]),
    tagLength: 0,
  };
  const salt = Buffer.from(m[4] ?? "", "base64");
  const expected = Buffer.from(m[5] ?? "", "base64");
  params.tagLength = expected.length;
  if (
    params.memory > LIMITS.memory ||
    params.passes > LIMITS.passes ||
    params.parallelism > LIMITS.parallelism ||
    params.tagLength > LIMITS.tagLength ||
    params.tagLength < 16 ||
    salt.length < 8
  )
    return false;
  const actual = await derive(password, salt, params).catch(() => null);
  return actual !== null && timingSafeEqual(actual, expected);
}
