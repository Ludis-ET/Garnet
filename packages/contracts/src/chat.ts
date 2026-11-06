import { z } from "zod";
import { homePersonSchema } from "./signals";

/**
 * Chat contracts (B5, B-40, CHAT-01 to CHAT-09).
 *
 * Product guardrails (§5):
 * - No read receipts unless BOTH partners opt in (U-35, P-58).
 * - No response-time statistics, streaks, or per-person reaction counts.
 * - Senders see "Sent", or "Seen" under mutual opt-in; never "Delivered".
 * - Never "online" presence or last-seen timestamps.
 */

export const chatMessageStatusSchema = z.enum(["sending", "sent", "failed"]);
export type ChatMessageStatus = z.infer<typeof chatMessageStatusSchema>;

export const chatMediaTypeSchema = z.enum(["photo", "video", "voice"]);
export type ChatMediaType = z.infer<typeof chatMediaTypeSchema>;

export const chatMediaDtoSchema = z.object({
  id: z.string(),
  type: chatMediaTypeSchema,
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSeconds: z.number().optional(),
  caption: z.string().optional(),
});
export type ChatMediaDto = z.infer<typeof chatMediaDtoSchema>;

export const chatStickerDtoSchema = z.object({
  character: z.enum(["ruby", "sapphire", "garnet"]),
  mood: z.string(),
});
export type ChatStickerDto = z.infer<typeof chatStickerDtoSchema>;

export const chatReactionDtoSchema = z.object({
  emoji: z.string(),
  count: z.number().int().nonnegative(),
  reactedByMe: z.boolean(),
});
export type ChatReactionDto = z.infer<typeof chatReactionDtoSchema>;

export const chatReplyPreviewDtoSchema = z.object({
  id: z.uuid(),
  senderId: z.uuid(),
  senderName: z.string(),
  text: z.string(),
  mediaType: chatMediaTypeSchema.optional(),
});
export type ChatReplyPreviewDto = z.infer<typeof chatReplyPreviewDtoSchema>;

export const chatMessageDtoSchema = z.object({
  id: z.uuid(),
  senderId: z.uuid(),
  text: z.string(),
  createdAt: z.string(), // ISO UTC instant string
  editedAt: z.string().nullable(),
  status: chatMessageStatusSchema,
  pinned: z.boolean(),
  pinnedAt: z.string().nullable(),
  replyTo: chatReplyPreviewDtoSchema.nullable(),
  reactions: z.array(chatReactionDtoSchema),
  media: chatMediaDtoSchema.optional(),
  deletedForMe: z.boolean().optional(),
  deletedForEveryone: z.boolean().optional(),
  uploadProgress: z.number().min(0).max(1).optional(),
  sticker: chatStickerDtoSchema.optional(),
  savedAsMemory: z.boolean().optional(),
});
export type ChatMessageDto = z.infer<typeof chatMessageDtoSchema>;

export const sendMessageRequestSchema = z.object({
  id: z.uuid().optional(),
  text: z.string().max(2000).default(""),
  media: chatMediaDtoSchema.optional(),
  sticker: chatStickerDtoSchema.optional(),
  replyToId: z.uuid().optional(),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

export const editMessageRequestSchema = z.object({
  text: z.string().min(1).max(2000),
});
export type EditMessageRequest = z.infer<typeof editMessageRequestSchema>;

export const deleteMessageRequestSchema = z.object({
  mode: z.enum(["for-me", "for-everyone"]),
});
export type DeleteMessageRequest = z.infer<typeof deleteMessageRequestSchema>;

export const toggleReactionRequestSchema = z.object({
  emoji: z.string().min(1).max(16),
});
export type ToggleReactionRequest = z.infer<typeof toggleReactionRequestSchema>;

export const updateChatSettingsRequestSchema = z.object({
  readReceipts: z.boolean().nullable().optional(),
  typingIndicators: z.boolean().optional(),
  notifications: z.boolean().optional(),
});
export type UpdateChatSettingsRequest = z.infer<typeof updateChatSettingsRequestSchema>;

export const chatSettingsResponseSchema = z.object({
  notifications: z.boolean(),
  readReceipts: z.boolean().nullable(),
  typingIndicators: z.boolean(),
});
export type ChatSettingsResponse = z.infer<typeof chatSettingsResponseSchema>;

export const chatPresenceResponseSchema = z.object({
  partnerTyping: z.boolean(),
  seenUpTo: z.string().nullable(),
  partnerHere: z.boolean(),
});
export type ChatPresenceResponse = z.infer<typeof chatPresenceResponseSchema>;

export const conversationSummaryResponseSchema = z.object({
  viewerId: z.uuid(),
  partner: homePersonSchema,
  lastMessage: chatMessageDtoSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
  pinnedCount: z.number().int().nonnegative(),
  mediaCount: z.number().int().nonnegative(),
});
export type ConversationSummaryResponse = z.infer<typeof conversationSummaryResponseSchema>;

export const chatMessagesResponseSchema = z.object({
  messages: z.array(chatMessageDtoSchema),
});
export type ChatMessagesResponse = z.infer<typeof chatMessagesResponseSchema>;

export const searchChatResponseSchema = z.object({
  messages: z.array(chatMessageDtoSchema),
});
export type SearchChatResponse = z.infer<typeof searchChatResponseSchema>;
