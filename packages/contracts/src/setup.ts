import { z } from "zod";
import { isoDateSchema } from "./registration";

/**
 * The setup steps, in order (SETUP-02 to SETUP-07; SETUP-08 is the summary). "together" asks
 * when the two got together (P-79): one answer for the pair, whoever gives it first.
 */
export const SETUP_STEPS = ["name", "side", "photo", "time", "together", "look", "alerts"] as const;
/** Steps a person may skip; the rest need an answer before setup completes. */
export const OPTIONAL_SETUP_STEPS: readonly (typeof SETUP_STEPS)[number][] = [
  "photo",
  "together",
  "look",
];

/** A home town, as the person writes it (P-79): optional, shown to the partner. */
export const homeCitySchema = z.string().trim().min(1).max(80);

export const sideSchema = z.enum(["ruby", "sapphire"]);

const initialsAvatarSchema = z.object({
  kind: z.literal("initials"),
  swatch: z.number().int().min(0).max(31),
});
/** The prototype's sample pictures; still read, never offered any more. */
const samplePhotoAvatarSchema = z.object({
  kind: z.literal("photo"),
  photo: z.string().min(1).max(40),
});

/** A picture as the API reports it: initials, or a real image (P-98) by its version. */
export const avatarSchema = z.discriminatedUnion("kind", [
  initialsAvatarSchema,
  samplePhotoAvatarSchema,
  z.object({ kind: z.literal("image"), version: z.uuid() }),
]);
export type AvatarDto = z.infer<typeof avatarSchema>;

/** What setup may save directly: a real image is only ever set by uploading it (P-98). */
export const avatarInputSchema = z.discriminatedUnion("kind", [
  initialsAvatarSchema,
  samplePhotoAvatarSchema,
]);

/** The picture formats accepted, by their magic bytes too (P-98). */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Base64 characters: about 45 KB of image, under the API's 64 KB request limit. */
export const AVATAR_MAX_BASE64 = 60_000;

/** `PUT /v1/me/avatar`: a small square picture, resized on the phone. */
export const uploadAvatarSchema = z
  .object({
    contentType: z.enum(AVATAR_TYPES),
    data: z
      .string()
      .min(16)
      .max(AVATAR_MAX_BASE64)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();
export const uploadAvatarResultSchema = z.object({ avatar: avatarSchema });

export const notificationPrefsSchema = z.object({
  status: z.enum(["unset", "on", "off", "denied"]),
  thoughts: z.boolean(),
  support: z.boolean(),
  days: z.boolean(),
});

/** A person's own setup answers (SETUP-01 to SETUP-08). Only they ever read or write these. */
export const profileSchema = z.object({
  displayName: z.string(),
  nickname: z.string(),
  side: sideSchema.nullable(),
  avatar: avatarSchema,
  timeZone: z.string().nullable(),
  homeCity: z.string().nullable(),
  appearance: z.enum(["system", "light", "dark"]),
  accent: z.enum(["subtle", "rich"]),
  notifications: notificationPrefsSchema,
  done: z.array(z.enum(SETUP_STEPS)),
  complete: z.boolean(),
});
export type ProfileDto = z.infer<typeof profileSchema>;

/**
 * What a person may know of their partner's setup: nothing more (P-51). The birthday is the
 * full date (P-79, owner direction), for reminders and the birthday event.
 */
export const partnerProfileSchema = z.object({
  name: z.string(),
  side: sideSchema.nullable(),
  timeZone: z.string().nullable(),
  homeCity: z.string().nullable(),
  birthDate: z.string().nullable(),
  ready: z.boolean(),
  /** Their picture (P-98); initials until they choose one. */
  avatar: avatarSchema,
});

export const setupStateSchema = z.object({
  profile: profileSchema,
  /** Null until paired. */
  partner: partnerProfileSchema.nullable(),
  /** When the two got together (YYYY-MM-DD), shared by both; null until one of them says. */
  togetherSince: z.string().nullable(),
});
export type SetupStateDto = z.infer<typeof setupStateSchema>;

/**
 * Saving answers as the person goes. The side is only ever set through the side choice, and
 * completion only through complete, so neither is accepted here. Names follow P-52 (proposed):
 * the API checks the lengths it was configured with.
 */
export const updateSetupSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    nickname: z.string().trim().max(100),
    avatar: avatarInputSchema,
    timeZone: z.string().min(1).max(64).nullable(),
    homeCity: homeCitySchema.nullable(),
    appearance: z.enum(["system", "light", "dark"]),
    accent: z.enum(["subtle", "rich"]),
    notifications: notificationPrefsSchema,
    done: z.array(z.enum(SETUP_STEPS)),
  })
  .partial()
  .strict();
export type UpdateSetupDto = z.infer<typeof updateSetupSchema>;

/** `POST /v1/me/setup/together-since`: set for both, or cleared (null). Never in the future. */
export const togetherSinceSchema = z.object({ togetherSince: isoDateSchema.nullable() }).strict();

export const chooseSideSchema = z.object({ side: sideSchema }).strict();
export const chooseSideResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.literal("taken"), partnerSide: sideSchema }),
]);

export const completeSetupResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), missing: z.array(z.enum(SETUP_STEPS)) }),
]);
