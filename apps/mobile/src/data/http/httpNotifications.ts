import {
  notificationsListResponseSchema,
  registerPushDeviceSchema,
  type NotificationsListResponse,
  type PushPlatform,
} from "@garnet/contracts";
import type { InboxItem, InboxRepository } from "@/data/repositories/types";
import type { ApiClient } from "./client";

/**
 * Milestone B6: HTTP notifications repository adapter (NOTIF-01, B-50, U-27).
 * Connects the mobile app's in-app notification centre and push device registration
 * to the backend API.
 */
export function createHttpNotifications(api: ApiClient): InboxRepository & {
  registerPushDevice(token: string, platform: PushPlatform): Promise<void>;
  unregisterPushDevice(token: string): Promise<void>;
} {
  return {
    async list(): Promise<InboxItem[]> {
      const res = await api.get<NotificationsListResponse>(
        "/v1/notifications",
        notificationsListResponseSchema,
      );
      return res.items;
    },

    async markRead(id: string): Promise<void> {
      await api.patch(`/v1/notifications/${id}/read`, {});
    },

    async markUnread(id: string): Promise<void> {
      await api.patch(`/v1/notifications/${id}/unread`, {});
    },

    async markAllRead(): Promise<void> {
      await api.postNoContent("/v1/notifications/read-all", {});
    },

    async registerPushDevice(token: string, platform: PushPlatform): Promise<void> {
      const payload = registerPushDeviceSchema.parse({ token, platform });
      await api.postNoContent("/v1/me/push-devices", payload);
    },

    async unregisterPushDevice(token: string): Promise<void> {
      await api.delete(`/v1/me/push-devices/${encodeURIComponent(token)}`);
    },
  };
}
