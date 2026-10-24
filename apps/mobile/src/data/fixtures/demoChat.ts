import { DEFAULT_CHAT_SETTINGS, type ChatMessage, type ChatSettings } from "@/domain/chat";
import { DEMO_ME_ID, DEMO_PARTNER_ID } from "./demo";

export interface DemoChatState {
  messages: ChatMessage[];
  settings: ChatSettings;
  /** Whether the partner is currently simulating typing (spec CHAT-01). */
  partnerTyping: boolean;
}

const sampleWave = [
  0.3, 0.5, 0.8, 0.4, 0.9, 0.6, 0.7, 0.3, 0.5, 0.8, 0.95, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6, 0.7,
  0.9, 0.4, 0.6, 0.8, 0.5, 0.3, 0.4, 0.6, 0.2,
];

export function createDemoChat(
  meId: string = DEMO_ME_ID,
  partnerId: string = DEMO_PARTNER_ID,
): DemoChatState {
  return {
    settings: { ...DEFAULT_CHAT_SETTINGS },
    partnerTyping: false,
    messages: [
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
    ],
  };
}
