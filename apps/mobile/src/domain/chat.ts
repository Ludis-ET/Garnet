/**
 * Domain rules and pure models for Garnet Chat (CHAT-00 to CHAT-09).
 *
 * Product guardrails (§5, §7):
 * - Private one-to-one only; no contacts list.
 * - Only curated photos, video and voice notes (no generic files).
 * - Sending media in chat does NOT create a memory automatically.
 * - Read receipts are an open conflict (U-35): Phase 1 rules say no read-receipt pressure,
 *   the spec says "flexible per-person controls agreed". Design receipts OFF by default
 *   and show both settings states.
 * - Private drafts stay private.
 * - No metrics on the relationship: no streaks, rankings, response-time stats or escalation.
 */
import { Temporal } from "temporal-polyfill";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import type { HomePerson } from "@/data/repositories/types";

export type ChatMessageStatus = "sending" | "sent" | "failed";

export type ChatMedia = DemoMedia & {
  caption?: string | undefined;
};

export interface ChatReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatReplyPreview {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaType?: "photo" | "video" | "voice" | undefined;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  /** ISO instant string (UTC) */
  createdAt: string;
  /** ISO instant string if edited, null otherwise */
  editedAt: string | null;
  status: ChatMessageStatus;
  pinned: boolean;
  pinnedAt: string | null;
  replyTo: ChatReplyPreview | null;
  reactions: ChatReaction[];
  media?: ChatMedia | undefined;
  deletedForMe?: boolean | undefined;
  deletedForEveryone?: boolean | undefined;
}

export interface ChatSettings {
  notifications: boolean;
  /** U-35: read receipts are off by default. */
  readReceipts: boolean;
  typingIndicators: boolean;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  notifications: true,
  readReceipts: false, // U-35
  typingIndicators: true,
};

export interface ConversationSummary {
  partner: HomePerson;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  pinnedCount: number;
  mediaCount: number;
}

/** Spec A13: Edit window for messages is 15 minutes from creation. */
export const MESSAGE_EDIT_WINDOW_MINUTES = 15;

/** Checks if a message is eligible for editing by its author. */
export function isMessageEditable(
  message: ChatMessage,
  currentUserId: string,
  nowInstant: Temporal.Instant,
): boolean {
  if (message.senderId !== currentUserId) return false;
  if (message.deletedForEveryone || message.deletedForMe) return false;
  if (message.status !== "sent") return false;

  try {
    const created = Temporal.Instant.from(message.createdAt);
    const diffMinutes = nowInstant.since(created).total({ unit: "minute" });
    return diffMinutes <= MESSAGE_EDIT_WINDOW_MINUTES;
  } catch {
    return false;
  }
}

/** Formats a message timestamp into viewer's local time (e.g. "18:42"). */
export function formatMessageTime(isoInstant: string, viewerTimezone = "Europe/London"): string {
  try {
    const instant = Temporal.Instant.from(isoInstant);
    const zdt = instant.toZonedDateTimeISO(viewerTimezone);
    const h = String(zdt.hour).padStart(2, "0");
    const m = String(zdt.minute).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

/** Date group label for a message instant relative to today in viewer's zone. */
export function dateGroupLabel(
  isoInstant: string,
  nowInstant: Temporal.Instant,
  viewerTimezone: string,
): string {
  try {
    const msgDate = Temporal.Instant.from(isoInstant)
      .toZonedDateTimeISO(viewerTimezone)
      .toPlainDate();
    const nowDate = nowInstant.toZonedDateTimeISO(viewerTimezone).toPlainDate();
    const diffDays = nowDate.since(msgDate).total({ unit: "day" });

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[msgDate.month - 1] ?? "";
    return `${month} ${msgDate.day}`;
  } catch {
    return "Earlier";
  }
}

export interface MessageDateGroup {
  dateLabel: string;
  messages: ChatMessage[];
}

/** Groups messages chronologically by day label for sectioning in the chat timeline. */
export function groupMessagesByDate(
  messages: ChatMessage[],
  nowInstant: Temporal.Instant,
  viewerTimezone: string,
): MessageDateGroup[] {
  const groups: MessageDateGroup[] = [];

  for (const msg of messages) {
    if (msg.deletedForMe) continue;
    const label = dateGroupLabel(msg.createdAt, nowInstant, viewerTimezone);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateLabel === label) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ dateLabel: label, messages: [msg] });
    }
  }

  return groups;
}

/** Search filter for chat messages (by text, caption, or media type). */
export function searchChatMessages(messages: ChatMessage[], query: string): ChatMessage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return messages.filter((m) => {
    if (m.deletedForMe || m.deletedForEveryone) return false;
    if (m.text.toLowerCase().includes(q)) return true;
    if (m.media?.caption?.toLowerCase().includes(q)) return true;
    if (m.media?.type.toLowerCase().includes(q)) return true;
    return false;
  });
}
