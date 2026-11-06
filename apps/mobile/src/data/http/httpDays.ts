/**
 * DaysRepository over the Garnet API with durable SQLite sync (B3, P-81, ADR-0003, F-04).
 */
import {
  dayDetailResponseSchema,
  daysOverviewResponseSchema,
  entryDtoSchema,
  type DayDetailResponse,
  type EntryDto,
} from "@garnet/contracts";
import type {
  DaysRepository,
  DaySummary,
  EntryInput,
  EntryView,
  VisibilityResult,
} from "@/data/repositories/types";
import {
  canChangeVisibility,
  matchesFilter,
  type ActivityId,
  type EntryFilter,
  type EntryKind,
  type FeelingId,
  type RevealState,
  type Visibility,
} from "@/domain/days";
import type { MockStore } from "@/data/mock/MockStore";
import { viewerOf } from "@/data/mock/viewer";
import type { ApiClient } from "./client";
import type { SyncEngine } from "../sync/syncEngine";

function mapToEntryView(
  dto: EntryDto,
  currentUserId: string,
  meName: string,
  partnerName: string,
  state: RevealState,
): EntryView {
  const mine = dto.authorId === currentUserId;
  const isRevealed = state === "ready";
  return {
    id: dto.id,
    mine,
    authorName: mine ? meName : partnerName,
    kind: (dto.kind === "custom" ? "text" : dto.kind) as EntryKind,
    text: dto.body,
    emoji: dto.emoji ?? "✨",
    at: dto.occurredAt,
    visibility: dto.visibility,
    ...(dto.mood ? { mood: dto.mood as FeelingId } : {}),
    ...(dto.activity ? { activity: dto.activity as ActivityId } : {}),
    ...(dto.place ? { place: dto.place } : {}),
    editable: mine && !isRevealed,
  };
}

export function createHttpDays(
  api: ApiClient,
  syncEngine: SyncEngine,
  store: MockStore,
): DaysRepository {
  const getProfiles = () => {
    const v = viewerOf(store.read());
    return { userId: v.userId, me: v.me, partner: v.partner };
  };

  return {
    overview: async () => {
      // Trigger background sync
      void syncEngine.sync();

      const { userId, me, partner } = getProfiles();
      try {
        const res = await api.get("/v1/days", daysOverviewResponseSchema);
        const days: DaySummary[] = res.days.map((d) => ({
          date: d.date,
          isToday: d.isToday,
          preview: d.preview,
          thumb: null,
          me: d.me,
          partner: d.partner,
          state: d.state,
        }));
        return { today: res.today, days, me, partner };
      } catch {
        // Offline fallback from local sync engine
        const entries = await syncEngine.getVisibleEntries();
        const todayStr = new Date().toISOString().slice(0, 10);
        return {
          today: todayStr,
          days: [
            {
              date: todayStr,
              isToday: true,
              preview: entries.slice(0, 4).map((e) => e.emoji ?? "✨"),
              thumb: null,
              me: entries.some((e) => e.authorId === userId),
              partner: entries.some((e) => e.authorId !== userId),
              state: "open",
            },
          ],
          me,
          partner,
        };
      }
    },

    day: async (date: string) => {
      void syncEngine.sync();
      const { userId, me, partner } = getProfiles();

      let detail: DayDetailResponse;
      try {
        detail = await api.get(`/v1/days/${date}`, dayDetailResponseSchema);
      } catch {
        const entries = await syncEngine.getVisibleEntries();
        const todayStr = new Date().toISOString().slice(0, 10);
        detail = {
          date,
          isToday: date === todayStr,
          mine: entries.filter((e) => e.authorId === userId),
          partner: entries.filter(
            (e) => e.authorId !== userId && (e.visibility === "shared" || e.revealedAt !== null),
          ),
          state: "open",
          meReady: false,
          partnerReady: false,
        };
      }

      return {
        date: detail.date,
        isToday: detail.isToday,
        mine: detail.mine.map((e) =>
          mapToEntryView(e, userId, me.name, partner.name, detail.state),
        ),
        partner: detail.partner.map((e) =>
          mapToEntryView(e, userId, me.name, partner.name, detail.state),
        ),
        state: detail.state,
        me,
        partnerPerson: partner,
      };
    },

    entry: async (id: string) => {
      const { userId, me, partner } = getProfiles();
      const local = await syncEngine.getEntryById(id);
      if (local) {
        return mapToEntryView(local, userId, me.name, partner.name, "open");
      }

      try {
        const dto = await api.get(`/v1/entries/${id}`, entryDtoSchema);
        return mapToEntryView(
          dto,
          userId,
          me.name,
          partner.name,
          dto.revealedAt ? "ready" : "open",
        );
      } catch {
        return null;
      }
    },

    save: async (input: EntryInput) => {
      const { userId, me, partner } = getProfiles();
      let dto: EntryDto;

      if (input.id) {
        const existing = await syncEngine.getEntryById(input.id);
        const visibility =
          existing !== null && !canChangeVisibility(existing.visibility, input.visibility)
            ? existing.visibility
            : input.visibility;

        dto = await syncEngine.editEntry(input.id, {
          text: input.text.trim(),
          emoji: input.emoji,
          ...(input.mood !== undefined ? { mood: input.mood } : {}),
          ...(input.activity !== undefined ? { activity: input.activity } : {}),
          ...(input.place !== undefined ? { place: input.place } : {}),
          ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
        });

        if (existing !== null && visibility !== existing.visibility) {
          await syncEngine.shareEntry(
            input.id,
            visibility === "afterReveal" ? "afterReveal" : "shared",
          );
        }
      } else {
        dto = await syncEngine.createEntry({
          kind: input.kind,
          text: input.text.trim(),
          emoji: input.emoji,
          visibility: input.visibility,
          ...(input.mood !== undefined ? { mood: input.mood } : {}),
          ...(input.activity !== undefined ? { activity: input.activity } : {}),
          ...(input.place !== undefined ? { place: input.place } : {}),
          ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
        });
      }

      // Background push
      void syncEngine.sync();
      return mapToEntryView(dto, userId, me.name, partner.name, "open");
    },

    setVisibility: async (id: string, visibility: Visibility): Promise<VisibilityResult> => {
      const entry = await syncEngine.getEntryById(id);
      if (!entry) return { ok: false, reason: "read-only" };
      if (!canChangeVisibility(entry.visibility, visibility)) {
        return { ok: false, reason: "shared-stays-shared" };
      }
      await syncEngine.shareEntry(id, visibility === "afterReveal" ? "afterReveal" : "shared");
      void syncEngine.sync();
      return { ok: true };
    },

    remove: async (id: string) => {
      await syncEngine.deleteEntry(id);
      void syncEngine.sync();
    },

    retryUpload: async () => {
      await syncEngine.sync();
    },

    finishDay: async (date: string) => {
      try {
        await api.post(`/v1/days/${date}/finish`, dayDetailResponseSchema, {});
        void syncEngine.sync();
      } catch {
        // Queue or ignore if offline
      }
    },

    search: async (filter: EntryFilter) => {
      const { userId, me, partner } = getProfiles();
      const entries = await syncEngine.getVisibleEntries();
      const views = entries.map((e) => mapToEntryView(e, userId, me.name, partner.name, "open"));

      const matched = views.filter((v) => matchesFilter(v, filter));
      const byDate = new Map<string, EntryView[]>();

      for (const item of matched) {
        const d = item.at.slice(0, 10);
        const group = byDate.get(d) ?? [];
        group.push(item);
        byDate.set(d, group);
      }

      return Array.from(byDate.entries()).map(([date, items]) => ({
        date,
        entries: items,
      }));
    },
  };
}
