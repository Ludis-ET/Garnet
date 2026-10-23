/**
 * Pairing rules for PAIR-01 to PAIR-07. Pure: no React, no I/O.
 *
 * - Lifetime and single use come from P-18, which is **Proposed, not approved**, so the policy is
 *   a required parameter with no default (AGENTS.md §4). The prototype passes INVITE_POLICY_P18.
 * - The code format is a prototype choice (P-50). Delivery by code is assumed for the prototype
 *   only; U-33 (link, code or both) is open. Real token entropy is a backend decision.
 * - Instants are Temporal.Instant (ADR-0002); a lifetime is absolute hours, so a DST change never
 *   stretches or shortens an invitation.
 */
import { Temporal } from "temporal-polyfill";

export interface InvitePolicy {
  /** Maximum lifetime in hours. */
  ttlHours: number;
}

/** P-18 (proposed): an invitation lasts at most 24 hours and works once. */
export const INVITE_POLICY_P18: InvitePolicy = { ttlHours: 24 };

/** No look-alikes: 0/O, 1/I/L are left out so a code can be read aloud or typed safely. */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/** Uppercase and keep only characters that can appear in a code (drops spaces and dashes). */
export function normaliseInviteCode(input: string): string {
  return Array.from(input.toUpperCase())
    .filter((c) => INVITE_ALPHABET.includes(c))
    .join("")
    .slice(0, INVITE_CODE_LENGTH);
}

export function isInviteCodeComplete(input: string): boolean {
  return normaliseInviteCode(input).length === INVITE_CODE_LENGTH;
}

/** "K7QM4XPV" → "K7QM-4XPV" (partial codes are grouped as far as they go). */
export function formatInviteCode(code: string): string {
  const c = normaliseInviteCode(code);
  return c.length <= 4 ? c : `${c.slice(0, 4)}-${c.slice(4)}`;
}

/** How a screen reader should say a code: one character at a time, in its two groups. */
export function spokenInviteCode(code: string): string {
  const c = normaliseInviteCode(code);
  return [c.slice(0, 4), c.slice(4)]
    .filter((g) => g.length > 0)
    .map((g) => Array.from(g).join(" "))
    .join(", ");
}

/**
 * A new code from an injected source of randomness in [0, 1). The mock passes Math.random; real
 * codes come from the server's CSPRNG (backend decision).
 */
export function generateInviteCode(random: () => number): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const index = Math.min(
      INVITE_ALPHABET.length - 1,
      Math.floor(random() * INVITE_ALPHABET.length),
    );
    code += INVITE_ALPHABET[index] ?? "A";
  }
  return code;
}

export function inviteExpiresAt(
  createdAt: Temporal.Instant,
  policy: InvitePolicy,
): Temporal.Instant {
  return createdAt.add({ hours: policy.ttlHours });
}

export function isInviteExpired(now: Temporal.Instant, expiresAt: Temporal.Instant): boolean {
  return Temporal.Instant.compare(now, expiresAt) >= 0;
}

/**
 * "23 h 59 m", "59 m", "less than a minute", or null once expired. Rounds down, so the label
 * never promises more time than is left.
 */
export function inviteTimeLeft(now: Temporal.Instant, expiresAt: Temporal.Instant): string | null {
  if (isInviteExpired(now, expiresAt)) return null;
  const minutes = Math.floor(expiresAt.since(now).total("minutes"));
  if (minutes < 1) return "less than a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} m` : `${h} h ${m} m`;
}

/** The share-preview message (PAIR-02). Generic: no email, no link (U-33 open). */
export function inviteShareMessage(
  inviterName: string,
  code: string,
  policy: InvitePolicy,
): string {
  return `${inviterName} invited you to Garnet, a private space for two. Your code: ${formatInviteCode(code)}. It works once and expires in ${policy.ttlHours} hours.`;
}

/** The one message for any code that can't be used (P-18: unknown, used, expired, revoked). */
export const INVITE_NOT_VALID_MESSAGE =
  "This invitation isn't valid anymore. Ask your person for a new one.";
