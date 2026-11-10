import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  NOTIFICATION_METAS,
  readSettings,
  type NotificationItemDto,
  type NotificationsListResponse,
  type NotifyGroupDto,
  type RegisterPushDeviceRequest,
} from "@garnet/contracts";
import { inQuietHours } from "@garnet/domain";
import { sql, type Kysely } from "kysely";
import { Temporal } from "temporal-polyfill";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { PUSH_SENDER, type PushSender } from "./push-sender";

export interface SendNotificationInput {
  relationshipId: string;
  recipientUserId: string;
  senderUserId?: string | null | undefined;
  category: string;
  group: NotifyGroupDto;
  href: string;
  context?:
    | {
        senderName?: string | undefined;
        partnerName?: string | undefined;
        eventTitle?: string | undefined;
        when?: string | undefined;
      }
    | undefined;
  metadata?: Record<string, unknown> | undefined;
}

const GENERIC_PUSH = {
  title: "Garnet",
  body: "Something new for you 💜",
} as const;

/**
 * Milestone B6: Push devices and server notifications service (B-50, U-27, P-84, §5, §6).
 */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
  ) {}

  /** Registers or updates a device push token linked to this session (U-27, P-84). */
  async registerDevice(viewer: Viewer, input: RegisterPushDeviceRequest): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await sql`
        insert into push_device (id, user_id, session_id, token, platform, created_at, updated_at)
        values (gen_random_uuid(), ${viewer.userId}, ${viewer.sessionId}, ${input.token}, ${input.platform}, now(), now())
        on conflict (token) do update
        set user_id = ${viewer.userId},
            session_id = ${viewer.sessionId},
            platform = ${input.platform},
            updated_at = now()
      `.execute(trx);
    });
  }

  /** Unregisters a device push token for this person. */
  async unregisterDevice(viewer: Viewer, token: string): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx
        .deleteFrom("push_device")
        .where("user_id", "=", viewer.userId)
        .where("token", "=", token)
        .execute();
    });
  }

  /** Records an in-app notification and dispatches push under recipient's preferences (§5, §6). */
  async sendNotification(input: SendNotificationInput): Promise<string> {
    const senderName = input.context?.senderName?.trim() ?? "Your partner";
    let inAppTitle = `New notification from ${senderName}`;
    let inAppBody = "Open Garnet to see what's new.";

    switch (input.category) {
      case "chat-message":
        inAppTitle = `Message from ${senderName}`;
        inAppBody = "New message";
        break;
      case "reply-reaction":
        inAppTitle = "A response to your message";
        inAppBody = `${senderName} replied.`;
        break;
      case "thought":
        inAppTitle = `A little thought from ${senderName}.`;
        inAppBody = `A little thought from ${senderName}.`;
        break;
      case "missing-you":
        inAppTitle = "A little closer, even from afar";
        inAppBody = `${senderName} is missing you.`;
        break;
      case "need-you":
        inAppTitle = `A message from ${senderName}`;
        inAppBody = "They sent you a support signal.";
        break;
      case "need-talk":
        inAppTitle = "When you have a moment";
        inAppBody = `${senderName} would like to talk.`;
        break;
      case "check-on-me":
        inAppTitle = "A gentle check-in request";
        inAppBody = `${senderName} asked you to check in.`;
        break;
      case "cant-talk":
        inAppTitle = `A note from ${senderName}`;
        inAppBody = `${senderName} can't talk just now.`;
        break;
      case "okay-now":
        inAppTitle = "A little reassurance";
        inAppBody = `${senderName} let you know they're okay.`;
        break;
      case "day-reveal":
        inAppTitle = "Your day is ready to revisit";
        inAppBody = "Your shared day is ready.";
        break;
      // P-102: never the letter's words or the surprise's contents, only that it is there.
      case "open-when":
        inAppTitle = `A letter from ${senderName}`;
        inAppBody = "Sealed for you, for when the moment is right.";
        break;
      case "surprise":
        inAppTitle = `A surprise from ${senderName}`;
        inAppBody = "It's ready to open.";
        break;
      case "event-reminder":
        inAppTitle = "Something to look forward to";
        inAppBody = "One of your days is today.";
        break;
      case "birthday":
        inAppTitle = "A special day";
        inAppBody = "Today is one of your special days.";
        break;
      case "partner-joined":
        inAppTitle = `${senderName} is here`;
        inAppBody = "Your space is ready for both of you.";
        break;
      default:
        break;
    }

    // 1. Persist notification row for the recipient
    const inserted = await this.db
      .insertInto("notification")
      .values({
        id: randomUUID(),
        relationship_id: input.relationshipId,
        user_id: input.recipientUserId,
        sender_id: input.senderUserId ?? null,
        category: input.category,
        group_name: input.group,
        title: inAppTitle,
        body: inAppBody,
        href: input.href,
        metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata),
        read_at: null,
        created_at: new Date(),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const notifId = inserted.id;

    // 2. Fetch recipient settings & profile
    const settingsRow = await this.db
      .selectFrom("user_settings")
      .select("doc")
      .where("user_id", "=", input.recipientUserId)
      .executeTakeFirst();
    const settings = readSettings(settingsRow?.doc);

    // If group notifications are turned off, stop here
    const mode = settings.notify[input.group];
    if (mode === "off") {
      return notifId;
    }

    const recipientProfile = await this.db
      .selectFrom("profile")
      .select("time_zone")
      .where("user_id", "=", input.recipientUserId)
      .executeTakeFirst();
    const zone = recipientProfile?.time_zone ?? "UTC";

    // 3. Evaluate quiet hours
    let isQuiet = mode === "quiet";
    if (!isQuiet && settings.quiet.on) {
      try {
        const localHhmm = Temporal.Now.instant()
          .toZonedDateTimeISO(zone)
          .toPlainTime()
          .toString()
          .slice(0, 5);
        isQuiet = inQuietHours(settings.quiet, localHhmm);
      } catch {
        isQuiet = false;
      }
    }

    // 4. Shape preview copy (Generic by default, P-17; never content over transport, §6)
    let pushTitle: string = GENERIC_PUSH.title;
    let pushBody: string = GENERIC_PUSH.body;

    if (settings.previews === "sender") {
      pushTitle = "Garnet";
      pushBody = `${senderName} sent you something 💜`;
    } else if (settings.previews === "full") {
      // Safe catalogue copy only: never raw message texts or secrets (§6)
      pushTitle = inAppTitle;
      pushBody = inAppBody;
    }

    // 5. Calculate badge count (SYS-05: emotional signals light dot, never numeric badge)
    let badgeCount: number | undefined = undefined;
    if (settings.badge) {
      const unreadCountRow = await this.db
        .selectFrom("notification")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("user_id", "=", input.recipientUserId)
        .where("read_at", "is", null)
        .where("group_name", "!=", "signals")
        .executeTakeFirst();
      badgeCount = unreadCountRow?.count ?? 0;
    }

    // 6. Query recipient's active push tokens
    const devices = await this.db
      .selectFrom("push_device")
      .select(["id", "token", "platform"])
      .where("user_id", "=", input.recipientUserId)
      .execute();

    // 7. Dispatch push notifications
    for (const dev of devices) {
      try {
        const result = await this.pushSender.send({
          to: dev.token,
          platform: dev.platform,
          title: pushTitle,
          body: pushBody,
          data: {
            id: notifId,
            href: input.href,
            group: input.group,
            category: input.category,
            garnet: true,
          },
          quiet: isQuiet,
          badge: badgeCount,
        });

        if (result.unregistered) {
          await this.db.deleteFrom("push_device").where("id", "=", dev.id).execute();
        }
      } catch {
        // Continue to other devices
      }
    }

    return notifId;
  }

  /** Lists in-app notifications for the viewer (NOTIF-01, InboxRepository). */
  async listNotifications(viewer: Viewer): Promise<NotificationsListResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const rows = await trx
        .selectFrom("notification")
        .selectAll()
        .where("user_id", "=", viewer.userId)
        .orderBy("created_at", "desc")
        .limit(100)
        .execute();

      const items: NotificationItemDto[] = rows.map((r) => {
        const meta = NOTIFICATION_METAS[r.category] ?? {
          group: r.group_name,
          label: "Notification",
          emoji: "💜",
        };
        return {
          id: r.id,
          category: r.category,
          group: r.group_name,
          label: meta.label,
          emoji: meta.emoji,
          title: r.title,
          body: r.body,
          at: new Date(r.created_at).toISOString(),
          href: r.href,
          unread: r.read_at === null,
        };
      });

      // Unread count excluding emotional signals (SYS-05)
      const unreadCount = items.filter((i) => i.unread && i.group !== "signals").length;
      const hasUnread = items.some((i) => i.unread);

      return {
        items,
        unreadCount,
        hasUnread,
      };
    });
  }

  /** Marks a notification read for this viewer (§5). */
  async markRead(viewer: Viewer, id: string): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx
        .updateTable("notification")
        .set({ read_at: new Date() })
        .where("id", "=", id)
        .where("user_id", "=", viewer.userId)
        .execute();
    });
  }

  /** Marks a notification unread for this viewer (§5). */
  async markUnread(viewer: Viewer, id: string): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx
        .updateTable("notification")
        .set({ read_at: null })
        .where("id", "=", id)
        .where("user_id", "=", viewer.userId)
        .execute();
    });
  }

  /** Marks all notifications read for this viewer (§5). */
  async markAllRead(viewer: Viewer): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx
        .updateTable("notification")
        .set({ read_at: new Date() })
        .where("user_id", "=", viewer.userId)
        .where("read_at", "is", null)
        .execute();
    });
  }
}
