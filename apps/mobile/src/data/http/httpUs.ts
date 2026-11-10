import type { AvatarDto } from "@garnet/contracts";
import { avatarFromDto } from "./avatar";
/**
 * UsRepository over the Garnet API (B4, B-51, US-01 to US-10, P-07, P-66, §5).
 *
 * Communicates with real backend endpoints for emotional signals, partner presets,
 * and coarse distance (~11 km resolution, P-66).
 *
 * Deliberately absent (§5):
 * - No read receipts, "seen" state, escalation, or relationship metrics.
 */
import {
  sendSignalResponseSchema,
  signalHistoryResponseSchema,
  usOverviewResponseSchema,
  type SignalPayloadDto,
} from "@garnet/contracts";
import type { SignalId } from "@garnet/domain";
import type { AvatarChoice } from "@/data/fixtures/demoProfile";
import type { SignalPayload, SignalResponse } from "@/domain/us";
import type { SignalItem, UsOverview, UsRepository } from "@/data/repositories/types";
import type { ApiClient } from "./client";

/** The API's picture as the app's (P-98). */
function toAvatar(a: AvatarDto): AvatarChoice {
  return avatarFromDto(a, "me");
}

function toSignalPayload(dto: SignalPayloadDto): SignalPayload {
  const payload: SignalPayload = {};
  if (dto.note !== undefined) payload.note = dto.note;
  if (dto.level !== undefined) payload.level = dto.level;
  if (dto.need !== undefined) payload.need = dto.need;
  if (dto.topic !== undefined) payload.topic = dto.topic;
  if (dto.when !== undefined) payload.when = dto.when;
  if (dto.options !== undefined) payload.options = dto.options;
  if (dto.attachments !== undefined) payload.attachments = dto.attachments;
  return payload;
}

export function createHttpUs(api: ApiClient): UsRepository {
  return {
    overview: async (): Promise<UsOverview> => {
      const res = await api.get("/v1/us/overview", usOverviewResponseSchema);
      return {
        me: {
          name: res.me.name,
          side: res.me.side,
          zone: res.me.zone,
          ...(res.me.avatar !== undefined ? { avatar: toAvatar(res.me.avatar) } : {}),
        },
        partner: {
          name: res.partner.name,
          side: res.partner.side,
          zone: res.partner.zone,
        },
        distance: res.distance,
        openSupport: res.openSupport
          ? {
              id: res.openSupport.id,
              signal: res.openSupport.signal,
              mine: res.openSupport.mine,
              at: res.openSupport.at,
              payload: toSignalPayload(res.openSupport.payload),
              responses: res.openSupport.responses,
            }
          : null,
        recent: res.recent.map((s) => ({
          id: s.id,
          signal: s.signal,
          mine: s.mine,
          at: s.at,
          payload: toSignalPayload(s.payload),
          responses: s.responses,
        })),
      };
    },

    history: async (): Promise<SignalItem[]> => {
      const res = await api.get("/v1/signals", signalHistoryResponseSchema);
      return res.signals.map((s) => ({
        id: s.id,
        signal: s.signal,
        mine: s.mine,
        at: s.at,
        payload: toSignalPayload(s.payload),
        responses: s.responses,
      }));
    },

    send: async (signal: SignalId, payload: SignalPayload): Promise<{ sentAt: string }> => {
      const res = await api.post("/v1/signals", sendSignalResponseSchema, {
        signal,
        payload,
      });
      return { sentAt: res.sentAt };
    },

    respond: async (id: string, response: SignalResponse): Promise<void> => {
      await api.postNoContent(`/v1/signals/${id}/respond`, {
        response,
      });
    },

    saveLocation: async (point: { lat: number; lon: number } | null): Promise<void> => {
      await api.put("/v1/me/location", {
        lat: point?.lat ?? null,
        lon: point?.lon ?? null,
      });
    },
  };
}
