import { z } from "zod";

/**
 * Push notifications and in-app notifications centre contracts (B6, B-50, U-27, P-84, §5, §6).
 */

export const pushPlatformSchema = z.enum(["ios", "android", "web"]);
export type PushPlatform = z.infer<typeof pushPlatformSchema>;

export const registerPushDeviceSchema = z
  .object({
    token: z.string().min(1).max(512),
    platform: pushPlatformSchema,
  })
  .strict();
export type RegisterPushDeviceRequest = z.infer<typeof registerPushDeviceSchema>;

export const notifyGroupSchema = z.enum([
  "messages",
  "signals",
  "days",
  "letters",
  "events",
  "account",
  "reminders",
]);
export type NotifyGroupDto = z.infer<typeof notifyGroupSchema>;

export interface NotificationMeta {
  readonly group: NotifyGroupDto;
  readonly label: string;
  readonly emoji: string;
}

export const NOTIFICATION_METAS: Readonly<Record<string, NotificationMeta>> = Object.freeze({
  thought: { group: "signals", label: "Thought", emoji: "💭" },
  "missing-you": { group: "signals", label: "Missing you", emoji: "🫶" },
  "need-you": { group: "signals", label: "Support", emoji: "🫂" },
  "need-talk": { group: "signals", label: "Talk", emoji: "📞" },
  "check-on-me": { group: "signals", label: "Check-in", emoji: "🌙" },
  "cant-talk": { group: "signals", label: "Note", emoji: "⏳" },
  "okay-now": { group: "signals", label: "Reassurance", emoji: "🌤️" },
  "chat-message": { group: "messages", label: "Message", emoji: "💬" },
  "reply-reaction": { group: "messages", label: "Reaction", emoji: "❤️" },
  "day-reveal": { group: "days", label: "Your day", emoji: "🌅" },
  "media-ready": { group: "days", label: "Media", emoji: "🖼️" },
  "open-when": { group: "letters", label: "Letter", emoji: "💌" },
  surprise: { group: "letters", label: "Surprise", emoji: "🎁" },
  "event-reminder": { group: "events", label: "Event", emoji: "📅" },
  birthday: { group: "events", label: "Special day", emoji: "🎂" },
  "partner-joined": { group: "account", label: "Joined", emoji: "💜" },
  invitation: { group: "account", label: "Invitation", emoji: "✉️" },
  security: { group: "account", label: "Account", emoji: "🔒" },
  service: { group: "account", label: "Update", emoji: "📣" },
  "memory-reminder": { group: "reminders", label: "Reminder", emoji: "📸" },
});

export const notificationItemSchema = z
  .object({
    id: z.uuid(),
    category: z.string(),
    group: notifyGroupSchema,
    label: z.string(),
    emoji: z.string(),
    title: z.string(),
    body: z.string(),
    at: z.string(),
    href: z.string(),
    unread: z.boolean(),
  })
  .strict();
export type NotificationItemDto = z.infer<typeof notificationItemSchema>;

export const notificationsListResponseSchema = z
  .object({
    items: z.array(notificationItemSchema),
    unreadCount: z.number().int().nonnegative(),
    hasUnread: z.boolean(),
  })
  .strict();
export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;
