/**
 * Signals and Us contracts (B4, B-51, US-01 to US-10, P-07, P-66, §5).
 *
 * Provides schemas for:
 * - Emotional signals (gentle and support) and partner presets.
 * - Coarse location updates (~11 km, P-66).
 * - Us screen overview (distance, open support signal, recent signals).
 * - Signal history (newest first; communication, never metrics or totals).
 *
 * Deliberately absent (§5):
 * - Read receipts, "seen" state, escalation, response-time stats.
 * - Distance only exposes approximate km; exact coordinates are never shared.
 */
import { z } from "zod";
import { avatarSchema, sideSchema } from "./setup";

export const SIGNAL_TYPES = [
  "thought-of-you",
  "missing-you",
  "need-you",
  "need-to-talk",
  "just-listen",
  "check-on-me",
  "cant-talk-yet",
  "okay-now",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];
export const signalTypeSchema = z.enum(SIGNAL_TYPES);

export const SIGNAL_LEVELS = ["gentle", "support"] as const;
export type SignalLevel = (typeof SIGNAL_LEVELS)[number];
export const signalLevelSchema = z.enum(SIGNAL_LEVELS);

export const SIGNAL_RESPONSES = ["here", "comfort", "space", "later", "hug", "thought"] as const;
export type SignalResponseKind = (typeof SIGNAL_RESPONSES)[number];
export const signalResponseSchema = z.enum(SIGNAL_RESPONSES);

export const MISSING_LEVELS = ["A little", "A lot", "I need a hug"] as const;
export type MissingLevel = (typeof MISSING_LEVELS)[number];
export const missingLevelSchema = z.enum(MISSING_LEVELS);

export const NEEDS = [
  "down",
  "overwhelmed",
  "lonely",
  "talk",
  "comfort",
  "upset",
  "unsure",
  "you",
] as const;
export type NeedId = (typeof NEEDS)[number];
export const needIdSchema = z.enum(NEEDS);

export const TALK_TOPICS = [
  "Work",
  "Life",
  "Us",
  "Something difficult",
  "Something on my mind",
  "I don't know",
  "Just listen",
] as const;
export type TalkTopic = (typeof TALK_TOPICS)[number];
export const talkTopicSchema = z.enum(TALK_TOPICS);

export const CHECK_WHEN = ["now", "later", "tonight", "tomorrow"] as const;
export type CheckWhen = (typeof CHECK_WHEN)[number];
export const checkWhenSchema = z.enum(CHECK_WHEN);

export const ATTACHMENT_KINDS = ["photo", "voice", "video"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];
export const attachmentKindSchema = z.enum(ATTACHMENT_KINDS);

/** Details an emotional signal may carry (US-01 to US-09). All optional. */
export const signalPayloadSchema = z
  .object({
    note: z.string().max(500).optional(),
    level: missingLevelSchema.optional(),
    need: needIdSchema.optional(),
    topic: talkTopicSchema.optional(),
    when: checkWhenSchema.optional(),
    options: z.array(z.string().max(100)).max(10).optional(),
    attachments: z.array(attachmentKindSchema).max(5).optional(),
  })
  .strict();
export type SignalPayloadDto = z.infer<typeof signalPayloadSchema>;

/** Request to send a signal. */
export const sendSignalRequestSchema = z.object({
  signal: signalTypeSchema,
  payload: signalPayloadSchema.optional().default({}),
});
export type SendSignalRequest = z.infer<typeof sendSignalRequestSchema>;

/** Sent signal response from server. */
export const sendSignalResponseSchema = z.object({
  id: z.uuid(),
  signal: signalTypeSchema,
  sentAt: z.iso.datetime({ offset: true }),
});
export type SendSignalResponse = z.infer<typeof sendSignalResponseSchema>;

/** Partner response to an incoming signal (US-05). */
export const respondSignalRequestSchema = z.object({
  response: signalResponseSchema,
  body: z.string().max(500).optional(),
});
export type RespondSignalRequest = z.infer<typeof respondSignalRequestSchema>;

/** A signal item as seen in Us overview or history (US-01, US-10). Senders see only "Sent". */
export const signalItemDtoSchema = z.object({
  id: z.uuid(),
  signal: signalTypeSchema,
  mine: z.boolean(),
  at: z.iso.datetime({ offset: true }),
  payload: signalPayloadSchema,
  responses: z.array(signalResponseSchema),
});
export type SignalItemDto = z.infer<typeof signalItemDtoSchema>;

/** A person in the home or Us view. */
export const homePersonSchema = z.object({
  name: z.string(),
  side: sideSchema.nullable(),
  zone: z.string(),
  avatar: avatarSchema.optional(),
});
export type HomePersonDto = z.infer<typeof homePersonSchema>;

/** Distance between partners (P-66): rounded kilometres or approximate zone-city fallback. */
export const distanceDtoSchema = z.object({
  km: z.number().int().nonnegative(),
  approximate: z.boolean(),
});
export type DistanceDto = z.infer<typeof distanceDtoSchema>;

/** Coarse location update request (~11 km resolution, P-66). Null clears stored location. */
export const saveLocationRequestSchema = z.object({
  lat: z.number().min(-90).max(90).nullable(),
  lon: z.number().min(-180).max(180).nullable(),
});
export type SaveLocationRequest = z.infer<typeof saveLocationRequestSchema>;

/** Us overview response (US-01). Communication, never metrics. */
export const usOverviewResponseSchema = z.object({
  me: homePersonSchema,
  partner: homePersonSchema,
  distance: distanceDtoSchema.nullable(),
  openSupport: signalItemDtoSchema.nullable(),
  recent: z.array(signalItemDtoSchema),
});
export type UsOverviewResponse = z.infer<typeof usOverviewResponseSchema>;

/** Signal history response: chronological newest first. */
export const signalHistoryResponseSchema = z.object({
  signals: z.array(signalItemDtoSchema),
});
export type SignalHistoryResponse = z.infer<typeof signalHistoryResponseSchema>;
