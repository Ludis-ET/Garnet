import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  type MessageEvent,
} from "@nestjs/common";
import { Observable } from "rxjs";
import {
  deleteMessageRequestSchema,
  editMessageRequestSchema,
  sendMessageRequestSchema,
  toggleReactionRequestSchema,
  updateChatSettingsRequestSchema,
  type ChatMessageDto,
  type ChatMessagesResponse,
  type ChatPresenceResponse,
  type ChatSettingsResponse,
  type ConversationSummaryResponse,
  type SearchChatResponse,
} from "@garnet/contracts";
import { CurrentViewer } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { parseBody } from "../http/body";
import { RealtimeHub } from "../realtime/hub";
import { ChatService } from "./chat.service";

/**
 * Chat endpoints (B5, B-40, CHAT-01 to CHAT-09, P-58, P-61, P-62, P-63):
 * - GET /v1/chat/summary: unread count, pinned count, media count, last message.
 * - GET /v1/chat/messages: full message history respecting private visibility.
 * - POST /v1/chat/messages: send message with client-assigned UUIDv7.
 * - PATCH /v1/chat/messages/:id: edit message (author only, 15-minute window).
 * - DELETE /v1/chat/messages/:id: delete for me / for everyone (author only).
 * - POST /v1/chat/messages/:id/reactions: toggle reaction emoji.
 * - POST /v1/chat/messages/:id/pin: toggle pin status.
 * - POST /v1/chat/messages/:id/save-memory: toggle private memory mark.
 * - POST /v1/chat/read: mark read position (clears unread badge).
 * - GET /v1/chat/presence: typing & watching presence (under mutual opt-in).
 * - POST /v1/chat/presence/typing: heartbeat typing state.
 * - POST /v1/chat/presence/watching: heartbeat in-chat state.
 * - GET /v1/chat/settings: chat settings (read receipts, typing indicators).
 * - PATCH /v1/chat/settings: update chat settings.
 * - GET /v1/chat/pinned: list pinned messages.
 * - GET /v1/chat/shared-media: list media messages.
 * - GET /v1/chat/search: search messages by query text.
 */
@Controller("v1/chat")
export class ChatController {
  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(RealtimeHub) private readonly hub: RealtimeHub,
  ) {}

  @Get("summary")
  async getSummary(@CurrentViewer() viewer: Viewer): Promise<ConversationSummaryResponse> {
    return this.chatService.getSummary(viewer);
  }

  @Get("messages")
  async getMessages(@CurrentViewer() viewer: Viewer): Promise<ChatMessagesResponse> {
    const messages = await this.chatService.getMessages(viewer);
    return { messages };
  }

  @Post("messages")
  @HttpCode(200)
  async sendMessage(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<ChatMessageDto> {
    const request = parseBody(sendMessageRequestSchema, body);
    return this.chatService.sendMessage(viewer, request);
  }

  @Patch("messages/:id")
  async editMessage(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<ChatMessageDto> {
    const request = parseBody(editMessageRequestSchema, body);
    return this.chatService.editMessage(viewer, id, request);
  }

  @Delete("messages/:id")
  @HttpCode(204)
  async deleteMessage(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<void> {
    const request = parseBody(deleteMessageRequestSchema, body);
    await this.chatService.deleteMessage(viewer, id, request);
  }

  @Post("messages/:id/reactions")
  @HttpCode(200)
  async toggleReaction(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<ChatMessageDto> {
    const request = parseBody(toggleReactionRequestSchema, body);
    return this.chatService.toggleReaction(viewer, id, request.emoji);
  }

  @Post("messages/:id/pin")
  @HttpCode(200)
  async togglePin(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
  ): Promise<ChatMessageDto> {
    return this.chatService.togglePin(viewer, id);
  }

  @Post("messages/:id/save-memory")
  @HttpCode(204)
  async markSaved(@CurrentViewer() viewer: Viewer, @Param("id") id: string): Promise<void> {
    await this.chatService.markSaved(viewer, id);
  }

  @Post("read")
  @HttpCode(204)
  async markRead(@CurrentViewer() viewer: Viewer): Promise<void> {
    await this.chatService.markRead(viewer);
  }

  @Get("presence")
  async getPresence(@CurrentViewer() viewer: Viewer): Promise<ChatPresenceResponse> {
    return this.chatService.getPresence(viewer);
  }

  @Post("presence/typing")
  @HttpCode(204)
  async sendTyping(
    @CurrentViewer() viewer: Viewer,
    @Body() body: { typing?: boolean },
  ): Promise<void> {
    await this.chatService.sendTyping(viewer, body.typing ?? true);
  }

  @Post("presence/watching")
  @HttpCode(204)
  async setWatching(
    @CurrentViewer() viewer: Viewer,
    @Body() body: { watching?: boolean },
  ): Promise<void> {
    await this.chatService.setWatching(viewer, body.watching ?? true);
  }

  @Get("settings")
  async getSettings(@CurrentViewer() viewer: Viewer): Promise<ChatSettingsResponse> {
    return this.chatService.getSettings(viewer);
  }

  @Patch("settings")
  async updateSettings(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<ChatSettingsResponse> {
    const request = parseBody(updateChatSettingsRequestSchema, body);
    return this.chatService.updateSettings(viewer, request);
  }

  @Get("pinned")
  async getPinned(@CurrentViewer() viewer: Viewer): Promise<ChatMessagesResponse> {
    const messages = await this.chatService.getPinned(viewer);
    return { messages };
  }

  @Get("shared-media")
  async getSharedMedia(@CurrentViewer() viewer: Viewer): Promise<ChatMessagesResponse> {
    const messages = await this.chatService.getSharedMedia(viewer);
    return { messages };
  }

  @Get("search")
  async search(
    @CurrentViewer() viewer: Viewer,
    @Query("q") query = "",
  ): Promise<SearchChatResponse> {
    const messages = await this.chatService.search(viewer, query);
    return { messages };
  }

  @Sse("stream")
  async chatStream(
    @CurrentViewer() viewer: Viewer,
    @Query("probe") probe?: string,
  ): Promise<Observable<MessageEvent>> {
    const relId = await this.chatService.getRelationshipId(viewer);

    return new Observable<MessageEvent>((subscriber) => {
      let unsubscribe: (() => void) | null = null;
      let active = true;

      // Initial connection event
      subscriber.next({ data: { type: "connected", relationshipId: relId } });

      // In probe test environments, complete immediately after connection
      if (probe === "true") {
        subscriber.complete();
        return;
      }

      // The SSE fallback counts as having Garnet open, like the WebSocket (P-100).
      const presence = this.hub.connected(relId, viewer.userId);

      // Subscribe to relationship chat events
      unsubscribe = this.chatService.subscribeEvents(relId, (event) => {
        if (active) {
          subscriber.next({ data: event });
        }
      });

      // Keepalive heartbeat every 15s to keep mobile proxies and connections alive
      const pingInterval = setInterval(() => {
        if (active) {
          subscriber.next({ data: { type: "ping" } });
        }
      }, 15000);

      return () => {
        active = false;
        clearInterval(pingInterval);
        unsubscribe();
        presence.close();
      };
    });
  }
}
