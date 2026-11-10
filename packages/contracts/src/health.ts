import { z } from "zod";

/** `GET /v1/health` (public): whether the API and its database are answering. Nothing else. */
export const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "unavailable"]),
  /**
   * Email (P-96), once the mail server has been tried: "failing" with its error code (EAUTH 535
   * is a wrong mailbox password; ECONNECTION or ETIMEDOUT, the server can't be reached). Never
   * changes `status`: the API works without mail.
   */
  mail: z
    .object({ state: z.enum(["ok", "failing"]), error: z.string().max(64).nullable() })
    .optional(),
});
export type Health = z.infer<typeof healthSchema>;
