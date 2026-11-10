import { Inject, Injectable } from "@nestjs/common";
import { NotificationsService } from "../notifications/notifications.service";
import { randomUUID } from "node:crypto";
import {
  openWhenDraftViewSchema,
  openWhenOpenedViewSchema,
  openWhenSealedViewSchema,
  type CreateLetterDraftRequest,
  type LetterStyleDto,
  type OpenWhenViewDto,
  type SaveLetterDraftRequest,
  type UnlockRuleDto,
} from "@garnet/contracts";
import { isLetterUnlockable } from "@garnet/domain";
import { Temporal } from "temporal-polyfill";
import type { Kysely, Transaction } from "kysely";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";

@Injectable()
export class OpenWhenService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private async requireRelationshipAndPartner(
    trx: Transaction<Database>,
    userId: string,
  ): Promise<{ relationshipId: string; partnerId: string }> {
    const member = await trx
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!member) throw new ApiProblem("not_found");

    const partner = await trx
      .selectFrom("relationship_member")
      .select("user_id")
      .where("relationship_id", "=", member.relationship_id)
      .where("user_id", "!=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!partner) throw new ApiProblem("not_found");

    return { relationshipId: member.relationship_id, partnerId: partner.user_id };
  }

  private async getWithTrx(
    trx: Transaction<Database>,
    id: string,
    viewerId: string,
  ): Promise<OpenWhenViewDto> {
    const row = await trx
      .selectFrom("open_when_letter")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) throw new ApiProblem("not_found");

    if (row.status === "draft") {
      if (row.author_id !== viewerId) throw new ApiProblem("not_found");
      const content = await trx
        .selectFrom("open_when_letter_content")
        .selectAll()
        .where("letter_id", "=", row.id)
        .executeTakeFirst();

      return openWhenDraftViewSchema.parse({
        id: row.id,
        status: "draft",
        authorId: row.author_id,
        recipientId: row.recipient_id,
        prompt: row.prompt,
        body: content?.body ?? "",
        paper: (content?.paper as LetterStyleDto | null) ?? undefined,
        mediaRefs: (content?.media_refs as string[] | null) ?? undefined,
        createdAt: row.created_at.toISOString(),
      });
    }

    if (row.status === "sealed") {
      // B-90 / U-34: No body query, sealed view
      return openWhenSealedViewSchema.parse({
        id: row.id,
        status: "sealed",
        authorId: row.author_id,
        recipientId: row.recipient_id,
        prompt: row.prompt,
        sealedAt: row.sealed_at?.toISOString() ?? new Date().toISOString(),
        unlockRule: row.unlock_rule as UnlockRuleDto,
        createdAt: row.created_at.toISOString(),
      });
    }

    const content = await trx
      .selectFrom("open_when_letter_content")
      .selectAll()
      .where("letter_id", "=", row.id)
      .executeTakeFirst();

    return openWhenOpenedViewSchema.parse({
      id: row.id,
      status: "opened",
      authorId: row.author_id,
      recipientId: row.recipient_id,
      prompt: row.prompt,
      body: content?.body ?? "",
      paper: (content?.paper as LetterStyleDto | null) ?? undefined,
      mediaRefs: (content?.media_refs as string[] | null) ?? undefined,
      sealedAt: row.sealed_at?.toISOString() ?? new Date().toISOString(),
      openedAt: row.opened_at?.toISOString() ?? new Date().toISOString(),
      unlockRule: row.unlock_rule as UnlockRuleDto,
      createdAt: row.created_at.toISOString(),
    });
  }

  async list(viewer: Viewer): Promise<OpenWhenViewDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId } = await this.requireRelationshipAndPartner(trx, viewer.userId);

      const rows = await trx
        .selectFrom("open_when_letter")
        .selectAll()
        .where("relationship_id", "=", relationshipId)
        .orderBy("created_at", "desc")
        .execute();

      const views: OpenWhenViewDto[] = [];
      for (const row of rows) {
        if (row.status === "draft") {
          // Author only (RLS enforces this too)
          if (row.author_id !== viewer.userId) continue;
          const content = await trx
            .selectFrom("open_when_letter_content")
            .selectAll()
            .where("letter_id", "=", row.id)
            .executeTakeFirst();

          views.push(
            openWhenDraftViewSchema.parse({
              id: row.id,
              status: "draft",
              authorId: row.author_id,
              recipientId: row.recipient_id,
              prompt: row.prompt,
              body: content?.body ?? "",
              paper: (content?.paper as LetterStyleDto | null) ?? undefined,
              mediaRefs: (content?.media_refs as string[] | null) ?? undefined,
              createdAt: row.created_at.toISOString(),
            }),
          );
        } else if (row.status === "sealed") {
          // B-90 / U-34: No body query, no body in sealed view
          views.push(
            openWhenSealedViewSchema.parse({
              id: row.id,
              status: "sealed",
              authorId: row.author_id,
              recipientId: row.recipient_id,
              prompt: row.prompt,
              sealedAt: row.sealed_at?.toISOString() ?? new Date().toISOString(),
              unlockRule: row.unlock_rule as UnlockRuleDto,
              createdAt: row.created_at.toISOString(),
            }),
          );
        } else {
          // row.status === "opened"
          const content = await trx
            .selectFrom("open_when_letter_content")
            .selectAll()
            .where("letter_id", "=", row.id)
            .executeTakeFirst();

          views.push(
            openWhenOpenedViewSchema.parse({
              id: row.id,
              status: "opened",
              authorId: row.author_id,
              recipientId: row.recipient_id,
              prompt: row.prompt,
              body: content?.body ?? "",
              paper: (content?.paper as LetterStyleDto | null) ?? undefined,
              mediaRefs: (content?.media_refs as string[] | null) ?? undefined,
              sealedAt: row.sealed_at?.toISOString() ?? new Date().toISOString(),
              openedAt: row.opened_at?.toISOString() ?? new Date().toISOString(),
              unlockRule: row.unlock_rule as UnlockRuleDto,
              createdAt: row.created_at.toISOString(),
            }),
          );
        }
      }

      return views;
    });
  }

  async get(id: string, viewer: Viewer): Promise<OpenWhenViewDto> {
    return asViewer(this.db, viewer, (trx) => this.getWithTrx(trx, id, viewer.userId));
  }

  async createDraft(input: CreateLetterDraftRequest, viewer: Viewer): Promise<OpenWhenViewDto> {
    return asViewer(this.db, viewer, async (trx) => {
      const { relationshipId, partnerId } = await this.requireRelationshipAndPartner(
        trx,
        viewer.userId,
      );
      const letterId = randomUUID();

      await trx
        .insertInto("open_when_letter")
        .values({
          id: letterId,
          relationship_id: relationshipId,
          author_id: viewer.userId,
          recipient_id: partnerId,
          prompt: input.prompt,
          status: "draft",
          sealed_at: null,
          opened_at: null,
          unlock_rule: JSON.stringify(input.unlockRule ?? { type: "manual" }),
          created_at: new Date(),
        })
        .execute();

      await trx
        .insertInto("open_when_letter_content")
        .values({
          letter_id: letterId,
          body: input.body,
          paper: input.paper ? JSON.stringify(input.paper) : null,
          media_refs: input.mediaRefs ? JSON.stringify(input.mediaRefs) : null,
        })
        .execute();

      return openWhenDraftViewSchema.parse({
        id: letterId,
        status: "draft",
        authorId: viewer.userId,
        recipientId: partnerId,
        prompt: input.prompt,
        body: input.body,
        paper: input.paper,
        mediaRefs: input.mediaRefs,
        createdAt: new Date().toISOString(),
      });
    });
  }

  async saveDraft(
    id: string,
    patch: SaveLetterDraftRequest,
    viewer: Viewer,
  ): Promise<OpenWhenViewDto> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("open_when_letter")
        .selectAll()
        .where("id", "=", id)
        .where("author_id", "=", viewer.userId)
        .where("status", "=", "draft")
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      const letterUpdates: { prompt?: string; unlock_rule?: string } = {};
      if (patch.prompt !== undefined) letterUpdates.prompt = patch.prompt;
      if (patch.unlockRule !== undefined) {
        letterUpdates.unlock_rule = JSON.stringify(patch.unlockRule);
      }
      if (Object.keys(letterUpdates).length > 0) {
        await trx.updateTable("open_when_letter").set(letterUpdates).where("id", "=", id).execute();
      }

      const contentUpdates: { body?: string; paper?: string | null; media_refs?: string | null } =
        {};
      if (patch.body !== undefined) contentUpdates.body = patch.body;
      if (patch.paper !== undefined) {
        contentUpdates.paper = JSON.stringify(patch.paper);
      }
      if (patch.mediaRefs !== undefined) {
        contentUpdates.media_refs = JSON.stringify(patch.mediaRefs);
      }
      if (Object.keys(contentUpdates).length > 0) {
        await trx
          .updateTable("open_when_letter_content")
          .set(contentUpdates)
          .where("letter_id", "=", id)
          .execute();
      }

      return this.getWithTrx(trx, id, viewer.userId);
    });
  }

  async seal(id: string, unlockRule: UnlockRuleDto, viewer: Viewer): Promise<OpenWhenViewDto> {
    const view = await this.#seal(id, unlockRule, viewer);
    // P-102: the recipient learns a letter is waiting; nothing of what it says.
    await this.notifications
      .sendNotification({
        relationshipId: view.relationshipId,
        recipientUserId: view.recipientId,
        senderUserId: viewer.userId,
        category: "open-when",
        group: "letters",
        href: `/moments/open-when/${id}`,
        context: { senderName: viewer.name },
      })
      .catch(() => undefined);
    return view.dto;
  }

  async #seal(
    id: string,
    unlockRule: UnlockRuleDto,
    viewer: Viewer,
  ): Promise<{ dto: OpenWhenViewDto; relationshipId: string; recipientId: string }> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("open_when_letter")
        .selectAll()
        .where("id", "=", id)
        .where("author_id", "=", viewer.userId)
        .where("status", "=", "draft")
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      const now = new Date();
      await trx
        .updateTable("open_when_letter")
        .set({
          status: "sealed",
          sealed_at: now,
          unlock_rule: JSON.stringify(unlockRule),
        })
        .where("id", "=", id)
        .execute();

      const dto = openWhenSealedViewSchema.parse({
        id: row.id,
        status: "sealed",
        authorId: row.author_id,
        recipientId: row.recipient_id,
        prompt: row.prompt,
        sealedAt: now.toISOString(),
        unlockRule,
        createdAt: row.created_at.toISOString(),
      });
      return { dto, relationshipId: row.relationship_id, recipientId: row.recipient_id };
    });
  }

  async open(
    id: string,
    viewer: Viewer,
  ): Promise<{ ok: true; view: OpenWhenViewDto } | { ok: false; reason: "locked" | "not_found" }> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("open_when_letter")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) return { ok: false, reason: "not_found" };

      // Already opened: return view
      if (row.status === "opened") {
        const view = await this.getWithTrx(trx, id, viewer.userId);
        return { ok: true, view };
      }

      if (row.status !== "sealed") {
        return { ok: false, reason: "locked" };
      }

      // Only recipient can open the letter
      if (row.recipient_id !== viewer.userId) {
        return { ok: false, reason: "locked" };
      }

      // Check unlock eligibility
      const unlockRule = (
        typeof row.unlock_rule === "string" ? JSON.parse(row.unlock_rule) : row.unlock_rule
      ) as UnlockRuleDto;
      const todayIso = Temporal.Now.plainDateISO().toString();
      if (!isLetterUnlockable(unlockRule, todayIso)) {
        return { ok: false, reason: "locked" };
      }

      const now = new Date();
      await trx
        .updateTable("open_when_letter")
        .set({
          status: "opened",
          opened_at: now,
        })
        .where("id", "=", id)
        .execute();

      const view = await this.getWithTrx(trx, id, viewer.userId);
      return { ok: true, view };
    });
  }

  async delete(id: string, viewer: Viewer): Promise<{ ok: boolean }> {
    return asViewer(this.db, viewer, async (trx) => {
      const row = await trx
        .selectFrom("open_when_letter")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) throw new ApiProblem("not_found");

      // Author can delete draft; either member can delete sealed or opened (U-31)
      if (row.status === "draft" && row.author_id !== viewer.userId) {
        throw new ApiProblem("not_found");
      }

      await trx.deleteFrom("open_when_letter").where("id", "=", id).execute();

      return { ok: true };
    });
  }
}
