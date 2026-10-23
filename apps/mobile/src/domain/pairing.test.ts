import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import {
  formatInviteCode,
  generateInviteCode,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_POLICY_P18,
  inviteExpiresAt,
  inviteShareMessage,
  inviteTimeLeft,
  isInviteCodeComplete,
  isInviteExpired,
  normaliseInviteCode,
  spokenInviteCode,
} from "./pairing";

const policy = INVITE_POLICY_P18; // P-18 (proposed): 24 hours, single use

describe("invitation codes (P-50 prototype format)", () => {
  it("normalises what people type or paste", () => {
    expect(normaliseInviteCode(" k7qm-4xpv ")).toBe("K7QM4XPV");
    expect(normaliseInviteCode("K7QM 4XPV EXTRA")).toBe("K7QM4XPV");
    // Look-alikes never appear in codes, so they are dropped rather than guessed.
    expect(normaliseInviteCode("O0I1L")).toBe("");
    expect(isInviteCodeComplete("k7qm-4xpv")).toBe(true);
    expect(isInviteCodeComplete("K7QM")).toBe(false);
  });

  it("formats and speaks codes in two groups", () => {
    expect(formatInviteCode("K7QM4XPV")).toBe("K7QM-4XPV");
    expect(formatInviteCode("K7Q")).toBe("K7Q");
    expect(spokenInviteCode("K7QM4XPV")).toBe("K 7 Q M, 4 X P V");
  });

  it("generates only complete codes from the alphabet, even at the edges of random()", () => {
    for (const r of [0, 0.5, 0.999999, 1]) {
      const code = generateInviteCode(() => r);
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      expect(isInviteCodeComplete(code)).toBe(true);
    }
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 8, maxLength: 8 }),
        (rs) => {
          let i = 0;
          const code = generateInviteCode(() => rs[i++] ?? 0);
          expect(Array.from(code).every((c) => INVITE_ALPHABET.includes(c))).toBe(true);
          expect(normaliseInviteCode(formatInviteCode(code))).toBe(code);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("normalising is idempotent and never longer than a code (property)", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (s) => {
        const once = normaliseInviteCode(s);
        expect(normaliseInviteCode(once)).toBe(once);
        expect(once.length).toBeLessThanOrEqual(INVITE_CODE_LENGTH);
      }),
      { numRuns: 300 },
    );
  });
});

describe("invitation lifetime (P-18, proposed)", () => {
  const created = Temporal.Instant.from("2026-10-24T09:30:00Z");

  it("expires exactly 24 hours later", () => {
    const expires = inviteExpiresAt(created, policy);
    expect(expires.toString()).toBe("2026-10-25T09:30:00Z");
    expect(isInviteExpired(expires.subtract({ seconds: 1 }), expires)).toBe(false);
    expect(isInviteExpired(expires, expires)).toBe(true);
  });

  it("stays 24 real hours across the London clock change (25-hour local day)", () => {
    // London leaves BST at 02:00 local on 2026-10-25; the local clock reads 08:30, not 09:30.
    const expires = inviteExpiresAt(created, policy);
    expect(expires.since(created).total("hours")).toBe(24);
    expect(expires.toZonedDateTimeISO("Europe/London").toPlainTime().toString()).toBe("09:30:00");
    expect(created.toZonedDateTimeISO("Europe/London").toPlainTime().toString()).toBe("10:30:00");
    expect(expires.toZonedDateTimeISO("Africa/Addis_Ababa").toPlainTime().toString()).toBe(
      "12:30:00",
    );
  });

  it("shows the time left, rounded down, and nothing once expired", () => {
    const expires = inviteExpiresAt(created, policy);
    expect(inviteTimeLeft(created, expires)).toBe("24 h 0 m");
    expect(inviteTimeLeft(created.add({ seconds: 30 }), expires)).toBe("23 h 59 m");
    expect(inviteTimeLeft(expires.subtract({ minutes: 59 }), expires)).toBe("59 m");
    expect(inviteTimeLeft(expires.subtract({ seconds: 20 }), expires)).toBe("less than a minute");
    expect(inviteTimeLeft(expires, expires)).toBeNull();
  });

  it("never promises more time than is left (property)", () => {
    const expires = inviteExpiresAt(created, policy);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 26 * 3600 }), (s) => {
        const now = created.add({ seconds: s });
        const label = inviteTimeLeft(now, expires);
        if (isInviteExpired(now, expires)) expect(label).toBeNull();
        else {
          expect(label).not.toBeNull();
          const match = /^(?:(\d+) h )?(\d+) m$/.exec(label ?? "");
          if (match !== null) {
            const shown = Number(match[1] ?? 0) * 60 + Number(match[2]);
            expect(shown).toBeLessThanOrEqual(expires.since(now).total("minutes"));
          }
        }
      }),
      { numRuns: 400 },
    );
  });

  it("builds a share message with the code, the policy and no link", () => {
    const message = inviteShareMessage("Selam", "K7QM4XPV", policy);
    expect(message).toContain("K7QM-4XPV");
    expect(message).toContain("24 hours");
    expect(message).not.toMatch(/https?:|@/);
  });
});
