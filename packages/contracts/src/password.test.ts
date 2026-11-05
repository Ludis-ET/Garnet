import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isGuessablePassword, passwordContext } from "./password";

/** Long passphrases a person might really choose. */
const GOOD = [
  "correct horse battery staple",
  "our tuesday call at nine",
  "Addis to London is far 2026",
  "ቡና እና ሻይ በጠዋት", // Amharic: coffee and tea in the morning
  "selam loves noah forever",
];

describe("guessable passwords (P-78, NIST SP 800-63B-4)", () => {
  it.each([
    ["one character repeated", "aaaaaaaaaaaaaaaa"],
    ["a word repeated", "passwordpassword"],
    ["a short piece repeated", "abcabcabcabcabcab"],
    ["a run of digits, wrapping", "123456789012345"],
    ["a run backwards", "987654321098765"],
    ["the alphabet", "abcdefghijklmnop"],
    ["a keyboard row", "qwertyuiopasdfgh"],
    ["the service's name dressed up", "Garnet2026!!Garnet"],
    ["case doesn't hide a repeat", "PassWordpassword"],
    ["a common word padded with a run", "password12345678"],
    ["a common word padded with a repeat", "iloveyou!!!!0000"],
  ])("refuses %s", (_, password) => {
    expect(isGuessablePassword(password)).toBe(true);
  });

  it("refuses a password that is mostly the person's name or email", () => {
    const context = passwordContext("Selam", "selam.tesfaye@example.test");
    expect(isGuessablePassword("selam.tesfaye1234", context)).toBe(true);
    expect(isGuessablePassword("tesfaye.s1234567!", context)).toBe(true);
    expect(isGuessablePassword("Selam!Selam!2026", context)).toBe(true);
    expect(isGuessablePassword("selam loves noah forever", context)).toBe(false);
  });

  it.each(GOOD)("accepts %s", (password) => {
    expect(isGuessablePassword(password, passwordContext("Noah", "noah@example.test"))).toBe(false);
  });

  it("keeps a passphrase that only contains a short run or a common word", () => {
    expect(isGuessablePassword("lantern 1234 copper river")).toBe(false);
    expect(isGuessablePassword("sunshine over addis ababa")).toBe(false);
  });

  it("leaves empty input to the length rule", () => {
    expect(isGuessablePassword("")).toBe(false);
  });

  it("property: any piece repeated to 15 or more characters is refused", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 7, unit: "grapheme-ascii" }),
        fc.integer({ min: 15, max: 64 }),
        (piece, length) => {
          const chars = Array.from(piece);
          const password = Array.from({ length }, (_, i) => chars[i % chars.length]).join("");
          expect(isGuessablePassword(password)).toBe(true);
        },
      ),
    );
  });

  it("property: any digit run of 15 or more is refused, whichever way and wherever it starts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 15, max: 40 }),
        fc.boolean(),
        (start, length, up) => {
          const password = Array.from({ length }, (_, i) =>
            String((((start + (up ? i : -i)) % 10) + 10) % 10),
          ).join("");
          expect(isGuessablePassword(password)).toBe(true);
        },
      ),
    );
  });

  it("property: random passwords of 15+ distinct-enough characters are accepted", () => {
    // Four different words from a list, joined: the usual passphrase shape.
    const word = fc.constantFrom(
      "river",
      "lantern",
      "copper",
      "meadow",
      "violet",
      "harbour",
      "pepper",
      "orbit",
      "maple",
      "sunday",
    );
    fc.assert(
      fc.property(fc.uniqueArray(word, { minLength: 4, maxLength: 6 }), (words) => {
        expect(isGuessablePassword(words.join(" "))).toBe(false);
      }),
    );
  });
});
