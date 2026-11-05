import {
  AGE_CHECK_ZONE,
  isGuessablePassword,
  isOldEnough,
  isValidIsoDate,
  MIN_AGE,
  passwordContext,
} from "@garnet/contracts";
import { Temporal } from "temporal-polyfill";

/**
 * Account rules for the welcome and account flows (AUTH-01 to AUTH-08). Pure: no React, no I/O.
 *
 * The password rules come from P-25 / ADR-0006, which are **Proposed, not approved**, so the
 * policy is a required parameter with no default (AGENTS.md §4). The screens pass
 * PASSWORD_POLICY_P78 explicitly, the values chosen under owner direction P-78, which the API
 * is configured with too. Easy-to-guess passwords (repeats, runs, the person's own name) are
 * refused at any length by the same check the API uses (@garnet/contracts).
 */

export interface PasswordPolicy {
  /** Minimum length in characters (Unicode code points). */
  minLength: number;
  /** Maximum accepted length; P-25 says never below 64. */
  maxLength: number;
}

/** P-25 (proposed): at least 12 characters, no composition rules, a generous maximum. */
export const PASSWORD_POLICY_P25: PasswordPolicy = { minLength: 12, maxLength: 128 };

/** P-78 (owner direction): at least 15 characters (NIST SP 800-63B-4), no composition rules. */
export const PASSWORD_POLICY_P78: PasswordPolicy = { minLength: 15, maxLength: 128 };

export type FieldError =
  | "required"
  | "email-malformed"
  | "password-short"
  | "password-long"
  | "password-guessable"
  | "password-mismatch"
  | "date-invalid"
  | "too-young"
  | "terms-required";

/**
 * Today's date where the day starts first (P-79): someone who is 16 anywhere on Earth today
 * passes, as on the server. From the zone database (ADR-0002).
 */
export function ageCheckToday(now: Temporal.Instant = Temporal.Now.instant()): string {
  return now.toZonedDateTimeISO(AGE_CHECK_ZONE).toPlainDate().toString();
}

/** A birthday: given, a real date, and 16 or over on `today` (P-79). */
export function birthDateError(birthDate: string, today: string): FieldError | null {
  if (birthDate === "") return "required";
  if (!isValidIsoDate(birthDate)) return "date-invalid";
  return isOldEnough(birthDate, today) ? null : "too-young";
}

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

/** `context`: words a guesser would try first for this person (their name, their email). */
export function passwordError(
  password: string,
  policy: PasswordPolicy,
  context: readonly string[] = [],
): FieldError | null {
  if (password.length === 0) return "required";
  const n = length(password);
  if (n < policy.minLength) return "password-short";
  if (n > policy.maxLength) return "password-long";
  if (isGuessablePassword(password, context)) return "password-guessable";
  return null;
}

export interface CreateAccountForm {
  displayName: string;
  email: string;
  /** YYYY-MM-DD, or "" until typed in full (P-79). */
  birthDate: string;
  password: string;
  confirmPassword: string;
  /** The terms of use and privacy notice, accepted with a tap (P-79). */
  acceptedTerms: boolean;
}

export type CreateAccountErrors = Partial<Record<keyof CreateAccountForm, FieldError>>;

/** Field-level errors for AUTH-02. Valid input is never cleared; only the failing field is flagged. */
export function validateCreateAccount(
  form: CreateAccountForm,
  policy: PasswordPolicy,
  today: string,
): CreateAccountErrors {
  const errors: CreateAccountErrors = {};
  if (form.displayName.trim().length === 0) errors.displayName = "required";
  if (form.email.trim().length === 0) errors.email = "required";
  else if (!isEmailShaped(form.email)) errors.email = "email-malformed";
  const birth = birthDateError(form.birthDate, today);
  if (birth !== null) errors.birthDate = birth;
  const pw = passwordError(
    form.password,
    policy,
    passwordContext(form.displayName, form.email.trim()),
  );
  if (pw !== null) errors.password = pw;
  if (form.confirmPassword.length === 0) errors.confirmPassword = "required";
  else if (form.confirmPassword !== form.password) errors.confirmPassword = "password-mismatch";
  if (!form.acceptedTerms) errors.acceptedTerms = "terms-required";
  return errors;
}

/**
 * AUTH-02 asks one question per step (P-48): name, then email, then the birthday (P-79), then
 * the password with its confirmation and the terms. Each step validates only its own fields.
 */
export const CREATE_ACCOUNT_STEPS = [
  ["displayName"],
  ["email"],
  ["birthDate"],
  ["password", "confirmPassword", "acceptedTerms"],
] as const satisfies readonly (readonly (keyof CreateAccountForm)[])[];

export type CreateAccountStep = 0 | 1 | 2 | 3;

export function stepErrors(
  form: CreateAccountForm,
  step: CreateAccountStep,
  policy: PasswordPolicy,
  today: string,
): CreateAccountErrors {
  const all = validateCreateAccount(form, policy, today);
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
  today: string,
): CreateAccountStep | null {
  for (const step of [0, 1, 2, 3] as const) {
    if (hasErrors(stepErrors(form, step, policy, today))) return step;
  }
  return null;
}

/** Live checklist for new passwords (AUTH-02, AUTH-06): shown as the person types. */
export function passwordChecks(
  password: string,
  confirmPassword: string,
  policy: PasswordPolicy,
  context: readonly string[] = [],
): { longEnough: boolean; hardToGuess: boolean; matches: boolean } {
  const n = length(password);
  return {
    longEnough: n >= policy.minLength && n <= policy.maxLength,
    hardToGuess: password.length > 0 && !isGuessablePassword(password, context),
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
    case "password-guessable":
      return "That one is easy to guess. A few words that mean something to you work well.";
    case "password-mismatch":
      return "These passwords don't match.";
    case "date-invalid":
      return "That date doesn't exist. Check the day and month.";
    case "too-young":
      return `Garnet is for people ${String(MIN_AGE)} and over.`;
    case "terms-required":
      return "Please agree to the terms to continue.";
  }
}
