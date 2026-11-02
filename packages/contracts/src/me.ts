import { z } from "zod";

/**
 * `GET /v1/me`: who this session belongs to and their active relationship, if any. The user and
 * relationship come from the session only, never from the request (ADR-0004).
 */
export const meSchema = z.object({
  userId: z.uuid(),
  relationshipId: z.uuid().nullable(),
});
export type Me = z.infer<typeof meSchema>;
