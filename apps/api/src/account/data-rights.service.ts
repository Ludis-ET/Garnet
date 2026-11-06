import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { type ExportDataBundleDto, type ExportStatusDto } from "@garnet/contracts";
import { sanitizeExportData } from "@garnet/domain";
import { sql, type Kysely } from "kysely";
import type { Auth } from "../auth/auth";
import { isRecentSignIn } from "../auth/constants";
import { verifyPassword } from "../auth/password";
import { asViewer, AUTH, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

/**
 * Data rights service (B-100, B-101, B-120, P-37, P-80, U-20, U-23).
 *
 * Implements:
 * - Data export running strictly under RLS (asViewer), so partner's private drafts never leak.
 * - Re-authentication for sensitive actions.
 * - Space ending and account deletion per owner direction P-37.
 */
@Injectable()
export class DataRightsService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(AUTH) private readonly auth: Auth,
  ) {}

  private async assertRecentSignIn(viewer: Viewer): Promise<void> {
    const { internalAdapter } = await this.auth.$context;
    const sessions = await internalAdapter.listSessions(viewer.userId);
    const current = sessions.find((s) => s.id === viewer.sessionId);
    if (current === undefined || !isRecentSignIn(new Date(current.createdAt))) {
      throw new ApiProblem("recent_sign_in_required");
    }
  }

  async reauth(viewer: Viewer, password: string): Promise<void> {
    const { internalAdapter } = await this.auth.$context;
    const accounts = await internalAdapter.findAccounts(viewer.userId);
    const credAccount = accounts.find((a) => a.providerId === "credential" && a.password != null);
    if (credAccount?.password == null) {
      throw new ApiProblem("validation_failed", [{ path: ["password"], code: "wrong_password" }]);
    }

    const valid = await verifyPassword({ hash: credAccount.password, password });
    if (!valid) {
      throw new ApiProblem("validation_failed", [{ path: ["password"], code: "wrong_password" }]);
    }

    // Refresh session created_at to now so sensitive operations are allowed (P-80)
    await sql`update session set created_at = now(), updated_at = now() where id = ${viewer.sessionId}::uuid`.execute(
      this.db,
    );
  }

  async getExportStatus(viewer: Viewer): Promise<ExportStatusDto> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("export_job")
        .selectAll()
        .where("user_id", "=", viewer.userId)
        .orderBy("created_at", "desc")
        .executeTakeFirst();

      if (row === undefined || row.state === "none") {
        return {
          state: "none",
          readyAt: null,
          expiresAt: null,
          downloadUrl: null,
          sizeBytes: null,
        };
      }

      const now = new Date();
      const isExpired =
        row.state === "expired" || (row.expires_at !== null && row.expires_at < now);

      if (isExpired) {
        return {
          state: "expired",
          readyAt: row.ready_at ? row.ready_at.toISOString() : null,
          expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
          downloadUrl: null,
          sizeBytes: null,
        };
      }

      return {
        state: row.state,
        readyAt: row.ready_at ? row.ready_at.toISOString() : null,
        expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
        downloadUrl: row.download_token ? `/v1/me/export/download/${row.download_token}` : null,
        sizeBytes: row.file_size_bytes,
      };
    });
  }

  async prepareExport(viewer: Viewer): Promise<ExportStatusDto> {
    await this.assertRecentSignIn(viewer);

    return asViewer(this.db, viewer, async (trx) => {
      // 1. Fetch user profile and settings under RLS
      const profile = await trx
        .selectFrom("profile")
        .selectAll()
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const userSettings = await trx
        .selectFrom("user_settings")
        .select("doc")
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const accountRow = (await sql<{ email: string }>`select email from my_account()`.execute(trx))
        .rows[0];

      // 2. Query data models under RLS (partner's private drafts are filtered out by RLS)
      const daysEntries = await trx.selectFrom("entry").selectAll().execute();
      const chatMessages = await trx.selectFrom("chat_message").selectAll().execute();
      const openWhenLetters = await trx.selectFrom("open_when_letter").selectAll().execute();
      const openWhenContent = await trx
        .selectFrom("open_when_letter_content")
        .selectAll()
        .execute();
      const surprises = await trx.selectFrom("surprise").selectAll().execute();
      const memories = await trx.selectFrom("memory").selectAll().execute();
      const plans = await trx.selectFrom("together_plan").selectAll().execute();
      const places = await trx.selectFrom("together_place").selectAll().execute();
      const songs = await trx.selectFrom("together_song").selectAll().execute();
      const events = await trx.selectFrom("calendar_event").selectAll().execute();

      // 3. Attach letter content where permitted
      const lettersWithBody = openWhenLetters.map((l) => {
        const content = openWhenContent.find((c) => c.letter_id === l.id);
        return {
          id: l.id,
          authorId: l.author_id,
          recipientId: l.recipient_id,
          status: l.status,
          ...(content ? { body: content.body } : {}),
        };
      });

      // 4. Sanitize via domain guardrails (§5, §11)
      const sanitized = sanitizeExportData({
        requesterId: viewer.userId,
        days: daysEntries.map((d) => ({
          id: d.id,
          authorId: d.author_id,
          visibility: d.visibility as "private" | "shared",
          body: d.body,
        })),
        letters: lettersWithBody,
      });

      // 5. Build export bundle
      const bundle: ExportDataBundleDto = {
        version: 1,
        exportedAt: new Date().toISOString(),
        user: {
          id: viewer.userId,
          email: accountRow?.email ?? "",
          name: viewer.name,
        },
        profile: (profile as Record<string, unknown> | undefined) ?? null,
        settings: (userSettings?.doc as Record<string, unknown> | undefined) ?? null,
        days: sanitized.days as unknown as Record<string, unknown>[],
        chat: chatMessages,
        letters: sanitized.letters as unknown as Record<string, unknown>[],
        surprises,
        memories,
        together: {
          plans,
          places,
          songs,
        },
        events,
      };

      const payloadJson = JSON.stringify(bundle, null, 2);
      const downloadToken = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days (SET-13)
      const sizeBytes = Buffer.byteLength(payloadJson, "utf8");

      // Save job record
      await trx
        .insertInto("export_job")
        .values({
          id: randomUUID(),
          user_id: viewer.userId,
          relationship_id: null,
          state: "ready",
          download_token: downloadToken,
          ready_at: now,
          expires_at: expiresAt,
          file_size_bytes: sizeBytes,
          payload_json: payloadJson,
          created_at: now,
          updated_at: now,
        })
        .execute();

      return {
        state: "ready",
        readyAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        downloadUrl: `/v1/me/export/download/${downloadToken}`,
        sizeBytes,
      };
    });
  }

  async expireExport(viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx
        .updateTable("export_job")
        .set({ state: "expired", updated_at: new Date() })
        .where("user_id", "=", viewer.userId)
        .execute();
    });
  }

  async getExportDownload(token: string): Promise<string> {
    const row = await this.db
      .selectFrom("export_job")
      .selectAll()
      .where("download_token", "=", token)
      .executeTakeFirst();

    if (row?.payload_json == null) {
      throw new ApiProblem("not_found");
    }

    if (row.state === "expired" || (row.expires_at !== null && row.expires_at < new Date())) {
      throw new ApiProblem("not_found");
    }

    return row.payload_json;
  }

  async endSpace(viewer: Viewer, confirmWord: string): Promise<void> {
    if (confirmWord !== "END") {
      throw new ApiProblem("validation_failed", [{ path: ["confirmWord"], code: "invalid" }]);
    }
    await this.assertRecentSignIn(viewer);

    await this.db.transaction().execute(async (trx) => {
      // Find active relationship for this viewer
      const member = await trx
        .selectFrom("relationship_member")
        .selectAll()
        .where("user_id", "=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst();

      if (member === undefined) return;

      const now = new Date();

      // Mark member left
      await trx
        .updateTable("relationship_member")
        .set({ left_at: now })
        .where("user_id", "=", viewer.userId)
        .where("relationship_id", "=", member.relationship_id)
        .execute();

      // Mark relationship ended (P-37)
      await trx
        .updateTable("relationship")
        .set({
          ended_at: now,
          ended_by_user_id: viewer.userId,
          ended_reason: "user_ended_space",
        })
        .where("id", "=", member.relationship_id)
        .execute();

      // Direction P-37 default: remove departing partner's entries
      await trx
        .deleteFrom("entry")
        .where("relationship_id", "=", member.relationship_id)
        .where("author_id", "=", viewer.userId)
        .execute();
    });
  }

  async deleteAccount(viewer: Viewer, confirmWord: string): Promise<void> {
    if (confirmWord !== "DELETE") {
      throw new ApiProblem("validation_failed", [{ path: ["confirmWord"], code: "invalid" }]);
    }
    await this.assertRecentSignIn(viewer);

    await this.db.transaction().execute(async (trx) => {
      // 1. End any active relationship per P-37
      const member = await trx
        .selectFrom("relationship_member")
        .selectAll()
        .where("user_id", "=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst();

      if (member !== undefined) {
        const now = new Date();
        await trx
          .updateTable("relationship_member")
          .set({ left_at: now })
          .where("relationship_id", "=", member.relationship_id)
          .where("user_id", "=", viewer.userId)
          .execute();

        await trx
          .updateTable("relationship")
          .set({
            ended_at: now,
            ended_by_user_id: viewer.userId,
            ended_reason: "account_deleted",
          })
          .where("id", "=", member.relationship_id)
          .execute();

        // Direction P-37: remove departing partner's entries
        await trx
          .deleteFrom("entry")
          .where("relationship_id", "=", member.relationship_id)
          .where("author_id", "=", viewer.userId)
          .execute();
      }

      // 2. Delete private drafts and records
      await trx.deleteFrom("entry").where("author_id", "=", viewer.userId).execute();
      await trx.deleteFrom("profile").where("user_id", "=", viewer.userId).execute();
      await trx.deleteFrom("user_settings").where("user_id", "=", viewer.userId).execute();
      await trx.deleteFrom("push_device").where("user_id", "=", viewer.userId).execute();
      await trx.deleteFrom("export_job").where("user_id", "=", viewer.userId).execute();

      // 3. Revoke all sessions (U-27)
      await trx.deleteFrom("session").where("user_id", "=", viewer.userId).execute();

      // 4. Delete account credentials and app_user
      await trx.deleteFrom("account").where("user_id", "=", viewer.userId).execute();
      await trx.deleteFrom("app_user").where("id", "=", viewer.userId).execute();
    });
  }
}
