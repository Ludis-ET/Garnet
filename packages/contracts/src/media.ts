import { z } from "zod";

/**
 * Media Upload & Direct Storage Contracts (B7, B-41, ADR-0005, P-12, P-38).
 */

export const mediaStatusSchema = z.enum(["pending_upload", "ready", "rejected"]);
export type MediaStatus = z.infer<typeof mediaStatusSchema>;

export const mediaEntityTypeSchema = z.enum([
  "entry",
  "chat_message",
  "surprise",
  "open_when",
  "avatar",
]);
export type MediaEntityType = z.infer<typeof mediaEntityTypeSchema>;

export const requestUploadSchema = z.object({
  id: z.uuid().optional(),
  contentType: z.string().min(3),
  byteSize: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i, "Must be a 64-character hex SHA-256 hash"),
  entityType: mediaEntityTypeSchema.default("entry"),
  entityId: z.uuid(),
});
export type RequestUploadDto = z.infer<typeof requestUploadSchema>;

export const requestUploadResponseSchema = z.object({
  id: z.uuid(),
  uploadUrl: z.url(),
  objectKey: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
export type RequestUploadResponse = z.infer<typeof requestUploadResponseSchema>;

export const commitMediaSchema = z.object({
  entityId: z.uuid(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
});
export type CommitMediaDto = z.infer<typeof commitMediaSchema>;

export const commitMediaResponseSchema = z.object({
  status: z.enum(["ready", "rejected", "not-uploaded", "gone"]),
  reason: z.string().optional(),
  media: z
    .object({
      id: z.uuid(),
      type: z.enum(["photo", "video", "voice"]),
      url: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      durationSeconds: z.number().optional(),
    })
    .optional(),
});
export type CommitMediaResponse = z.infer<typeof commitMediaResponseSchema>;

export const mediaUrlResponseSchema = z.object({
  url: z.url(),
  expiresInSeconds: z.number().int().positive(),
});
export type MediaUrlResponse = z.infer<typeof mediaUrlResponseSchema>;
