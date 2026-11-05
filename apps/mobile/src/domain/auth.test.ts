import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import {
  ageCheckToday,
  birthDateError,
  CREATE_ACCOUNT_STEPS,
  fieldErrorMessage,
  firstStepWithErrors,
  hasErrors,
  isEmailShaped,
  maskEmail,
  passwordChecks,
  passwordError,
  PASSWORD_POLICY_P78,
  signInErrors,
  stepErrors,
  validateCreateAccount,
  validateNewPassword,
  type CreateAccountForm,
  type PasswordPolicy,
} from "./auth";

const policy = PASSWORD_POLICY_P78; // P-78 (owner direction): min 15

describe("password policy (P-78 values: assumed by these tests)", () => {
  it("requires the minimum length and no composition rules", () => {
    expect(passwordError("", policy)).toBe("required");
    expect(passwordError("correct horse b", policy)).toBeNull(); // 15
    expect(passwordError("correct horse", policy)).toBe("password-short"); // 13
    expect(passwordError("all lower case words", policy)).toBeNull();
    expect(passwordError("x".repeat(64) + "y".repeat(65), policy)).toBe("password-long");
  });

  it("counts characters, not UTF-16 units (emoji and other scripts count once)", () => {
    expect(passwordError("💜🌍☕🌙⭐🎵📮🌻🧡🐢🍋🎈🪐🌊🍀", policy)).toBeNull(); // 15 emoji
    expect(passwordError("💜🌍☕🌙⭐🎵📮🌻🧡🐢🍋🎈🪐🌊", policy)).toBe("password-short");
    expect(passwordError("ቡና እና ሻይ በጠዋት ከአንቺ ጋር", policy)).toBeNull();
  });

  it("refuses easy-to-guess passwords at any length (the API's own check)", () => {
    expect(passwordError("a".repeat(20), policy)).toBe("password-guessable");
    expect(passwordError("💜".repeat(15), policy)).toBe("password-guessable");
    expect(passwordError("123456789012345", policy)).toBe("password-guessable");
    expect(passwordError("passwordpassword", policy)).toBe("password-guessable");
    expect(passwordError("selam.tesfaye1234", policy, ["Selam", "selam.tesfaye"])).toBe(
      "password-guessable",
    );
    expect(passwordError("selam loves noah forever", policy, ["Selam"])).toBeNull();
  });

  it("is driven entirely by the policy passed in", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), fc.string({ maxLength: 60 }), (min, pw) => {
        const p: PasswordPolicy = { minLength: min, maxLength: 64 };
        const n = Array.from(pw).length;
        const result = passwordError(pw, p);
        if (pw.length === 0) expect(result).toBe("required");
        else if (n < min) expect(result).toBe("password-short");
        else if (n > 64) expect(result).toBe("password-long");
        else expect(result === null || result === "password-guessable").toBe(true);
      }),
    );
  });
});

/** A fixed "today" for the age check (P-79). */
const TODAY = "2026-11-04";

describe("create account validation (AUTH-02)", () => {
  const valid: CreateAccountForm = {
    displayName: "Selam",
    email: "selam@example.test",
    birthDate: "1998-03-12",
    password: "a long passphrase",
    confirmPassword: "a long passphrase",
    acceptedTerms: true,
  };

  it("accepts a valid form", () => {
    expect(validateCreateAccount(valid, policy, TODAY)).toEqual({});
  });

  it("flags only the failing fields", () => {
    expect(validateCreateAccount({ ...valid, displayName: "  " }, policy, TODAY)).toEqual({
      displayName: "required",
    });
    expect(validateCreateAccount({ ...valid, email: "selam@" }, policy, TODAY)).toEqual({
      email: "email-malformed",
    });
    expect(
      validateCreateAccount({ ...valid, confirmPassword: "different one" }, policy, TODAY),
    ).toEqual({ confirmPassword: "password-mismatch" });
    expect(
      hasErrors(
        validateCreateAccount(
          { ...valid, password: "short", confirmPassword: "short" },
          policy,
          TODAY,
        ),
      ),
    ).toBe(true);
  });

  it("asks for a real birthday, 16 and over (P-79), and the terms", () => {
    const check = (birthDate: string) =>
      validateCreateAccount({ ...valid, birthDate }, policy, TODAY).birthDate;
    expect(check("")).toBe("required");
    expect(check("2001-02-29")).toBe("date-invalid");
    expect(check("2010-11-05")).toBe("too-young"); // 16 tomorrow
    expect(check("2010-11-04")).toBeUndefined(); // 16 today
    expect(check("2030-01-01")).toBe("too-young");
    expect(validateCreateAccount({ ...valid, acceptedTerms: false }, policy, TODAY)).toEqual({
      acceptedTerms: "terms-required",
    });
    expect(birthDateError("1998-03-12", TODAY)).toBeNull();
  });

  it("checks the age where the day starts first", () => {
    // 10:30 UTC on 3 November is already 4 November in Kiritimati (UTC+14).
    expect(ageCheckToday(Temporal.Instant.from("2026-11-03T10:30:00Z"))).toBe("2026-11-04");
  });

  it("validates new passwords the same way (AUTH-06)", () => {
    expect(
      validateNewPassword(
        { password: "a long passphrase", confirmPassword: "a long passphrase" },
        policy,
      ),
    ).toEqual({});
    expect(validateNewPassword({ password: "short", confirmPassword: "" }, policy)).toEqual({
      password: "password-short",
      confirmPassword: "required",
    });
  });
});

describe("sign in (AUTH-03)", () => {
  it("only checks presence, so it can never hint which field was wrong", () => {
    expect(signInErrors("x", "y")).toEqual({});
    expect(signInErrors("", "")).toEqual({ email: "required", password: "required" });
  });
});

describe("email helpers", () => {
  it("recognises email shapes loosely", () => {
    expect(isEmailShaped("a@b.co")).toBe(true);
    expect(isEmailShaped(" selam@example.test ")).toBe(true);
    for (const bad of ["", "selam", "selam@", "@example.test", "se lam@example.test", "a@b"]) {
      expect(isEmailShaped(bad)).toBe(false);
    }
  });

  it("masks all of the local part except its first character", () => {
    expect(maskEmail("selam@example.test")).toBe("s***@example.test");
    expect(maskEmail("not-an-email")).toBe("***");
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const at = email.lastIndexOf("@");
        const local = email.slice(0, at);
        // Exactly the first character, three asterisks and the domain: nothing else of the
        // local part leaks. (Checking "not contains local" was flaky: aa@aa.com.)
        expect(maskEmail(email)).toBe(`${Array.from(local)[0] ?? ""}***${email.slice(at)}`);
      }),
      { numRuns: 300 },
    );
  });

  it("has calm copy for every error", () => {
    for (const e of [
      "required",
      "email-malformed",
      "password-short",
      "password-long",
      "password-mismatch",
    ] as const) {
      expect(fieldErrorMessage(e, policy).length).toBeGreaterThan(5);
    }
    expect(fieldErrorMessage("password-short", policy)).toContain("15");
    expect(fieldErrorMessage("password-guessable", policy)).toMatch(/easy to guess/);
  });
});

describe("create account in four steps (AUTH-02, P-48, P-79)", () => {
  const empty: CreateAccountForm = {
    displayName: "",
    email: "",
    birthDate: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  };
  const valid: CreateAccountForm = {
    displayName: "Noah",
    email: "noah@example.test",
    birthDate: "1997-09-03",
    password: "a long passphrase",
    confirmPassword: "a long passphrase",
    acceptedTerms: true,
  };

  it("checks only the current step's fields", () => {
    expect(stepErrors(empty, 0, policy, TODAY)).toEqual({ displayName: "required" });
    expect(stepErrors(empty, 1, policy, TODAY)).toEqual({ email: "required" });
    expect(stepErrors(empty, 2, policy, TODAY)).toEqual({ birthDate: "required" });
    expect(stepErrors(empty, 3, policy, TODAY)).toEqual({
      password: "required",
      confirmPassword: "required",
      acceptedTerms: "terms-required",
    });
    expect(stepErrors(valid, 3, policy, TODAY)).toEqual({});
  });

  it("sends the person back to the earliest step that needs attention", () => {
    expect(firstStepWithErrors(valid, policy, TODAY)).toBeNull();
    expect(firstStepWithErrors({ ...valid, email: "noah@" }, policy, TODAY)).toBe(1);
    expect(firstStepWithErrors({ ...valid, birthDate: "2015-01-01" }, policy, TODAY)).toBe(2);
    expect(
      firstStepWithErrors({ ...valid, displayName: " ", confirmPassword: "x" }, policy, TODAY),
    ).toBe(0);
  });

  it("splits the full validation exactly across the steps (property)", () => {
    const text = fc.oneof(
      fc.constant(""),
      fc.constant("noah@example.test"),
      fc.constant("a long passphrase"),
      fc.string({ maxLength: 20 }),
    );
    fc.assert(
      fc.property(
        fc.record({
          displayName: text,
          email: text,
          birthDate: fc.constantFrom("", "1997-09-03", "2015-06-01", "2001-02-29"),
          password: text,
          confirmPassword: text,
          acceptedTerms: fc.boolean(),
        }),
        (form) => {
          const merged = {
            ...stepErrors(form, 0, policy, TODAY),
            ...stepErrors(form, 1, policy, TODAY),
            ...stepErrors(form, 2, policy, TODAY),
            ...stepErrors(form, 3, policy, TODAY),
          };
          expect(merged).toEqual(validateCreateAccount(form, policy, TODAY));
          const first = firstStepWithErrors(form, policy, TODAY);
          if (first === null)
            expect(hasErrors(validateCreateAccount(form, policy, TODAY))).toBe(false);
          else {
            expect(hasErrors(stepErrors(form, first, policy, TODAY))).toBe(true);
            for (const earlier of [0, 1, 2, 3] as const)
              if (earlier < first) expect(stepErrors(form, earlier, policy, TODAY)).toEqual({});
          }
        },
      ),
      { numRuns: 400 },
    );
  });

  it("covers every form field exactly once", () => {
    const fields: string[] = CREATE_ACCOUNT_STEPS.flat();
    expect(fields.sort()).toEqual(Object.keys(empty).sort());
  });

  it("reports the live password checklist", () => {
    expect(passwordChecks("", "", policy)).toEqual({
      longEnough: false,
      hardToGuess: false,
      matches: false,
    });
    expect(passwordChecks("short", "short", policy)).toEqual({
      longEnough: false,
      hardToGuess: true,
      matches: true,
    });
    expect(passwordChecks("a long passphrase", "a long", policy)).toEqual({
      longEnough: true,
      hardToGuess: true,
      matches: false,
    });
    expect(passwordChecks("a".repeat(16), "a".repeat(16), policy)).toEqual({
      longEnough: true,
      hardToGuess: false,
      matches: true,
    });
    expect(passwordChecks("selam2026selam!!", "", policy, ["Selam"])).toMatchObject({
      hardToGuess: false,
    });
    expect(passwordChecks("a long passphrase", "a long passphrase", policy)).toEqual({
      longEnough: true,
      hardToGuess: true,
      matches: true,
    });
  });
});
