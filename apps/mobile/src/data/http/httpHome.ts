/**
 * HomeRepository over the Garnet API and SQLite sync (B3, P-81).
 *
 * Replaces mock moments with real SQLite-persisted and synced moments.
 */
import {
  daysOverviewResponseSchema,
  dayDetailResponseSchema,
  sendSignalResponseSchema,
  signalHistoryResponseSchema,
} from "@garnet/contracts";
import type { SignalId } from "@garnet/domain";
import type { HomeRepository, HomeToday, MomentView } from "@/data/repositories/types";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { companionsOf } from "@/data/mock/mockHome";
import type { MockStore } from "@/data/mock/MockStore";
import { viewerOf } from "@/data/mock/viewer";
import { Temporal } from "temporal-polyfill";
import type { ApiClient } from "./client";
import type { SyncEngine } from "../sync/syncEngine";

export function createHttpHome(
  api: ApiClient,
  syncEngine: SyncEngine,
  store: MockStore,
): HomeRepository {
  return {
    today: async (): Promise<HomeToday> => {
      const s = store.read();
      const v = viewerOf(s);
      const now = Temporal.Now.instant();

      // Trigger background sync
      void syncEngine.sync();

      let moments: MomentView[];

      try {
        const overview = await api.get("/v1/days", daysOverviewResponseSchema);
        const day = await api.get(`/v1/days/${overview.today}`, dayDetailResponseSchema);
        moments = day.mine.map((m) => ({
          id: m.id,
          text: m.body,
          emoji: m.emoji ?? "✨",
          at: m.occurredAt,
          visibility: m.visibility,
        }));
      } catch {
        // Fallback to local rebased entries
        const entries = await syncEngine.getVisibleEntries();
        moments = entries
          .filter((e) => e.authorId === v.userId)
          .map((m) => ({
            id: m.id,
            text: m.body,
            emoji: m.emoji ?? "✨",
            at: m.occurredAt,
            visibility: m.visibility,
          }));
      }

      // Preserve existing companions, events, and cards from mirror until B5/B8
      const companions = companionsOf(s, now);

      let incoming: { id: string; signal: SignalId } | null = null;
      try {
        const history = await api.get("/v1/signals", signalHistoryResponseSchema);
        const dismissed = s.home.dismissed;
        const latestPartner = history.signals.find(
          (sig) => !sig.mine && !dismissed.includes(sig.id),
        );
        if (latestPartner !== undefined) {
          incoming = { id: latestPartner.id, signal: latestPartner.signal };
        }
      } catch {
        // Fallback to store
        const latest = [...s.home.incoming].reverse().find((i) => !s.home.dismissed.includes(i.id));
        if (latest !== undefined) {
          incoming = { id: latest.id, signal: latest.signal };
        }
      }

      return {
        me: v.me,
        partner: v.partner,
        partnerActive:
          (s.pairing.byUser[v.userId] ?? EMPTY_PAIRING).partnerName !== null &&
          s.profiles.partner.ready,
        moments,
        event: null,
        waiting: false,
        waitingCount: 0,
        memory: null,
        incoming,
        companions,
      };
    },

    logMoment: async (input: {
      text: string;
      emoji: string;
      share: boolean;
      occurredAt?: string;
    }): Promise<MomentView> => {
      const dto = await syncEngine.createEntry({
        text: input.text.trim(),
        visibility: input.share ? "shared" : "private",
        emoji: input.emoji,
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
      });

      // Background sync push
      void syncEngine.sync();

      return {
        id: dto.id,
        text: dto.body,
        emoji: dto.emoji ?? "✨",
        at: dto.occurredAt,
        visibility: dto.visibility,
      };
    },

    sendSignal: async (signal) => {
      const sentAt = Temporal.Now.instant().toString();
      try {
        const res = await api.post("/v1/signals", sendSignalResponseSchema, {
          signal,
          payload: {},
        });
        return { sentAt: res.sentAt };
      } catch {
        store.update((s) => ({
          ...s,
          home: {
            ...s.home,
            sent: [...s.home.sent, { id: `sig-${Date.now()}`, signal, at: sentAt }],
          },
        }));
        return { sentAt };
      }
    },

    dismissIncoming: (id) => {
      store.update((s) => ({
        ...s,
        home: {
          ...s.home,
          incoming: s.home.incoming.filter((e) => e.id !== id),
        },
      }));
      return Promise.resolve();
    },
  };
}
