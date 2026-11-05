import { z } from "zod";

/**
 * Registration details every account gives once (owner direction P-79): a birthday, checked
 * against the minimum age, and acceptance of the current terms and privacy notice. Email sign-ups
 * give them with the account; a first Google or Apple sign-in asks for them before anything else.
 */

/** P-79 (owner direction 2026-11-04): Garnet is for people 16 and over. */
export const MIN_AGE = 16;

/**
 * The version of the terms of use and privacy notice the app shows. Bumping it asks everyone to
 * accept again before going on. The texts are drafts until reviewed (U-36).
 */
export const TERMS_VERSION = "2026-11-04";

/** The time zone where "today" starts first (UTC+14): someone 16 anywhere on Earth today passes. */
export const AGE_CHECK_ZONE = "Pacific/Kiritimati";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(iso: string): [number, number, number] | null {
  const m = ISO_DATE.exec(iso);
  if (m === null) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** True for a real calendar date written YYYY-MM-DD (no 30 February), from 1900 on. */
export function isValidIsoDate(iso: string): boolean {
  const p = parts(iso);
  if (p === null) return false;
  const [y, m, d] = p;
  if (y < 1900 || m < 1 || m > 12 || d < 1) return false;
  const max = m === 2 && isLeap(y) ? 29 : (DAYS[m - 1] ?? 0);
  return d <= max;
}

/**
 * Whole years from `birth` to `today` (both YYYY-MM-DD). Someone born on 29 February turns a
 * year older on 1 March in years without one. Pure: no clocks, no time zones.
 */
export function ageOn(birth: string, today: string): number {
  const b = parts(birth);
  const t = parts(today);
  if (b === null || t === null) return -1;
  const [by, bm, bd] = b;
  const [ty, tm, td] = t;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/** True when someone born on `birth` is MIN_AGE or older on `today`, and the date is real. */
export function isOldEnough(birth: string, today: string): boolean {
  return isValidIsoDate(birth) && birth <= today && ageOn(birth, today) >= MIN_AGE;
}

/** A calendar date, YYYY-MM-DD. */
export const isoDateSchema = z.string().refine(isValidIsoDate, { error: "not a date" });

/** What registration asks for (P-79). The age is checked by whoever knows today's date. */
export const registrationSchema = z
  .object({ birthDate: isoDateSchema, termsVersion: z.literal(TERMS_VERSION) })
  .strict();
export type RegistrationDto = z.infer<typeof registrationSchema>;

/** `GET /v1/me/registration`: what is still missing. */
export const registrationStateSchema = z.object({
  complete: z.boolean(),
  birthDate: z.string().nullable(),
  /** The version this person accepted, or null; complete only when it is TERMS_VERSION. */
  termsVersion: z.string().nullable(),
  currentTermsVersion: z.string(),
});
export type RegistrationStateDto = z.infer<typeof registrationStateSchema>;

/** `POST /v1/me/registration`. Too young: the new account is removed, nothing is kept (P-79). */
export const completeRegistrationResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.literal("too-young") }),
]);

/** True when an account's stored details complete registration. */
export function isRegistrationComplete(
  birthDate: unknown,
  termsVersion: unknown,
): birthDate is string {
  return (
    typeof birthDate === "string" && isValidIsoDate(birthDate) && termsVersion === TERMS_VERSION
  );
}

/** `GET /v1/sign-in-methods`: which ways in this API offers (Google and Apple need set-up). */
export const signInMethodsSchema = z.object({
  email: z.literal(true),
  google: z.boolean(),
  apple: z.boolean(),
});
export type SignInMethodsDto = z.infer<typeof signInMethodsSchema>;
export type SocialProvider = "google" | "apple";
