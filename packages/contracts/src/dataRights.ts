import { z } from "zod";

/**
 * Data rights, export, space ending, and account lifecycle schemas (B-100, B-101, B-120, P-37, P-80).
 *
 * Product guardrails (§5, §11):
 * - Exported data must never contain a partner's private drafts or sealed letters.
 * - Confirmatory words ("END", "DELETE") must be explicit.
 * - Re-authentication is required before sensitive data rights operations (P-80).
 */

export const exportStateSchema = z.enum(["none", "preparing", "ready", "expired", "failed"]);
export type ExportState = z.infer<typeof exportStateSchema>;

export const exportStatusSchema = z
  .object({
    state: exportStateSchema,
    readyAt: z.iso.datetime({ offset: true }).nullable(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    downloadUrl: z.string().nullable(),
    sizeBytes: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type ExportStatusDto = z.infer<typeof exportStatusSchema>;

export const reauthRequestSchema = z
  .object({
    password: z.string().min(1),
  })
  .strict();
export type ReauthRequestDto = z.infer<typeof reauthRequestSchema>;

export const reauthResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();
export type ReauthResponseDto = z.infer<typeof reauthResponseSchema>;

export const endSpaceRequestSchema = z
  .object({
    confirmWord: z.literal("END"),
  })
  .strict();
export type EndSpaceRequestDto = z.infer<typeof endSpaceRequestSchema>;

export const deleteAccountRequestSchema = z
  .object({
    confirmWord: z.literal("DELETE"),
  })
  .strict();
export type DeleteAccountRequestDto = z.infer<typeof deleteAccountRequestSchema>;

export const exportDataBundleSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime({ offset: true }),
    user: z.object({
      id: z.uuid(),
      email: z.string(),
      name: z.string(),
    }),
    profile: z.record(z.string(), z.unknown()).nullable(),
    settings: z.record(z.string(), z.unknown()).nullable(),
    days: z.array(z.record(z.string(), z.unknown())),
    chat: z.array(z.record(z.string(), z.unknown())),
    letters: z.array(z.record(z.string(), z.unknown())),
    surprises: z.array(z.record(z.string(), z.unknown())),
    memories: z.array(z.record(z.string(), z.unknown())),
    together: z.object({
      plans: z.array(z.record(z.string(), z.unknown())),
      places: z.array(z.record(z.string(), z.unknown())),
      songs: z.array(z.record(z.string(), z.unknown())),
    }),
    events: z.array(z.record(z.string(), z.unknown())),
  })
  .strict();
export type ExportDataBundleDto = z.infer<typeof exportDataBundleSchema>;
