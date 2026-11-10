import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { Health } from "@garnet/contracts";
import type { FastifyReply } from "fastify";
import { sql, type Kysely } from "kysely";
import { Public } from "../auth/session.guard";
import { KYSELY, type Database } from "../db/database";
import { mailStatus } from "../mail/status";

/** How long health waits for the database before calling it unavailable. */
const DB_TIMEOUT_MS = 2000;

/** `GET /v1/health` or `GET /health` (public): the API is up, and whether its database answers. */
@Controller(["v1/health", "health"])
export class HealthController {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  @Public()
  @Get()
  async health(@Res({ passthrough: true }) reply: FastifyReply): Promise<Health> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ok = await Promise.race([
      sql`select 1`.execute(this.db).then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(resolve, DB_TIMEOUT_MS, false);
      }),
    ]).finally(() => {
      clearTimeout(timer);
    });
    if (!ok) void reply.status(503);
    const mail = mailStatus();
    return {
      ...(ok
        ? { status: "ok" as const, database: "ok" as const }
        : { status: "degraded" as const, database: "unavailable" as const }),
      ...(mail === null ? {} : { mail }),
    };
  }
}
