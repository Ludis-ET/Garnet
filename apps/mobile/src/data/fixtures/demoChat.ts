import { Temporal } from "temporal-polyfill";
import { DEFAULT_CHAT_SETTINGS, type ChatMessage, type ChatSettings } from "@/domain/chat";
import { DEMO_ME_ID, DEMO_PARTNER_ID } from "./demo";

export interface DemoChatState {
  messages: ChatMessage[];
  /** This person's own chat settings. */
  settings: ChatSettings;
  /** The demo partner's choices (P-58): Noah has said yes to "Seen" and shares his typing. */
  partner: { readReceipts: boolean | null; typingIndicators: boolean };
  /** Whether the partner is simulating typing right now (CHAT-01). */
  partnerTyping: boolean;
  /** The partner has seen messages up to here (stored always; shown only when both said yes). */
  partnerSeenUpTo: string | null;
  /**
   * How far this person has read, for their own unread counts (P-66). Private to them: it is
   * never sent to the partner, which is what "Seen" (mutual, P-58) is for.
   */
  readUpTo: string | null;
  /** Prototype: Noah types and answers after you send (turned off in tests). */
  autoReply: boolean;
  /** Whether the partner has the chat open (shown only under mutual "Seen", P-61). */
  partnerInChat: boolean;
  /** Prototype: the next upload stops part-way, to show the retry state. */
  failNextUpload: boolean;
}

const sampleWave = [
  0.3, 0.5, 0.8, 0.4, 0.9, 0.6, 0.7, 0.3, 0.5, 0.8, 0.95, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6, 0.7,
  0.9, 0.4, 0.6, 0.8, 0.5, 0.3, 0.4, 0.6, 0.2,
];

/**
 * The seeded conversation, moved so its last message is 20 minutes old: the chat always looks
 * recent, and the order and gaps between messages stay the same.
 */
export function createDemoChat(
  meId: string = DEMO_ME_ID,
  partnerId: string = DEMO_PARTNER_ID,
  now: Temporal.Instant = Temporal.Now.instant(),
): DemoChatState {
  const seeded = seedMessages(meId, partnerId);
  const last = seeded.reduce(
    (max, m) => Math.max(max, Temporal.Instant.from(m.createdAt).epochMilliseconds),
    0,
  );
  const shift = Math.round((now.epochMilliseconds - 20 * 60_000 - last) / 60_000) * 60_000;
  const move = (iso: string) =>
    Temporal.Instant.fromEpochMilliseconds(
      Temporal.Instant.from(iso).epochMilliseconds + shift,
    ).toString();
  return {
    settings: { ...DEFAULT_CHAT_SETTINGS },
    partner: { readReceipts: true, typingIndicators: true },
    partnerTyping: false,
    partnerSeenUpTo: null,
    // Read up to your own last message, so Noah's two later ones start unread.
    readUpTo: move("2026-10-24T12:05:00Z"),
    autoReply: true,
    partnerInChat: false,
    failNextUpload: false,
    messages: seeded.map((m) => ({
      ...m,
      createdAt: move(m.createdAt),
      editedAt: m.editedAt === null ? null : move(m.editedAt),
      pinnedAt: m.pinnedAt === null ? null : move(m.pinnedAt),
    })),
  };
}

function seedMessages(meId: string, partnerId: string): ChatMessage[] {
  return [
    {
      id: "msg-chat-1",
      senderId: partnerId,
      text: "Good morning Selam! Hope you slept well in Addis ✨",
      createdAt: "2026-10-23T07:30:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [{ emoji: "✨", count: 1, reactedByMe: true }],
    },
    {
      id: "msg-chat-2",
      senderId: meId,
      text: "Good morning my love! Just finished traditional coffee here ☕",
      createdAt: "2026-10-23T07:35:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [],
    },
    {
      id: "msg-chat-3",
      senderId: partnerId,
      text: "",
      media: {
        type: "photo",
        art: "sunrise",
        caption: "Morning light catching the Thames",
      },
      createdAt: "2026-10-23T08:00:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [{ emoji: "❤️", count: 1, reactedByMe: true }],
    },
    {
      id: "msg-chat-4",
      senderId: meId,
      text: "",
      media: {
        type: "voice",
        seconds: 14,
        wave: sampleWave,
      },
      createdAt: "2026-10-23T08:10:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [],
    },
    {
      id: "msg-chat-5",
      senderId: partnerId,
      text: "Hearing your voice makes my whole day brighter. One space together, always.",
      createdAt: "2026-10-23T08:15:00Z",
      editedAt: null,
      status: "sent",
      pinned: true,
      pinnedAt: "2026-10-23T08:16:00Z",
      replyTo: null,
      reactions: [{ emoji: "💜", count: 1, reactedByMe: true }],
    },
    {
      id: "msg-chat-6",
      senderId: partnerId,
      text: "",
      media: {
        type: "video",
        art: "garden",
        seconds: 12,
        caption: "Quiet autumn walk through the park 🍂",
      },
      createdAt: "2026-10-24T12:00:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [],
    },
    {
      id: "msg-chat-7",
      senderId: meId,
      text: "So peaceful... I wish I was walking beside you right now.",
      createdAt: "2026-10-24T12:05:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: {
        id: "msg-chat-6",
        senderId: partnerId,
        senderName: "Noah",
        text: "Quiet autumn walk through the park 🍂",
        mediaType: "video",
      },
      reactions: [{ emoji: "🫂", count: 1, reactedByMe: false }],
    },
    {
      id: "msg-chat-8",
      senderId: partnerId,
      text: "Soon, I promise! Counting down every single day.",
      createdAt: "2026-10-24T16:20:00Z",
      editedAt: "2026-10-24T16:25:00Z",
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [],
    },
    {
      id: "msg-chat-9",
      senderId: partnerId,
      text: "Let me know whenever you're ready for our evening call 💜",
      createdAt: "2026-10-24T17:50:00Z",
      editedAt: null,
      status: "sent",
      pinned: false,
      pinnedAt: null,
      replyTo: null,
      reactions: [],
    },
  ];
}
