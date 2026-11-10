import { describe, expect, it } from "vitest";
import { createCodeSealer } from "../src/pairing/sealed-code";

describe("sealing an invitation code (P-97)", () => {
  const sealer = createCodeSealer("a-secret-of-at-least-32-characters-long!!");
  const A = "0192f0a0-0000-7000-8000-00000000a001";
  const B = "0192f0a0-0000-7000-8000-00000000b001";

  it("opens only for the person it was sealed for, with the same secret", () => {
    const sealed = sealer.seal("ABCD2345", A);
    expect(sealed).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(sealed).not.toContain("ABCD2345");
    expect(sealer.open(sealed, A)).toBe("ABCD2345");
    expect(sealer.open(sealed, B)).toBeNull();
    expect(createCodeSealer("another-secret-of-at-least-32-chars!!").open(sealed, A)).toBeNull();
  });

  it("refuses anything tampered with or malformed", () => {
    const sealed = sealer.seal("ABCD2345", A);
    const [v, iv, body = ""] = sealed.split(".");
    const flipped = `${v ?? ""}.${iv ?? ""}.${body.slice(0, -2)}${body.endsWith("A") ? "B" : "A"}${body.slice(-1)}`;
    expect(sealer.open(flipped, A)).toBeNull();
    for (const junk of ["", "v1", "v2.a.b", "v1..", "v1.AAAA.AAAA"])
      expect(sealer.open(junk, A)).toBeNull();
  });

  it("never seals the same code the same way twice", () => {
    expect(sealer.seal("ABCD2345", A)).not.toBe(sealer.seal("ABCD2345", A));
  });
});
