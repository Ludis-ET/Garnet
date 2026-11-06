// packages/contracts/src/moments.ts
// Milestone B8: Moments (Open When Letters, Surprises, Events & Chapters, Memories & Collections, Together).
// Strict contracts enforcing B-90 / U-34 (sealed letter body withholding), P-21, P-22, P-68, P-71, P-72, U-16.

import { z } from "zod";

// --- 1. Open When Letters (B-90, U-31, U-34) -----------------------------------

export const letterStyleSchema = z.object({
  paper: z.enum(["cream", "parchment", "rose", "midnight"]).default("cream"),
  font: z.enum(["serif", "sans", "handwritten"]).default("serif"),
});
export type LetterStyleDto = z.infer<typeof letterStyleSchema>;

export const unlockRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("date"), date: z.string() }),
  z.object({ type: z.literal("event"), eventName: z.string() }),
]);
export type UnlockRuleDto = z.infer<typeof unlockRuleSchema>;

export const openWhenDraftViewSchema = z.object({
  id: z.uuid(),
  status: z.literal("draft"),
  authorId: z.uuid(),
  recipientId: z.uuid(),
  prompt: z.string(),
  body: z.string(),
  paper: letterStyleSchema.optional(),
  mediaRefs: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export const openWhenSealedViewSchema = z.object({
  id: z.uuid(),
  status: z.literal("sealed"),
  authorId: z.uuid(),
  recipientId: z.uuid(),
  prompt: z.string(),
  sealedAt: z.string(),
  unlockRule: unlockRuleSchema,
  createdAt: z.string(),
  // NOTE: B-90 / U-34: body and mediaRefs are strictly excluded from sealed view!
});

export const openWhenOpenedViewSchema = z.object({
  id: z.uuid(),
  status: z.literal("opened"),
  authorId: z.uuid(),
  recipientId: z.uuid(),
  prompt: z.string(),
  body: z.string(),
  paper: letterStyleSchema.optional(),
  mediaRefs: z.array(z.string()).optional(),
  sealedAt: z.string(),
  openedAt: z.string(),
  unlockRule: unlockRuleSchema,
  createdAt: z.string(),
});

export const openWhenViewSchema = z.discriminatedUnion("status", [
  openWhenDraftViewSchema,
  openWhenSealedViewSchema,
  openWhenOpenedViewSchema,
]);
export type OpenWhenViewDto = z.infer<typeof openWhenViewSchema>;

export const createLetterDraftSchema = z.object({
  prompt: z.string().min(1).max(200),
  body: z.string().max(20_000).default(""),
  paper: letterStyleSchema.optional(),
  mediaRefs: z.array(z.string()).optional(),
  unlockRule: unlockRuleSchema.optional(),
});
export type CreateLetterDraftRequest = z.infer<typeof createLetterDraftSchema>;

export const saveLetterDraftSchema = z.object({
  prompt: z.string().min(1).max(200).optional(),
  body: z.string().max(20_000).optional(),
  paper: letterStyleSchema.optional(),
  mediaRefs: z.array(z.string()).optional(),
  unlockRule: unlockRuleSchema.optional(),
});
export type SaveLetterDraftRequest = z.infer<typeof saveLetterDraftSchema>;

export const sealLetterSchema = z.object({
  unlockRule: unlockRuleSchema.default({ type: "manual" }),
});
export type SealLetterRequest = z.infer<typeof sealLetterSchema>;

// --- 2. Surprises (P-68, P-71) --------------------------------------------------

export const surpriseRevealSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("now") }),
  z.object({ kind: z.literal("date"), date: z.string() }),
  z.object({ kind: z.literal("event"), eventId: z.uuid() }),
]);
export type SurpriseRevealDto = z.infer<typeof surpriseRevealSchema>;

export const surpriseContentSchema = z.object({
  kind: z.enum(["photo", "video", "voice", "letter", "song", "idea"]),
  textContent: z.string().optional(),
  mediaRef: z.unknown().optional(),
  songInfo: z
    .object({
      title: z.string(),
      artist: z.string().optional(),
      link: z.string().optional(),
    })
    .optional(),
  paper: letterStyleSchema.optional(),
});
export type SurpriseContentDto = z.infer<typeof surpriseContentSchema>;

export const surpriseScheduledViewSchema = z.object({
  id: z.uuid(),
  state: z.literal("scheduled"),
  authorId: z.uuid(),
  recipientId: z.uuid(),
  safeTitle: z.string().nullable(),
  reveal: surpriseRevealSchema,
  createdAt: z.string(),
  // Content is strictly excluded while scheduled!
});

export const surpriseOpenedViewSchema = z.object({
  id: z.uuid(),
  state: z.literal("opened"),
  authorId: z.uuid(),
  recipientId: z.uuid(),
  safeTitle: z.string().nullable(),
  reveal: surpriseRevealSchema,
  content: surpriseContentSchema,
  openedAt: z.string(),
  createdAt: z.string(),
});

export const surpriseCancelledViewSchema = z.object({
  id: z.uuid(),
  state: z.literal("cancelled"),
  authorId: z.uuid(),
  recipientId: z.uuid(),
  safeTitle: z.string().nullable(),
  createdAt: z.string(),
});

export const surpriseViewSchema = z.discriminatedUnion("state", [
  surpriseScheduledViewSchema,
  surpriseOpenedViewSchema,
  surpriseCancelledViewSchema,
]);
export type SurpriseViewDto = z.infer<typeof surpriseViewSchema>;

export const createSurpriseSchema = z.object({
  content: surpriseContentSchema,
  safeTitle: z.string().max(100).nullable().optional(),
  reveal: surpriseRevealSchema,
});
export type CreateSurpriseRequest = z.infer<typeof createSurpriseSchema>;

export const retitleSurpriseSchema = z.object({
  safeTitle: z.string().max(100).nullable(),
});
export type RetitleSurpriseRequest = z.infer<typeof retitleSurpriseSchema>;

// --- 3. Events & Chapters (ADR-0002, EVT-07) -----------------------------------

export const eventKindSchema = z.enum(["birthday", "anniversary", "travel", "date", "custom"]);
export type EventKindDto = z.infer<typeof eventKindSchema>;

export const repeatSchema = z.enum(["none", "yearly", "monthly"]);
export type RepeatDto = z.infer<typeof repeatSchema>;

export const calendarEventSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  title: z.string(),
  kind: eventKindSchema,
  firstDate: z.string(),
  eventTime: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  repeats: repeatSchema,
  whose: z.enum(["me", "partner"]).nullable().optional(),
  description: z.string().nullable().optional(),
  reminders: z.array(z.string()).optional(),
  art: z.string().nullable().optional(),
  nextOccurrence: z.string().nullable().optional(),
  times: z
    .object({
      me: z.string(),
      partner: z.string(),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CalendarEventDto = z.infer<typeof calendarEventSchema>;

export const listEventsResponseSchema = z.object({
  today: z.string(),
  events: z.array(calendarEventSchema),
});
export type ListEventsResponseDto = z.infer<typeof listEventsResponseSchema>;

export const chapterDetailResponseSchema = z.object({
  title: z.string(),
  reflections: z.array(
    z.object({
      promptId: z.string(),
      userId: z.string(),
      reflection: z.string(),
    }),
  ),
});
export type ChapterDetailResponseDto = z.infer<typeof chapterDetailResponseSchema>;

export const idResponseSchema = z.object({
  id: z.string(),
});
export type IdResponseDto = z.infer<typeof idResponseSchema>;

export const okResponseSchema = z.object({
  ok: z.boolean(),
});
export type OkResponseDto = z.infer<typeof okResponseSchema>;

export const openLetterResponseSchema = z.object({
  ok: z.boolean(),
  view: openWhenViewSchema.optional(),
  reason: z.string().optional(),
});
export type OpenLetterResponseDto = z.infer<typeof openLetterResponseSchema>;

export const listSurprisesResponseSchema = z.object({
  partnerName: z.string(),
  items: z.array(surpriseViewSchema),
});
export type ListSurprisesResponseDto = z.infer<typeof listSurprisesResponseSchema>;

export const openWhenListSchema = z.array(openWhenViewSchema);

export const saveEventSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(100),
  kind: eventKindSchema,
  firstDate: z.string(),
  eventTime: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
  repeats: repeatSchema.default("none"),
  whose: z.enum(["me", "partner"]).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  reminders: z.array(z.string()).optional(),
  art: z.string().nullable().optional(),
});
export type SaveEventRequest = z.infer<typeof saveEventSchema>;

export const chapterReflectionSchema = z.object({
  relationshipId: z.uuid(),
  userId: z.uuid(),
  month: z.string(),
  promptId: z.string(),
  reflection: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ChapterReflectionDto = z.infer<typeof chapterReflectionSchema>;

export const chapterSummarySchema = z.object({
  month: z.string(),
  title: z.string(),
  reflectionCount: z.number().int().nonnegative(),
});
export type ChapterSummaryDto = z.infer<typeof chapterSummarySchema>;

export const reflectChapterSchema = z.object({
  reflection: z.string().min(1).max(2000),
});
export type ReflectChapterRequest = z.infer<typeof reflectChapterSchema>;

export const renameChapterSchema = z.object({
  title: z.string().min(1).max(100),
});
export type RenameChapterRequest = z.infer<typeof renameChapterSchema>;

// --- 4. Memories & Collections (U-16, §23) ---------------------------------------

export const memoryKindSchema = z.enum(["photo", "video", "voice", "text"]);
export type MemoryKindDto = z.infer<typeof memoryKindSchema>;

export const memorySchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  title: z.string(),
  story: z.string(),
  date: z.string(),
  place: z.string(),
  kind: memoryKindSchema,
  media: z.unknown().nullable().optional(),
  tags: z.array(z.string()),
  collections: z.array(z.object({ id: z.uuid(), title: z.string() })),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemoryDto = z.infer<typeof memorySchema>;

export const saveMemorySchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(100),
  story: z.string().max(5000).default(""),
  date: z.string(),
  place: z.string().max(100).default(""),
  kind: memoryKindSchema.default("text"),
  media: z.unknown().nullable().optional(),
  tags: z.array(z.string()).default([]),
  collectionIds: z.array(z.uuid()).default([]),
});
export type SaveMemoryRequest = z.infer<typeof saveMemorySchema>;

export const memoryCollectionSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  title: z.string(),
  description: z.string(),
  art: z.string(),
  count: z.number().int().nonnegative().optional(),
  createdAt: z.string(),
});
export type MemoryCollectionDto = z.infer<typeof memoryCollectionSchema>;

export const saveCollectionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  art: z.string().default("sparkles"),
});
export type SaveCollectionRequest = z.infer<typeof saveCollectionSchema>;

// --- 5. Together: Plans, Places, Songs (P-21, P-72) -----------------------------

export const planThemeSchema = z.enum(["date", "travel", "home", "project"]);
export type PlanThemeDto = z.infer<typeof planThemeSchema>;

export const planWhenSchema = z.object({
  kind: z.enum(["someday", "soon", "season", "date"]),
  detail: z.string().optional(),
});
export type PlanWhenDto = z.infer<typeof planWhenSchema>;

export const togetherPlanSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  title: z.string(),
  note: z.string(),
  theme: planThemeSchema,
  art: z.string().nullable().optional(),
  place: z.string(),
  when: planWhenSchema,
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TogetherPlanDto = z.infer<typeof togetherPlanSchema>;

export const savePlanSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(100),
  note: z.string().max(1000).default(""),
  theme: planThemeSchema.default("date"),
  art: z.string().nullable().optional(),
  place: z.string().max(100).default(""),
  when: planWhenSchema.default({ kind: "someday" }),
});
export type SavePlanRequest = z.infer<typeof savePlanSchema>;

export const togetherPlaceSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  name: z.string(),
  note: z.string(),
  art: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type TogetherPlaceDto = z.infer<typeof togetherPlaceSchema>;

export const savePlaceSchema = z.object({
  name: z.string().min(1).max(100),
  note: z.string().max(1000).default(""),
  art: z.string().nullable().optional(),
});
export type SavePlaceRequest = z.infer<typeof savePlaceSchema>;

export const togetherSongSchema = z.object({
  id: z.uuid(),
  authorId: z.uuid(),
  title: z.string(),
  artist: z.string(),
  link: z.string(),
  note: z.string(),
  createdAt: z.string(),
});
export type TogetherSongDto = z.infer<typeof togetherSongSchema>;

export const saveSongSchema = z.object({
  title: z.string().min(1).max(100),
  artist: z.string().max(100).default(""),
  link: z.url().max(1000),
  note: z.string().max(1000).default(""),
});
export type SaveSongRequest = z.infer<typeof saveSongSchema>;

export const memoryListSchema = z.array(memorySchema);
export const memoryCollectionListSchema = z.array(memoryCollectionSchema);
export const togetherPlanListSchema = z.array(togetherPlanSchema);
export const togetherPlaceListSchema = z.array(togetherPlaceSchema);
export const togetherSongListSchema = z.array(togetherSongSchema);
export const chapterSummaryListSchema = z.array(chapterSummarySchema);
