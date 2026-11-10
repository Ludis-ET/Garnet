import { z } from "zod";

/**
 * Pairing (PAIR-01 to PAIR-07, P-18 proposed). Codes are 8 characters from an alphabet with no
 * look-alikes (P-50); the server makes them with a CSPRNG and stores only their hash, so it
 * returns a code once, when it is created.
 */
export const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/** Uppercase, and only characters a code can contain (drops spaces and dashes). */
export function normaliseInviteCode(input: string): string {
  return Array.from(input.toUpperCase())
    .filter((c) => INVITE_ALPHABET.includes(c))
    .join("")
    .slice(0, INVITE_CODE_LENGTH);
}

export const inviteCodeSchema = z
  .string()
  .max(40)
  .transform(normaliseInviteCode)
  .pipe(z.string().length(INVITE_CODE_LENGTH));

/** `GET /v1/pairing`: the server's side of pairing. Reviewing a code is kept on the phone. */
export const pairingStatusSchema = z.object({
  me: z.string(),
  partnerName: z.string().nullable(),
  /** The person's own invitation, while it hasn't been used or withdrawn. */
  invite: z
    .object({
      expiresAt: z.iso.datetime({ offset: true }),
      expired: z.boolean(),
      /** The inviter's own code (P-97); null for an invitation made before it was kept. */
      code: z.string().length(INVITE_CODE_LENGTH).nullable(),
    })
    .nullable(),
});
export type PairingStatusDto = z.infer<typeof pairingStatusSchema>;

export const createInviteResultSchema = z.object({
  code: z.string().length(INVITE_CODE_LENGTH),
  expiresAt: z.iso.datetime({ offset: true }),
});

export const inviteCodeBodySchema = z.object({ code: inviteCodeSchema }).strict();

/** One answer for every unusable code: unknown, used, expired, withdrawn or one's own (P-18). */
export const checkInviteResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), inviterName: z.string() }),
  z.object({ ok: z.literal(false) }),
]);

export const acceptInviteResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), partnerName: z.string() }),
  z.object({ ok: z.literal(false) }),
]);
