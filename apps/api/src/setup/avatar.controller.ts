import { Body, Controller, Delete, Get, HttpCode, Inject, Put, Res } from "@nestjs/common";
import { uploadAvatarSchema, type AvatarDto } from "@garnet/contracts";
import type { FastifyReply } from "fastify";
import { sql, type Kysely } from "kysely";
import { CurrentViewer } from "../auth/session.guard";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { parseBody } from "../http/body";
import { OBJECT_STORAGE, type ObjectStorage } from "../media/storage/object-storage";
import { AVATAR_BUCKET, avatarKey, avatarOf, saveAvatar, sniffImage } from "./avatar";
import { ensureProfile } from "./profiles";

/**
 * Profile pictures (P-98):
 * - `PUT /v1/me/avatar` stores a small picture the phone resized, checked by its bytes;
 * - `DELETE /v1/me/avatar` goes back to initials and removes the file;
 * - `GET /v1/me/avatar` and `GET /v1/partner/avatar` give the file to its owner and their
 *   partner only. Anyone else, or no picture, is the same 404.
 */
@Controller()
export class AvatarController {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  @Put("v1/me/avatar")
  @HttpCode(200)
  async upload(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<{ avatar: AvatarDto }> {
    const input = parseBody(uploadAvatarSchema, body);
    const bytes = Buffer.from(input.data, "base64");
    const type = sniffImage(bytes);
    if (type === null || type !== input.contentType)
      throw new ApiProblem("validation_failed", [{ path: ["data"], code: "not_an_image" }]);
    await asViewer(this.db, viewer, (trx) => ensureProfile(trx, viewer));
    const avatar = await saveAvatar(this.storage, viewer, bytes, type, (fn) =>
      asViewer(this.db, viewer, fn),
    );
    return { avatar };
  }

  @Delete("v1/me/avatar")
  @HttpCode(204)
  async remove(@CurrentViewer() viewer: Viewer): Promise<void> {
    const before = await asViewer(this.db, viewer, async (trx) => {
      await ensureProfile(trx, viewer);
      const row = await trx
        .selectFrom("profile")
        .select("avatar")
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();
      await trx
        .updateTable("profile")
        .set({
          avatar: JSON.stringify({ kind: "initials", swatch: 0 }),
          updated_at: sql<Date>`now()`,
        })
        .where("user_id", "=", viewer.userId)
        .execute();
      return avatarOf(row?.avatar);
    });
    if (before.kind === "image")
      await this.storage
        .deleteObject(AVATAR_BUCKET, avatarKey(viewer.userId, before.version))
        .catch(() => undefined);
  }

  @Get("v1/me/avatar")
  async mine(
    @CurrentViewer() viewer: Viewer,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Buffer> {
    const avatar = await asViewer(this.db, viewer, async (trx) =>
      avatarOf(
        (
          await trx
            .selectFrom("profile")
            .select("avatar")
            .where("user_id", "=", viewer.userId)
            .executeTakeFirst()
        )?.avatar,
      ),
    );
    return this.#send(reply, viewer.userId, avatar);
  }

  @Get("v1/partner/avatar")
  async partner(
    @CurrentViewer() viewer: Viewer,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Buffer> {
    const found = await asViewer(this.db, viewer, async (trx) => {
      const r = await sql<{ id: string | null; avatar: unknown }>`
        select partner_id() as id, partner_avatar() as avatar`.execute(trx);
      return r.rows[0];
    });
    if (found?.id == null) throw new ApiProblem("not_found");
    return this.#send(reply, found.id, avatarOf(found.avatar));
  }

  async #send(reply: FastifyReply, ownerId: string, avatar: AvatarDto): Promise<Buffer> {
    if (avatar.kind !== "image") throw new ApiProblem("not_found");
    const bytes = await this.storage
      .readObject(AVATAR_BUCKET, avatarKey(ownerId, avatar.version))
      .catch(() => null);
    const type = bytes === null ? null : sniffImage(bytes);
    if (bytes === null || type === null) throw new ApiProblem("not_found");
    // Each version is its own address (?v=…), so the phone may keep it; nobody else may.
    void reply
      .type(type)
      .header("cache-control", "private, max-age=31536000, immutable")
      .header("content-security-policy", "default-src 'none'; sandbox");
    return bytes;
  }
}
