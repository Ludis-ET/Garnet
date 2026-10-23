import fc from "fast-check";
import {
  CREATE_ACCOUNT_STEPS,
  fieldErrorMessage,
  firstStepWithErrors,
  hasErrors,
  isEmailShaped,
  maskEmail,
  passwordChecks,
  passwordError,
  PASSWORD_POLICY_P25,
  signInErrors,
  stepErrors,
  validateCreateAccount,
  validateNewPassword,
  type CreateAccountForm,
  type PasswordPolicy,
} from "./auth";

const policy = PASSWORD_POLICY_P25; // P-25 (proposed): min 12

describe("password policy (P-25, proposed: assumed by these tests)", () => {
  it("requires the minimum length and nothing else (no composition rules)", () => {
    expect(passwordError("", policy)).toBe("required");
    expect(passwordError("a".repeat(11), policy)).toBe("password-short");
    expect(passwordError("a".repeat(12), policy)).toBeNull();
    expect(passwordError("correct horse", policy)).toBeNull();
    expect(passwordError("a".repeat(129), policy)).toBe("password-long");
  });

  it("counts characters, not UTF-16 units (emoji and other scripts count once)", () => {
    expect(passwordError("💜".repeat(12), policy)).toBeNull();
    expect(passwordError("💜".repeat(11), policy)).toBe("password-short");
    expect(passwordError("ሰላምሰላምሰላምሰላም", policy)).toBeNull();
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
        else expect(result).toBeNull();
      }),
    );
  });
});

describe("create account validation (AUTH-02)", () => {
  const valid = {
    displayName: "Selam",
    email: "selam@example.test",
    password: "a long passphrase",
    confirmPassword: "a long passphrase",
  };

  it("accepts a valid form", () => {
    expect(validateCreateAccount(valid, policy)).toEqual({});
  });

  it("flags only the failing fields", () => {
    expect(validateCreateAccount({ ...valid, displayName: "  " }, policy)).toEqual({
      displayName: "required",
    });
    expect(validateCreateAccount({ ...valid, email: "selam@" }, policy)).toEqual({
      email: "email-malformed",
    });
    expect(validateCreateAccount({ ...valid, confirmPassword: "different one" }, policy)).toEqual({
      confirmPassword: "password-mismatch",
    });
    expect(
      hasErrors(
        validateCreateAccount({ ...valid, password: "short", confirmPassword: "short" }, policy),
      ),
    ).toBe(true);
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
    expect(fieldErrorMessage("password-short", policy)).toContain("12");
  });
});

describe("create account in three steps (AUTH-02, P-48)", () => {
  const empty: CreateAccountForm = {
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  };
  const valid: CreateAccountForm = {
    displayName: "Noah",
    email: "noah@example.test",
    password: "a long passphrase",
    confirmPassword: "a long passphrase",
  };

  it("checks only the current step's fields", () => {
    expect(stepErrors(empty, 0, policy)).toEqual({ displayName: "required" });
    expect(stepErrors(empty, 1, policy)).toEqual({ email: "required" });
    expect(stepErrors(empty, 2, policy)).toEqual({
      password: "required",
      confirmPassword: "required",
    });
    expect(stepErrors(valid, 2, policy)).toEqual({});
  });

  it("sends the person back to the earliest step that needs attention", () => {
    expect(firstStepWithErrors(valid, policy)).toBeNull();
    expect(firstStepWithErrors({ ...valid, email: "noah@" }, policy)).toBe(1);
    expect(firstStepWithErrors({ ...valid, displayName: " ", confirmPassword: "x" }, policy)).toBe(
      0,
    );
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
        fc.record({ displayName: text, email: text, password: text, confirmPassword: text }),
        (form) => {
          const merged = Object.assign(
            {},
            stepErrors(form, 0, policy),
            stepErrors(form, 1, policy),
            stepErrors(form, 2, policy),
          );
          expect(merged).toEqual(validateCreateAccount(form, policy));
          const first = firstStepWithErrors(form, policy);
          if (first === null) expect(hasErrors(validateCreateAccount(form, policy))).toBe(false);
          else {
            expect(hasErrors(stepErrors(form, first, policy))).toBe(true);
            for (const earlier of [0, 1, 2] as const)
              if (earlier < first) expect(stepErrors(form, earlier, policy)).toEqual({});
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
    expect(passwordChecks("", "", policy)).toEqual({ longEnough: false, matches: false });
    expect(passwordChecks("short", "short", policy)).toEqual({ longEnough: false, matches: true });
    expect(passwordChecks("a long passphrase", "a long", policy)).toEqual({
      longEnough: true,
      matches: false,
    });
    expect(passwordChecks("a long passphrase", "a long passphrase", policy)).toEqual({
      longEnough: true,
      matches: true,
    });
  });
});
