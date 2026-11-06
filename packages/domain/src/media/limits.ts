/**
 * Media Limits & Constraints Policy (U-08).
 *
 * UNRESOLVED DECISION U-08:
 * Caps on per-type media upload size and duration are undecided until hosting cost
 * modeling is reviewed (U-07). Per repository rules, this is modeled as a required
 * parameter with NO silent default. Candidate presets are exported as named constants.
 */

export interface MediaLimitsPolicy {
  /** Maximum photo size in bytes. */
  readonly maxPhotoBytes: number;
  /** Maximum video file size in bytes. */
  readonly maxVideoBytes: number;
  /** Maximum video duration in seconds. */
  readonly maxVideoSeconds: number;
  /** Maximum audio/voice recording size in bytes. */
  readonly maxVoiceBytes: number;
  /** Maximum voice recording duration in seconds. */
  readonly maxVoiceSeconds: number;
  /** List of permitted MIME content types. */
  readonly allowedContentTypes: readonly string[];
}

/** Conservative limits: for cost-effective or storage-constrained hosting. */
export const CONSERVATIVE_MEDIA_LIMITS: MediaLimitsPolicy = {
  maxPhotoBytes: 5 * 1024 * 1024, // 5 MB
  maxVideoBytes: 25 * 1024 * 1024, // 25 MB
  maxVideoSeconds: 30, // 30 seconds
  maxVoiceBytes: 5 * 1024 * 1024, // 5 MB
  maxVoiceSeconds: 60, // 1 minute
  allowedContentTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "audio/mp4",
    "audio/aac",
    "audio/mpeg",
    "audio/ogg",
  ],
};

/** Generous limits: for higher fidelity and longer shared recordings. */
export const GENEROUS_MEDIA_LIMITS: MediaLimitsPolicy = {
  maxPhotoBytes: 15 * 1024 * 1024, // 15 MB
  maxVideoBytes: 100 * 1024 * 1024, // 100 MB
  maxVideoSeconds: 120, // 2 minutes
  maxVoiceBytes: 15 * 1024 * 1024, // 15 MB
  maxVoiceSeconds: 300, // 5 minutes
  allowedContentTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "audio/mp4",
    "audio/aac",
    "audio/mpeg",
    "audio/ogg",
  ],
};

export type MediaLimitValidationResult =
  | { readonly valid: true }
  | {
      readonly valid: false;
      readonly reason:
        "unsupported-content-type" | "size-limit-exceeded" | "duration-limit-exceeded";
    };

/** Validates an upload candidate against an explicit limits policy (no default, U-08). */
export function validateMediaLimits(
  policy: MediaLimitsPolicy,
  input: {
    contentType: string;
    byteSize: number;
    durationSeconds?: number | undefined;
  },
): MediaLimitValidationResult {
  if (!policy.allowedContentTypes.includes(input.contentType)) {
    return { valid: false, reason: "unsupported-content-type" };
  }

  const isPhoto = input.contentType.startsWith("image/");
  const isVideo = input.contentType.startsWith("video/");
  const isVoice = input.contentType.startsWith("audio/");

  if (isPhoto && input.byteSize > policy.maxPhotoBytes) {
    return { valid: false, reason: "size-limit-exceeded" };
  }

  if (isVideo) {
    if (input.byteSize > policy.maxVideoBytes) {
      return { valid: false, reason: "size-limit-exceeded" };
    }
    if (input.durationSeconds !== undefined && input.durationSeconds > policy.maxVideoSeconds) {
      return { valid: false, reason: "duration-limit-exceeded" };
    }
  }

  if (isVoice) {
    if (input.byteSize > policy.maxVoiceBytes) {
      return { valid: false, reason: "size-limit-exceeded" };
    }
    if (input.durationSeconds !== undefined && input.durationSeconds > policy.maxVoiceSeconds) {
      return { valid: false, reason: "duration-limit-exceeded" };
    }
  }

  return { valid: true };
}
