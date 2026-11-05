import { hashPassword as scryptHash } from "better-auth/crypto";
import { describe, expect, it } from "vitest";
import { ARGON2ID, hashPassword, verifyPassword } from "../src/auth/password";

const PASSWORD = "correct horse battery staple";

describe("Argon2id password hashes (P-78)", () => {
  it("writes a PHC string with OWASP's baseline parameters and a fresh salt each time", async () => {
    const a = await hashPassword(PASSWORD);
    const b = await hashPassword(PASSWORD);
    expect(a).toMatch(
      new RegExp(
        `^\\$argon2id\\$v=19\\$m=${String(ARGON2ID.memory)},t=${String(ARGON2ID.passes)},p=${String(ARGON2ID.parallelism)}\\$[A-Za-z0-9+/]{22}\\$[A-Za-z0-9+/]{43}$`,
      ),
    );
    expect(a).not.toBe(b);
    expect(a).not.toContain(PASSWORD);
  });

  it("verifies the right password and nothing else", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword({ hash, password: PASSWORD })).toBe(true);
    for (const wrong of ["", "correct horse battery stapl", "Correct horse battery staple"])
      expect(await verifyPassword({ hash, password: wrong })).toBe(false);
  });

  it("matches the same password however its characters were composed (NFKC)", async () => {
    const composed = "café au lait every morning"; // é as one character
    const decomposed = "café au lait every morning"; // e + combining accent
    const hash = await hashPassword(composed);
    expect(await verifyPassword({ hash, password: decomposed })).toBe(true);
  });

  it("still verifies accounts made before P-78 (Better Auth's scrypt)", async () => {
    const legacy = await scryptHash(PASSWORD);
    expect(await verifyPassword({ hash: legacy, password: PASSWORD })).toBe(true);
    expect(await verifyPassword({ hash: legacy, password: "something else entirely" })).toBe(false);
  });

  it("treats anything malformed or tampered with as a mismatch, without stalling", async () => {
    const hash = await hashPassword(PASSWORD);
    const [, , , , salt = "", key = ""] = hash.split("$");
    const tampered = [
      "",
      "plain text",
      hash.replace("argon2id", "argon2i"),
      hash.replace("v=19", "v=16"),
      // Parameters an attacker with database access might plant to exhaust memory or time.
      `$argon2id$v=19$m=4194304,t=2,p=1$${salt}$${key}`,
      `$argon2id$v=19$m=19456,t=1000,p=1$${salt}$${key}`,
      `$argon2id$v=19$m=19456,t=2,p=64$${salt}$${key}`,
      // A truncated hash or salt.
      `$argon2id$v=19$m=19456,t=2,p=1$${salt}$${key.slice(0, 8)}`,
      `$argon2id$v=19$m=19456,t=2,p=1$AAAA$${key}`,
    ];
    const started = performance.now();
    for (const t of tampered)
      expect(await verifyPassword({ hash: t, password: PASSWORD })).toBe(false);
    expect(performance.now() - started).toBeLessThan(5_000);
  });
});
