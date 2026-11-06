import { z } from "zod";

export const searchKindSchema = z.enum(["message", "moment", "letter", "memory", "event"]);
export type SearchKindDto = z.infer<typeof searchKindSchema>;

export const searchWhoSchema = z.enum(["both", "me", "partner"]);
export type SearchWhoDto = z.infer<typeof searchWhoSchema>;

export const searchQueryRequestSchema = z.object({
  q: z.string().trim().min(1).max(200),
  kinds: z.array(searchKindSchema).optional(),
  who: searchWhoSchema.optional().default("both"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  cursor: z.string().optional(),
});
export type SearchQueryRequest = z.infer<typeof searchQueryRequestSchema>;

export const searchResultItemSchema = z.object({
  id: z.uuid(),
  kind: searchKindSchema,
  title: z.string(),
  snippet: z.string().nullable(),
  at: z.string(),
  mine: z.boolean(),
  sealed: z.boolean(),
  href: z.string(),
});
export type SearchResultItemDto = z.infer<typeof searchResultItemSchema>;

export const searchQueryResponseSchema = z.object({
  results: z.array(searchResultItemSchema),
  nextCursor: z.string().nullable(),
  totalEstimated: z.number().int().nonnegative(),
});
export type SearchQueryResponse = z.infer<typeof searchQueryResponseSchema>;
