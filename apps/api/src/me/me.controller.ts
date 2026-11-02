import { Controller, Get, Inject } from "@nestjs/common";
import type { Me } from "@garnet/contracts";
import type { Kysely } from "kysely";
import { CurrentViewer } from "../auth/session.guard";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";

/**
 * `GET /v1/me`: who the session belongs to and their active relationship. The first
 * relationship-scoped read, under RLS: the query names no user, the database supplies it.
 */
@Controller("v1/me")
export class MeController {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  @Get()
  async me(@CurrentViewer() viewer: Viewer): Promise<Me> {
    const membership = await asViewer(this.db, viewer, (trx) =>
      trx
        .selectFrom("relationship_member")
        .select("relationship_id")
        .where("user_id", "=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst(),
    );
    return { userId: viewer.userId, relationshipId: membership?.relationship_id ?? null };
  }
}
