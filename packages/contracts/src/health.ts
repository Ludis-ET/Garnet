import { z } from "zod";

/** `GET /v1/health` (public): whether the API and its database are answering. Nothing else. */
export const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "unavailable"]),
});
export type Health = z.infer<typeof healthSchema>;
