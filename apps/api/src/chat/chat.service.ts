import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  readSettings,
  sideSchema,
  type ChatMediaDto,
  type ChatMessageDto,
  type ChatPresenceResponse,
  type ChatReactionDto,
  type ChatReplyPreviewDto,
  type ChatSettingsResponse,
  type ChatStickerDto,
  type ConversationSummaryResponse,
  type DeleteMessageRequest,
  type EditMessageRequest,
  type HomePersonDto,
  type SendMessageRequest,
  type UpdateChatSettingsRequest,
} from "@garnet/contracts";
import { sql, type Kysely, type SqlBool, type Transaction } from "kysely";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { ApiProblem } from "../errors/problem";
import { ChatEventsService } from "./chat-events.service";
import { NotificationsService } from "../notifications/notifications.service";

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes (A13)

@Injectable()
export class ChatService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(ChatEventsService) private readonly events: ChatEventsService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private async requireRelationshipId(trx: Transaction<Database>, userId: string): Promise<string> {
    const member = await trx
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();
    if (!member) throw new ApiProblem("not_found");
    return member.relationship_id;
  }

  private async getPartnerInfo(
    trx: Transaction<Database>,
    userId: string,
    relationshipId: string,
  ): Promise<{ partnerId: string | null; partnerPerson: HomePersonDto }> {
    const partnerMember = await trx
      .selectFrom("relationship_member")
      .select("user_id")
      .where("relationship_id", "=", relationshipId)
      .where("user_id", "!=", userId)
      .where("left_at", "is", null)
      .executeTakeFirst();

    const partnerRaw = (
      await sql<{
        name: string;
        side: string | null;
        time_zone: string | null;
        home_city: string | null;
      }>`select name, side, time_zone, home_city from partner_profile()`.execute(trx)
    ).rows[0];

    const sideParsed = sideSchema.safeParse(partnerRaw?.side ?? null);
    const partnerPerson: HomePersonDto = {
      name: partnerRaw?.name ?? "Partner",
      side: sideParsed.success ? sideParsed.data : "sapphire",
      zone: partnerRaw?.time_zone ?? "UTC",
    };

    return { partnerId: partnerMember?.user_id ?? null, partnerPerson };
  }

  private async loadMessagesWithDetails(
    trx: Transaction<Database>,
    relationshipId: string,
    viewerId: string,
    filter?: {
      messageId?: string;
      pinnedOnly?: boolean;
      mediaOnly?: boolean;
      query?: string;
    },
  ): Promise<ChatMessageDto[]> {
    let query = trx
      .selectFrom("chat_message as m")
      .leftJoin("chat_message_visibility as v", (join) =>
        join.onRef("v.message_id", "=", "m.id").on("v.user_id", "=", viewerId),
      )
      .select([
        "m.id",
        "m.sender_id",
        "m.text",
        "m.media",
        "m.sticker",
        "m.reply_to_id",
        "m.created_at",
        "m.edited_at",
        "m.deleted_for_everyone",
        "v.deleted_for_me",
        "v.saved_as_memory",
      ])
      .where("m.relationship_id", "=", relationshipId)
      .where((eb) =>
        eb.or([eb("v.deleted_for_me", "is", null), eb("v.deleted_for_me", "=", false)]),
      );

    if (filter?.messageId) {
      query = query.where("m.id", "=", filter.messageId);
    }
    if (filter?.mediaOnly) {
      query = query.where("m.media", "is not", null).where("m.deleted_for_everyone", "=", false);
    }
    if (filter?.query) {
      const q = `%${filter.query.trim().toLowerCase()}%`;
      query = query.where(
        sql<SqlBool>`lower(m.text) like ${q} or lower(coalesce(m.media->>'caption', '')) like ${q}`,
      );
    }

    const rows = await query.orderBy("m.created_at", "asc").execute();
    if (rows.length === 0) return [];

    const messageIds = rows.map((r) => r.id);

    // Load reactions
    const reactionRows = await trx
      .selectFrom("chat_reaction")
      .select(["message_id", "user_id", "emoji"])
      .where("message_id", "in", messageIds)
      .execute();

    // Group reactions per message
    const reactionsByMessage = new Map<string, ChatReactionDto[]>();
    for (const r of reactionRows) {
      let list = reactionsByMessage.get(r.message_id);
      if (!list) {
        list = [];
        reactionsByMessage.set(r.message_id, list);
      }
      const existing = list.find((item) => item.emoji === r.emoji);
      if (existing) {
        existing.count += 1;
        if (r.user_id === viewerId) existing.reactedByMe = true;
      } else {
        list.push({
          emoji: r.emoji,
          count: 1,
          reactedByMe: r.user_id === viewerId,
        });
      }
    }

    // Load pins
    const pinRows = await trx
      .selectFrom("chat_pin")
      .select(["message_id", "pinned_at"])
      .where("relationship_id", "=", relationshipId)
      .where("message_id", "in", messageIds)
      .execute();
    const pinMap = new Map(pinRows.map((p) => [p.message_id, p.pinned_at]));

    // Load reply previews
    const replyIds = rows.map((r) => r.reply_to_id).filter((id): id is string => Boolean(id));
    const replyMap = new Map<string, ChatReplyPreviewDto>();
    if (replyIds.length > 0) {
      const replyMsgs = await trx
        .selectFrom("chat_message as rm")
        .leftJoin("profile as p", "p.user_id", "rm.sender_id")
        .select(["rm.id", "rm.sender_id", "rm.text", "rm.media", "p.display_name"])
        .where("rm.id", "in", replyIds)
        .execute();

      for (const rm of replyMsgs) {
        const mediaObj = rm.media as {
          type?: "photo" | "video" | "voice";
          caption?: string;
        } | null;
        replyMap.set(rm.id, {
          id: rm.id,
          senderId: rm.sender_id,
          senderName: rm.sender_id === viewerId ? "You" : (rm.display_name ?? "Partner"),
          text: rm.text ? rm.text : (mediaObj?.caption ?? "Media"),
          ...(mediaObj?.type ? { mediaType: mediaObj.type } : {}),
        });
      }
    }

    let results = rows.map((r): ChatMessageDto => {
      const pinnedAt = pinMap.get(r.id);
      const isPinned = Boolean(pinnedAt);
      const reactions = reactionsByMessage.get(r.id) ?? [];
      const replyTo = r.reply_to_id ? (replyMap.get(r.reply_to_id) ?? null) : null;

      const media = r.media as ChatMediaDto | undefined;
      const sticker = r.sticker as ChatStickerDto | undefined;

      return {
        id: r.id,
        senderId: r.sender_id,
        text: r.text,
        createdAt: r.created_at.toISOString(),
        editedAt: r.edited_at?.toISOString() ?? null,
        status: "sent",
        pinned: isPinned,
        pinnedAt: pinnedAt ? pinnedAt.toISOString() : null,
        replyTo,
        reactions,
        ...(media ? { media } : {}),
        ...(r.deleted_for_me ? { deletedForMe: true } : {}),
        ...(r.deleted_for_everyone ? { deletedForEveryone: true } : {}),
        ...(sticker ? { sticker } : {}),
        ...(r.saved_as_memory ? { savedAsMemory: true } : {}),
      };
    });

    if (filter?.pinnedOnly) {
      results = results.filter((m) => m.pinned && !m.deletedForEveryone);
    }

    return results;
  }

  async getSummary(viewer: Viewer): Promise<ConversationSummaryResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const { partnerId, partnerPerson } = await this.getPartnerInfo(
        trx,
        viewer.userId,
        relationshipId,
      );

      const allVisible = await this.loadMessagesWithDetails(trx, relationshipId, viewer.userId);
      const lastMessage = allVisible[allVisible.length - 1] ?? null;

      // Unread count: messages sent by partner after viewer's read_up_to
      const viewerState = await trx
        .selectFrom("chat_participant_state")
        .select("read_up_to")
        .where("relationship_id", "=", relationshipId)
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const readUpTo = viewerState?.read_up_to ?? null;
      const unreadCount = partnerId
        ? allVisible.filter(
            (m) =>
              m.senderId === partnerId &&
              !m.deletedForEveryone &&
              (readUpTo === null || new Date(m.createdAt).getTime() > readUpTo.getTime()),
          ).length
        : 0;

      const pinnedCount = allVisible.filter((m) => m.pinned && !m.deletedForEveryone).length;
      const mediaCount = allVisible.filter((m) => Boolean(m.media) && !m.deletedForEveryone).length;

      return {
        viewerId: viewer.userId,
        partner: partnerPerson,
        lastMessage,
        unreadCount,
        pinnedCount,
        mediaCount,
      };
    });
  }

  async getMessages(viewer: Viewer): Promise<ChatMessageDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      return this.loadMessagesWithDetails(trx, relationshipId, viewer.userId);
    });
  }

  async sendMessage(viewer: Viewer, req: SendMessageRequest): Promise<ChatMessageDto> {
    const { relationshipId, message, partnerId } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const { partnerId } = await this.getPartnerInfo(trx, viewer.userId, relationshipId);
      const id = req.id ?? randomUUID();
      const now = new Date();

      await trx
        .insertInto("chat_message")
        .values({
          id,
          relationship_id: relationshipId,
          sender_id: viewer.userId,
          text: req.text,
          media: req.media ? JSON.stringify(req.media) : null,
          sticker: req.sticker ? JSON.stringify(req.sticker) : null,
          reply_to_id: req.replyToId ?? null,
          created_at: now,
          edited_at: null,
          deleted_for_everyone: false,
          deleted_for_everyone_at: null,
        })
        .execute();

      const msgs = await this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, {
        messageId: id,
      });
      const message = msgs[0];
      if (!message) throw new ApiProblem("internal");
      return { relationshipId, message, partnerId };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "message_received",
      payload: message,
    });

    if (partnerId) {
      await this.notifications.sendNotification({
        relationshipId,
        recipientUserId: partnerId,
        senderUserId: viewer.userId,
        category: "chat-message",
        group: "messages",
        href: "/us/chat",
        context: { senderName: viewer.name },
      });
    }

    return message;
  }

  async editMessage(viewer: Viewer, id: string, req: EditMessageRequest): Promise<ChatMessageDto> {
    const { relationshipId, message } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const existing = await trx
        .selectFrom("chat_message")
        .select(["sender_id", "created_at", "deleted_for_everyone"])
        .where("id", "=", id)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();

      if (!existing) throw new ApiProblem("not_found");
      if (existing.sender_id !== viewer.userId) throw new ApiProblem("not_found");
      if (existing.deleted_for_everyone) throw new ApiProblem("bad_request");

      // Verify 15-minute edit window
      const elapsed = Date.now() - existing.created_at.getTime();
      if (elapsed > EDIT_WINDOW_MS) {
        throw new ApiProblem("validation_failed");
      }

      const now = new Date();
      await trx
        .updateTable("chat_message")
        .set({
          text: req.text,
          edited_at: now,
        })
        .where("id", "=", id)
        .execute();

      const msgs = await this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, {
        messageId: id,
      });
      const message = msgs[0];
      if (!message) throw new ApiProblem("internal");
      return { relationshipId, message };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "message_edited",
      payload: message,
    });

    return message;
  }

  async deleteMessage(viewer: Viewer, id: string, req: DeleteMessageRequest): Promise<void> {
    const { relationshipId } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const existing = await trx
        .selectFrom("chat_message")
        .select(["sender_id"])
        .where("id", "=", id)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();

      if (!existing) throw new ApiProblem("not_found");

      if (req.mode === "for-me") {
        await sql`
          insert into chat_message_visibility (message_id, user_id, deleted_for_me)
          values (${id}, ${viewer.userId}, true)
          on conflict (message_id, user_id)
          do update set deleted_for_me = true
        `.execute(trx);
      } else {
        // for-everyone: sender only
        if (existing.sender_id !== viewer.userId) throw new ApiProblem("not_found");

        const now = new Date();
        await trx
          .updateTable("chat_message")
          .set({
            deleted_for_everyone: true,
            deleted_for_everyone_at: now,
            text: "This message was removed.",
            media: null,
          })
          .where("id", "=", id)
          .execute();

        // Clear reactions on deleted-for-everyone message
        await trx.deleteFrom("chat_reaction").where("message_id", "=", id).execute();
      }

      return { relationshipId };
    });

    if (req.mode === "for-everyone") {
      this.events.emit({
        relationshipId,
        senderId: viewer.userId,
        type: "message_deleted",
        payload: { id, mode: "for-everyone" },
      });
    }
  }

  async toggleReaction(viewer: Viewer, messageId: string, emoji: string): Promise<ChatMessageDto> {
    const { relationshipId, message } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const msg = await trx
        .selectFrom("chat_message")
        .select("id")
        .where("id", "=", messageId)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();
      if (!msg) throw new ApiProblem("not_found");

      const existing = await trx
        .selectFrom("chat_reaction")
        .select("id")
        .where("message_id", "=", messageId)
        .where("user_id", "=", viewer.userId)
        .where("emoji", "=", emoji)
        .executeTakeFirst();

      if (existing) {
        await trx.deleteFrom("chat_reaction").where("id", "=", existing.id).execute();
      } else {
        await trx
          .insertInto("chat_reaction")
          .values({
            id: randomUUID(),
            message_id: messageId,
            user_id: viewer.userId,
            emoji,
            created_at: new Date(),
          })
          .execute();
      }

      const msgs = await this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, {
        messageId,
      });
      const message = msgs[0];
      if (!message) throw new ApiProblem("internal");
      return { relationshipId, message };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "reaction_updated",
      payload: message,
    });

    return message;
  }

  async togglePin(viewer: Viewer, messageId: string): Promise<ChatMessageDto> {
    const { relationshipId, message } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const msg = await trx
        .selectFrom("chat_message")
        .select("id")
        .where("id", "=", messageId)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();
      if (!msg) throw new ApiProblem("not_found");

      const existing = await trx
        .selectFrom("chat_pin")
        .select("pinned_at")
        .where("relationship_id", "=", relationshipId)
        .where("message_id", "=", messageId)
        .executeTakeFirst();

      if (existing) {
        await trx
          .deleteFrom("chat_pin")
          .where("relationship_id", "=", relationshipId)
          .where("message_id", "=", messageId)
          .execute();
      } else {
        await trx
          .insertInto("chat_pin")
          .values({
            relationship_id: relationshipId,
            message_id: messageId,
            pinned_by: viewer.userId,
            pinned_at: new Date(),
          })
          .execute();
      }

      const msgs = await this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, {
        messageId,
      });
      const message = msgs[0];
      if (!message) throw new ApiProblem("internal");
      return { relationshipId, message };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "pin_updated",
      payload: message,
    });

    return message;
  }

  async markSaved(viewer: Viewer, messageId: string): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const msg = await trx
        .selectFrom("chat_message")
        .select("id")
        .where("id", "=", messageId)
        .where("relationship_id", "=", relationshipId)
        .executeTakeFirst();
      if (!msg) throw new ApiProblem("not_found");

      await sql`
        insert into chat_message_visibility (message_id, user_id, saved_as_memory)
        values (${messageId}, ${viewer.userId}, true)
        on conflict (message_id, user_id)
        do update set saved_as_memory = true
      `.execute(trx);
    });
  }

  async markRead(viewer: Viewer): Promise<void> {
    const { relationshipId } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const now = new Date();

      await sql`
        insert into chat_participant_state (relationship_id, user_id, read_up_to, updated_at)
        values (${relationshipId}, ${viewer.userId}, ${now}, ${now})
        on conflict (relationship_id, user_id)
        do update set read_up_to = ${now}, updated_at = ${now}
      `.execute(trx);

      return { relationshipId };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "presence",
      payload: { readAt: new Date().toISOString() },
    });
  }

  async getPresence(viewer: Viewer): Promise<ChatPresenceResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const { partnerId } = await this.getPartnerInfo(trx, viewer.userId, relationshipId);

      if (!partnerId) {
        return { partnerTyping: false, seenUpTo: null, partnerHere: false };
      }

      const rows = await trx
        .selectFrom("chat_participant_state")
        .select([
          "user_id",
          "read_receipts",
          "typing_indicators",
          "read_up_to",
          "typing_until",
          "in_chat_until",
        ])
        .where("relationship_id", "=", relationshipId)
        .execute();

      const viewerState = rows.find((r) => r.user_id === viewer.userId);
      const partnerState = rows.find((r) => r.user_id === partnerId);

      // Mutual opt-in rule (P-58, U-35)
      const receiptsActive =
        viewerState?.read_receipts === true && partnerState?.read_receipts === true;

      const now = Date.now();
      const partnerTyping = Boolean(
        partnerState?.typing_indicators !== false &&
        partnerState?.typing_until &&
        partnerState.typing_until.getTime() > now,
      );

      const seenUpTo =
        receiptsActive && partnerState.read_up_to ? partnerState.read_up_to.toISOString() : null;

      // Active chat watching ("here now", P-61) requires receiptsActive
      const partnerHere = Boolean(
        receiptsActive && partnerState.in_chat_until && partnerState.in_chat_until.getTime() > now,
      );

      return { partnerTyping, seenUpTo, partnerHere };
    });
  }

  async sendTyping(viewer: Viewer, typing: boolean): Promise<void> {
    const { relationshipId } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const now = new Date();
      const typingUntil = typing ? new Date(now.getTime() + 5000) : null;

      await sql`
        insert into chat_participant_state (relationship_id, user_id, typing_until, updated_at)
        values (${relationshipId}, ${viewer.userId}, ${typingUntil}, ${now})
        on conflict (relationship_id, user_id)
        do update set typing_until = ${typingUntil}, updated_at = ${now}
      `.execute(trx);

      return { relationshipId };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "typing",
      payload: { typing },
    });
  }

  async setWatching(viewer: Viewer, watching: boolean): Promise<void> {
    const { relationshipId } = await asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const now = new Date();
      const inChatUntil = watching ? new Date(now.getTime() + 10000) : null;

      await sql`
        insert into chat_participant_state (relationship_id, user_id, in_chat_until, updated_at)
        values (${relationshipId}, ${viewer.userId}, ${inChatUntil}, ${now})
        on conflict (relationship_id, user_id)
        do update set in_chat_until = ${inChatUntil}, updated_at = ${now}
      `.execute(trx);

      return { relationshipId };
    });

    this.events.emit({
      relationshipId,
      senderId: viewer.userId,
      type: "presence",
      payload: { watching },
    });
  }

  async getSettings(viewer: Viewer): Promise<ChatSettingsResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);

      const state = await trx
        .selectFrom("chat_participant_state")
        .select(["read_receipts", "typing_indicators"])
        .where("relationship_id", "=", relationshipId)
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const userSettingsRow = await trx
        .selectFrom("user_settings")
        .select("doc")
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const settings = readSettings(userSettingsRow?.doc ?? null);
      const notifications = settings.notify.messages !== "off";

      return {
        notifications,
        readReceipts: state?.read_receipts ?? null,
        typingIndicators: state?.typing_indicators ?? true,
      };
    });
  }

  async updateSettings(
    viewer: Viewer,
    req: UpdateChatSettingsRequest,
  ): Promise<ChatSettingsResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      const now = new Date();

      const readReceipts = req.readReceipts ?? null;
      const typingIndicators = req.typingIndicators ?? true;

      await sql`
        insert into chat_participant_state (relationship_id, user_id, read_receipts, typing_indicators, updated_at)
        values (${relationshipId}, ${viewer.userId}, ${readReceipts}, ${typingIndicators}, ${now})
        on conflict (relationship_id, user_id)
        do update set
          read_receipts = coalesce(${req.readReceipts ?? null}, chat_participant_state.read_receipts),
          typing_indicators = coalesce(${req.typingIndicators ?? null}, chat_participant_state.typing_indicators),
          updated_at = ${now}
      `.execute(trx);

      const state = await trx
        .selectFrom("chat_participant_state")
        .select(["read_receipts", "typing_indicators"])
        .where("relationship_id", "=", relationshipId)
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const userSettingsRow = await trx
        .selectFrom("user_settings")
        .select("doc")
        .where("user_id", "=", viewer.userId)
        .executeTakeFirst();

      const settings = readSettings(userSettingsRow?.doc ?? null);
      const notifications = settings.notify.messages !== "off";

      return {
        notifications,
        readReceipts: state?.read_receipts ?? null,
        typingIndicators: state?.typing_indicators ?? true,
      };
    });
  }

  async getPinned(viewer: Viewer): Promise<ChatMessageDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      return this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, { pinnedOnly: true });
    });
  }

  async getSharedMedia(viewer: Viewer): Promise<ChatMessageDto[]> {
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      return this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, { mediaOnly: true });
    });
  }

  async search(viewer: Viewer, query: string): Promise<ChatMessageDto[]> {
    if (!query.trim()) return [];
    return asViewer(this.db, viewer, async (trx) => {
      const relationshipId = await this.requireRelationshipId(trx, viewer.userId);
      return this.loadMessagesWithDetails(trx, relationshipId, viewer.userId, { query });
    });
  }
}
