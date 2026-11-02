/**
 * Domain rules and pure models for Garnet Chat (CHAT-00 to CHAT-09).
 *
 * Product guardrails (§5, §7):
 * - Private one-to-one only; no contacts list.
 * - Only curated photos, video and voice notes (no generic files).
 * - Sending media in chat does NOT create a memory automatically.
 * - Read receipts are an open conflict (U-35). Owner direction for the prototype (P-58): "Seen"
 *   shows only when BOTH partners turned it on; each person is asked once, nothing preselected
 *   (null = not answered yet, so no default). Either can turn it off at any time.
 * - Typing dots: each person shares their own typing unless they turn it off (P-58).
 * - Private drafts stay private.
 * - No metrics on the relationship: no streaks, rankings, response-time stats or escalation.
 */
import { Temporal } from "temporal-polyfill";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import type { HomePerson } from "@/data/repositories/types";
import type { Mood } from "@/features/figures/types";

export type ChatMessageStatus = "sending" | "sent" | "failed";

export type ChatMedia = DemoMedia & {
  caption?: string | undefined;
};

export interface ChatSticker {
  character: "ruby" | "sapphire" | "garnet";
  mood: Mood;
}

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
  /** 0–1 while a photo, video or voice note is still uploading (status "sending"). */
  uploadProgress?: number | undefined;
  /** A character sticker (P-62): one of the owner's images, sent on its own. */
  sticker?: ChatSticker | undefined;
  /** This person saved it to Memories (shown to them only; saving is explicit, §23). */
  savedAsMemory?: boolean | undefined;
}

/** What the status row under one of my messages says (P-61). Never "delivered" (§5). */
export type MessageState = "uploading" | "sending" | "failed" | "sent" | "seen";

export function messageState(message: ChatMessage, seenUpTo: string | null): MessageState {
  if (message.status === "failed") return "failed";
  if (message.status === "sending")
    return message.uploadProgress === undefined ? "sending" : "uploading";
  if (
    seenUpTo !== null &&
    Temporal.Instant.compare(
      Temporal.Instant.from(message.createdAt),
      Temporal.Instant.from(seenUpTo),
    ) <= 0
  )
    return "seen";
  return "sent";
}

export interface ChatSettings {
  notifications: boolean;
  /** U-35, P-58: this person's answer to "Show when you've seen messages?"; null until asked. */
  readReceipts: boolean | null;
  /** P-58: show the partner when this person is typing. */
  typingIndicators: boolean;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  notifications: true,
  readReceipts: null, // U-35: no default; the person is asked (P-58)
  typingIndicators: true,
};

/** "Seen" only when both said yes (P-58, U-35 open). Unanswered counts as no. */
export function receiptsActive(mine: boolean | null, partners: boolean | null): boolean {
  return mine === true && partners === true;
}

/** What the viewer may know about the partner right now. Never a last-seen time or "online". */
export interface ChatPresence {
  /** Only when the partner shares their typing (P-58). */
  partnerTyping: boolean;
  /** The partner has seen messages up to this instant; only when receipts are active. */
  seenUpTo: string | null;
  /**
   * The partner has the chat open right now (their character "watching", P-61). Shown only
   * when both said yes to "Seen" — the same mutual choice (P-58, U-35 open).
   */
  partnerHere: boolean;
}

export interface ConversationSummary {
  /** The signed-in person (their messages are the ones with this sender). */
  viewerId: string;
  partner: HomePerson;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  pinnedCount: number;
  mediaCount: number;
}

/** Messages from the partner after this person's private read position (P-66). */
export function unreadCount(
  messages: readonly ChatMessage[],
  viewerId: string,
  readUpTo: string | null,
): number {
  return messages.filter(
    (m) =>
      m.senderId !== viewerId &&
      m.deletedForMe !== true &&
      m.deletedForEveryone !== true &&
      (readUpTo === null ||
        Temporal.Instant.compare(
          Temporal.Instant.from(m.createdAt),
          Temporal.Instant.from(readUpTo),
        ) > 0),
  ).length;
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

/** A one-line preview: the words, else the media caption, else "Media". */
export function messagePreview(m: Pick<ChatMessage, "text" | "media" | "sticker">): string {
  if (m.text.length > 0) return m.text;
  if (m.sticker !== undefined) return "Sticker";
  const caption = m.media?.caption ?? "";
  return caption.length > 0 ? caption : "Media";
}
