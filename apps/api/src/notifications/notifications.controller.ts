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
} from "@nestjs/common";
import { registerPushDeviceSchema, type NotificationsListResponse } from "@garnet/contracts";
import { CurrentViewer } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { parseBody } from "../http/body";
import { NotificationsService } from "./notifications.service";

/**
 * Controller for push device registration and in-app notifications centre (B6, B-50, U-27, P-84).
 */
@Controller("v1")
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Post("me/push-devices")
  @HttpCode(204)
  async registerPushDevice(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const input = parseBody(registerPushDeviceSchema, body);
    await this.notifications.registerDevice(viewer, input);
  }

  @Delete("me/push-devices/:token")
  @HttpCode(204)
  async unregisterPushDevice(
    @CurrentViewer() viewer: Viewer,
    @Param("token") token: string,
  ): Promise<void> {
    await this.notifications.unregisterDevice(viewer, token);
  }

  @Get("notifications")
  async listNotifications(@CurrentViewer() viewer: Viewer): Promise<NotificationsListResponse> {
    return this.notifications.listNotifications(viewer);
  }

  @Patch("notifications/:id/read")
  @HttpCode(204)
  async markRead(@CurrentViewer() viewer: Viewer, @Param("id") id: string): Promise<void> {
    await this.notifications.markRead(viewer, id);
  }

  @Patch("notifications/:id/unread")
  @HttpCode(204)
  async markUnread(@CurrentViewer() viewer: Viewer, @Param("id") id: string): Promise<void> {
    await this.notifications.markUnread(viewer, id);
  }

  @Post("notifications/read-all")
  @HttpCode(204)
  async markAllRead(@CurrentViewer() viewer: Viewer): Promise<void> {
    await this.notifications.markAllRead(viewer);
  }
}
