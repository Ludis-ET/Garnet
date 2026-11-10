/**
 * HomeRepository over the Garnet API and SQLite sync (B3, P-81).
 *
 * Replaces mock moments with real SQLite-persisted and synced moments.
 */
import {
  daysOverviewResponseSchema,
  dayDetailResponseSchema,
  listEventsResponseSchema,
  memoryListSchema,
  openWhenListSchema,
  pairingStatusSchema,
  sendSignalResponseSchema,
  signalHistoryResponseSchema,
} from "@garnet/contracts";
import type { SignalId } from "@garnet/domain";
import { kindOf } from "@/domain/events";
import { daysUntil, todayIn } from "@/domain/home";
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

      // Real aggregate queries (B3/B5/B8)
      let event: HomeToday["event"] = null;
      try {
        const eventsRes = await api.get("/v1/events", listEventsResponseSchema);
        const today = todayIn(now, v.me.zone);
        const upcomingEvents = eventsRes.events
          .map((e) => {
            const targetStr = e.nextOccurrence ?? e.firstDate;
            const date = Temporal.PlainDate.from(targetStr);
            const diff = daysUntil(today, date);
            return { e, targetStr, date, daysAway: diff };
          })
          .filter((item) => item.daysAway >= 0)
          .sort((a, b) => a.daysAway - b.daysAway);

        const first = upcomingEvents[0];
        if (first !== undefined) {
          event = {
            id: first.e.id,
            kind: first.e.kind,
            title: first.e.title,
            emoji: kindOf(first.e.kind).emoji,
            date: first.targetStr,
            daysAway: first.daysAway,
          };
        }
      } catch {
        // Fallback to null
      }

      let waiting = false;
      let waitingCount = 0;
      try {
        const openWhenLetters = await api.get("/v1/open-when", openWhenListSchema);
        const readyLetters = openWhenLetters.filter(
          (l) => l.status === "sealed" && l.recipientId === v.userId,
        );
        waitingCount = readyLetters.length;
        waiting = waitingCount > 0;
      } catch {
        // Fallback to 0
      }

      let memory: HomeToday["memory"] = null;
      try {
        const memoryList = await api.get("/v1/memories", memoryListSchema);
        if (memoryList.length > 0) {
          const today = todayIn(now, v.me.zone);
          const pick = memoryList[today.dayOfYear % memoryList.length];
          if (pick !== undefined) {
            memory = {
              id: pick.id,
              title: pick.title,
              art: "sunrise",
              date: pick.date,
            };
          }
        }
      } catch {
        // Fallback to null
      }

      let partnerActive =
        (s.pairing.byUser[v.userId] ?? EMPTY_PAIRING).partnerName !== null &&
        s.profiles.partner.ready;
      try {
        const pairingRes = await api.get("/v1/pairing", pairingStatusSchema);
        if (pairingRes.partnerName !== null) {
          partnerActive = true;
        }
      } catch {
        // Fallback to store
      }

      return {
        me: v.me,
        partner: v.partner,
        partnerActive,
        moments,
        event,
        waiting,
        waitingCount,
        memory,
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
