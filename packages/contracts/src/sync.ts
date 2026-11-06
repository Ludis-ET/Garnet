/**
 * Sync and Days contracts (B3, P-81, ADR-0003, F-04).
 *
 * Provides schemas for:
 * - Batched mutations (create, edit, share, delete) with optimistic concurrency (baseVersion).
 * - Mutation outcomes: applied, conflict, gone, rejected.
 * - Change feed polling with cursor.
 * - Day summary, day detail, and moment views.
 * - Optional timestamp editing (P-81 / U-11).
 */
import { z } from "zod";

export const ENTRY_KINDS = [
  "text",
  "photo",
  "video",
  "voice",
  "feeling",
  "activity",
  "food",
  "work",
  "location",
  "place",
  "custom",
] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const entryKindSchema = z.enum(ENTRY_KINDS);

export const VISIBILITIES = ["private", "shared", "afterReveal"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const visibilitySchema = z.enum(VISIBILITIES);

export const REVEAL_STATES = ["open", "waiting", "ready"] as const;
export type RevealState = (typeof REVEAL_STATES)[number];
export const revealStateSchema = z.enum(REVEAL_STATES);

/** An entry as transmitted between API and client. */
export const entryDtoSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  kind: entryKindSchema,
  body: z.string(),
  emoji: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
  activity: z.string().nullable().optional(),
  place: z.string().nullable().optional(),
  visibility: visibilitySchema,
  occurredAt: z.iso.datetime({ offset: true }),
  occurredTimeZone: z.string().min(1),
  sharedAt: z.iso.datetime({ offset: true }).nullable(),
  sharedDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  version: z.number().int().min(1),
  revealedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type EntryDto = z.infer<typeof entryDtoSchema>;

/** Individual mutation schemas */
export const createMutationSchema = z.object({
  kind: z.literal("create"),
  mutationId: z.uuid(),
  entryId: z.uuid(),
  entryKind: entryKindSchema.default("text"),
  body: z.string().default(""),
  emoji: z.string().optional(),
  mood: z.string().optional(),
  activity: z.string().optional(),
  place: z.string().optional(),
  visibility: visibilitySchema.default("private"),
  occurredAt: z.iso.datetime({ offset: true }),
  occurredTimeZone: z.string().min(1),
});
export type CreateMutation = z.infer<typeof createMutationSchema>;

export const editMutationSchema = z.object({
  kind: z.literal("edit"),
  mutationId: z.uuid(),
  entryId: z.uuid(),
  baseVersion: z.number().int().min(1),
  body: z.string(),
  emoji: z.string().optional(),
  mood: z.string().optional(),
  activity: z.string().optional(),
  place: z.string().optional(),
  // P-81 / U-11: Optional timestamp editing within the shared day
  occurredAt: z.iso.datetime({ offset: true }).optional(),
});
export type EditMutation = z.infer<typeof editMutationSchema>;

export const shareMutationSchema = z.object({
  kind: z.literal("share"),
  mutationId: z.uuid(),
  entryId: z.uuid(),
  baseVersion: z.number().int().min(1),
  visibility: z.enum(["shared", "afterReveal"]).default("shared"),
});
export type ShareMutation = z.infer<typeof shareMutationSchema>;

export const deleteMutationSchema = z.object({
  kind: z.literal("delete"),
  mutationId: z.uuid(),
  entryId: z.uuid(),
});
export type DeleteMutation = z.infer<typeof deleteMutationSchema>;

export const mutationSchema = z.discriminatedUnion("kind", [
  createMutationSchema,
  editMutationSchema,
  shareMutationSchema,
  deleteMutationSchema,
]);
export type Mutation = z.infer<typeof mutationSchema>;

export const batchMutationsRequestSchema = z.object({
  mutations: z.array(mutationSchema).min(1).max(100),
});
export type BatchMutationsRequest = z.infer<typeof batchMutationsRequestSchema>;

export const mutationResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("applied"),
    entry: entryDtoSchema.nullable(),
  }),
  z.object({
    status: z.literal("gone"),
  }),
  z.object({
    status: z.literal("conflict"),
    current: entryDtoSchema,
  }),
  z.object({
    status: z.literal("rejected"),
    reason: z.enum([
      "forbidden",
      "not-found",
      "duplicate-id",
      "idempotency-key-reuse",
      "read-only",
      "shared-stays-shared",
    ]),
  }),
]);
export type MutationResult = z.infer<typeof mutationResultSchema>;

export const batchMutationsResponseSchema = z.object({
  results: z.array(mutationResultSchema),
});
export type BatchMutationsResponse = z.infer<typeof batchMutationsResponseSchema>;

/** Change feed schemas (F-04) */
export const changeDtoSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("upsert"),
    entry: entryDtoSchema,
    mutationId: z.uuid().nullable().optional(),
    seq: z.string(),
  }),
  z.object({
    type: z.literal("delete"),
    entryId: z.uuid(),
    mutationId: z.uuid().nullable().optional(),
    seq: z.string(),
  }),
]);
export type ChangeDto = z.infer<typeof changeDtoSchema>;

export const changeFeedQuerySchema = z.object({
  since: z.string().regex(/^\d+$/).default("0"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ChangeFeedQuery = z.infer<typeof changeFeedQuerySchema>;

export const changeFeedResponseSchema = z.object({
  changes: z.array(changeDtoSchema),
  cursor: z.string(),
  hasMore: z.boolean(),
});
export type ChangeFeedResponse = z.infer<typeof changeFeedResponseSchema>;

/** Day summary and overview */
export const daySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isToday: z.boolean(),
  preview: z.array(z.string()),
  me: z.boolean(),
  partner: z.boolean(),
  state: revealStateSchema,
});
export type DaySummaryDto = z.infer<typeof daySummarySchema>;

export const daysOverviewResponseSchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(daySummarySchema),
});
export type DaysOverviewResponse = z.infer<typeof daysOverviewResponseSchema>;

export const dayDetailResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isToday: z.boolean(),
  mine: z.array(entryDtoSchema),
  partner: z.array(entryDtoSchema),
  state: revealStateSchema,
  meReady: z.boolean(),
  partnerReady: z.boolean(),
});
export type DayDetailResponse = z.infer<typeof dayDetailResponseSchema>;

export const finishDayRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type FinishDayRequest = z.infer<typeof finishDayRequestSchema>;
