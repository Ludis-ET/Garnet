import { verifyPassword as verifyScrypt } from "better-auth/crypto";
import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Password hashing (P-78, ADR-0006): Argon2id from Node's own crypto (Node 24.7 or later, no
 * native add-on), with OWASP's baseline parameters (19 MiB, 2 passes, 1 lane). Retune them on
 * the real host when hosting is chosen (U-07); stored hashes carry their own parameters, so old
 * ones keep verifying after a change.
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
  return new Promise((resolve, reject) => {
    argon2("argon2id", { message: password.normalize("NFKC"), nonce, ...p }, (error, key) => {
      if (error === null) resolve(key);
      else reject(error);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
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
