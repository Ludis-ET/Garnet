/**
 * Account rules for the welcome and account flows (AUTH-01 to AUTH-08). Pure: no React, no I/O.
 *
 * The password rules come from P-25 / ADR-0006, which are **Proposed, not approved**, so the
 * policy is a required parameter with no default (AGENTS.md §4). The prototype passes
 * PASSWORD_POLICY_P25 explicitly and labels it as proposed.
 */

export interface PasswordPolicy {
  /** Minimum length in characters (Unicode code points). */
  minLength: number;
  /** Maximum accepted length; P-25 says never below 64. */
  maxLength: number;
}

/** P-25 (proposed): at least 12 characters, no composition rules, a generous maximum. */
export const PASSWORD_POLICY_P25: PasswordPolicy = { minLength: 12, maxLength: 128 };

export type FieldError =
  "required" | "email-malformed" | "password-short" | "password-long" | "password-mismatch";

/** Code points, so emoji and non-Latin scripts count as one character each. */
function length(text: string): number {
  return Array.from(text).length;
}

/**
 * A deliberately simple shape check: something@something.tld, no spaces. Real verification is
 * the email link (D-09); stricter regexes reject valid addresses.
 */
export function isEmailShaped(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function passwordError(password: string, policy: PasswordPolicy): FieldError | null {
  if (password.length === 0) return "required";
  const n = length(password);
  if (n < policy.minLength) return "password-short";
  if (n > policy.maxLength) return "password-long";
  return null;
}

export interface CreateAccountForm {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type CreateAccountErrors = Partial<Record<keyof CreateAccountForm, FieldError>>;

/** Field-level errors for AUTH-02. Valid input is never cleared; only the failing field is flagged. */
export function validateCreateAccount(
  form: CreateAccountForm,
  policy: PasswordPolicy,
): CreateAccountErrors {
  const errors: CreateAccountErrors = {};
  if (form.displayName.trim().length === 0) errors.displayName = "required";
  if (form.email.trim().length === 0) errors.email = "required";
  else if (!isEmailShaped(form.email)) errors.email = "email-malformed";
  const pw = passwordError(form.password, policy);
  if (pw !== null) errors.password = pw;
  if (form.confirmPassword.length === 0) errors.confirmPassword = "required";
  else if (form.confirmPassword !== form.password) errors.confirmPassword = "password-mismatch";
  return errors;
}

/**
 * AUTH-02 asks one question per step (P-48): name, then email, then password and its
 * confirmation. Each step validates only its own fields.
 */
export const CREATE_ACCOUNT_STEPS = [
  ["displayName"],
  ["email"],
  ["password", "confirmPassword"],
] as const satisfies readonly (readonly (keyof CreateAccountForm)[])[];

export type CreateAccountStep = 0 | 1 | 2;

export function stepErrors(
  form: CreateAccountForm,
  step: CreateAccountStep,
  policy: PasswordPolicy,
): CreateAccountErrors {
  const all = validateCreateAccount(form, policy);
  const errors: CreateAccountErrors = {};
  for (const field of CREATE_ACCOUNT_STEPS[step]) {
    const e = all[field];
    if (e !== undefined) errors[field] = e;
  }
  return errors;
}

/** The earliest step that still has an error, so the flow can send the person back to it. */
export function firstStepWithErrors(
  form: CreateAccountForm,
  policy: PasswordPolicy,
): CreateAccountStep | null {
  for (const step of [0, 1, 2] as const) {
    if (hasErrors(stepErrors(form, step, policy))) return step;
  }
  return null;
}

/** Live checklist for new passwords (AUTH-02, AUTH-06): shown as the person types. */
export function passwordChecks(
  password: string,
  confirmPassword: string,
  policy: PasswordPolicy,
): { longEnough: boolean; matches: boolean } {
  return {
    longEnough: passwordError(password, policy) === null,
    matches: confirmPassword.length > 0 && confirmPassword === password,
  };
}

export interface NewPasswordForm {
  password: string;
  confirmPassword: string;
}

export function validateNewPassword(
  form: NewPasswordForm,
  policy: PasswordPolicy,
): Partial<Record<keyof NewPasswordForm, FieldError>> {
  const errors: Partial<Record<keyof NewPasswordForm, FieldError>> = {};
  const pw = passwordError(form.password, policy);
  if (pw !== null) errors.password = pw;
  if (form.confirmPassword.length === 0) errors.confirmPassword = "required";
  else if (form.confirmPassword !== form.password) errors.confirmPassword = "password-mismatch";
  return errors;
}

/** Sign-in only checks that both fields are filled; it never hints which one was wrong. */
export function signInErrors(
  email: string,
  password: string,
): { email?: FieldError; password?: FieldError } {
  return {
    ...(email.trim().length === 0 ? { email: "required" as const } : {}),
    ...(password.length === 0 ? { password: "required" as const } : {}),
  };
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

/** Normalise an email for comparison (trim, lower-case). */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * "s***@example.test": the first character of the local part, then three asterisks, then the
 * domain. Shown on the verify screen so someone glancing at the phone learns little.
 */
export function maskEmail(email: string): string {
  const e = email.trim();
  const at = e.lastIndexOf("@");
  if (at <= 0) return "***";
  const first = Array.from(e.slice(0, at))[0] ?? "";
  return `${first}***${e.slice(at)}`;
}

/** Plain-language copy for each field error (voice-and-copy.md: calm, specific, no blame). */
export function fieldErrorMessage(error: FieldError, policy: PasswordPolicy): string {
  switch (error) {
    case "required":
      return "Please fill this in.";
    case "email-malformed":
      return "That doesn't look like an email address.";
    case "password-short":
      return `Use at least ${policy.minLength} characters.`;
    case "password-long":
      return `Use ${policy.maxLength} characters or fewer.`;
    case "password-mismatch":
      return "These passwords don't match.";
  }
}
