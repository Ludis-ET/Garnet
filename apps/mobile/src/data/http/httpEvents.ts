import type {
  ChapterDetail,
  ChapterSummary,
  EventInput,
  EventsRepository,
  EventView,
  HomePerson,
  SaveEventResult,
} from "@/data/repositories/types";
import type { DemoArt } from "@/data/fixtures/demoDays";
import { kindOf, type ChapterPromptId, type ReminderId } from "@/domain/events";
import type { GemSide } from "@/domain/identity";
import {
  calendarEventSchema,
  chapterDetailResponseSchema,
  chapterSummaryListSchema,
  idResponseSchema,
  listEventsResponseSchema,
  type CalendarEventDto,
  type SaveEventRequest,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import type { ApiClient } from "./client";

function toEventView(dto: CalendarEventDto, currentUserId?: string): EventView {
  return {
    id: dto.id,
    title: dto.title,
    kind: dto.kind,
    emoji: kindOf(dto.kind).emoji,
    first: dto.firstDate,
    next: dto.nextOccurrence ?? dto.firstDate,
    daysAway: null,
    occurrence: 0,
    time: dto.eventTime ?? null,
    zone: dto.timeZone ?? null,
    times: dto.times ?? null,
    repeats: dto.repeats,
    whose: dto.whose ?? null,
    description: dto.description ?? "",
    reminders: (dto.reminders ?? []) as ReminderId[],
    art: (dto.art as DemoArt | null) ?? "sunrise",
    mine: currentUserId ? dto.authorId === currentUserId : true,
  };
}

interface ReflectionAnswer {
  id: string;
  name: string;
  side: GemSide | null;
  text: string;
  mine: boolean;
}

export function createHttpEvents(
  api: ApiClient,
  getCurrentUserId?: () => string | undefined,
  sqlite?: SqliteStore,
): EventsRepository {
  return {
    async list(): Promise<{
      today: string;
      me: HomePerson;
      partner: HomePerson;
      events: EventView[];
    }> {
      const currentUserId = getCurrentUserId?.();
      try {
        const res = await api.get("/v1/events", listEventsResponseSchema);
        if (sqlite) {
          for (const e of res.events) {
            await sqlite.saveConfirmedEvent({
              id: e.id,
              relationshipId: "default",
              title: e.title,
              date: e.firstDate,
              repeats: e.repeats,
              inDays: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
        return {
          today: res.today,
          me: { name: "Me", side: "ruby", zone: "UTC" },
          partner: { name: "Partner", side: "sapphire", zone: "UTC" },
          events: res.events.map((e) => toEventView(e, currentUserId)),
        };
      } catch (err) {
        if (sqlite) {
          const cached = await sqlite.getConfirmedEvents("default");
          if (cached.length > 0) {
            return {
              today: new Date().toISOString().slice(0, 10),
              me: { name: "Me", side: "ruby", zone: "UTC" },
              partner: { name: "Partner", side: "sapphire", zone: "UTC" },
              events: cached.map(
                (c) =>
                  ({
                    id: c.id,
                    title: c.title,
                    kind: "anniversary",
                    emoji: "✨",
                    first: c.date ?? "",
                    next: c.date ?? "",
                    daysAway: null,
                    occurrence: 0,
                    time: null,
                    zone: null,
                    times: null,
                    repeats: c.repeats ?? "never",
                    whose: null,
                    description: "",
                    reminders: [],
                    art: "sunrise",
                    mine: true,
                  }) as EventView,
              ),
            };
          }
        }
        throw err;
      }
    },

    async get(id: string): Promise<EventView | null> {
      try {
        const dto = await api.get(`/v1/events/${id}`, calendarEventSchema);
        return toEventView(dto, getCurrentUserId?.());
      } catch {
        return null;
      }
    },

    async save(input: EventInput): Promise<SaveEventResult> {
      if (!input.title.trim()) {
        return { ok: false, reason: "empty-title" };
      }

      const body: SaveEventRequest = {
        id: input.id,
        title: input.title,
        kind: input.kind,
        firstDate: input.date,
        eventTime: input.time,
        timeZone: input.zone,
        repeats: input.repeats,
        whose: input.whose,
        description: input.description,
        reminders: input.reminders,
        art: input.art,
      };

      const res = await api.post("/v1/events", idResponseSchema, body);
      const saved = await this.get(res.id);
      if (!saved) return { ok: false, reason: "empty-title" };
      return { ok: true, event: saved };
    },

    async remove(id: string): Promise<void> {
      await api.delete(`/v1/events/${id}`);
    },

    async chapters(): Promise<ChapterSummary[]> {
      const summaries = await api.get("/v1/events/chapters", chapterSummaryListSchema);
      return summaries.map((s, idx) => ({
        month: s.month,
        number: idx + 1,
        title: s.title,
        from: `${s.month}-01`,
        to: `${s.month}-28`,
        art: "sunrise",
        current: idx === 0,
        memoryCount: s.reflectionCount,
      }));
    },

    async chapter(month: string): Promise<ChapterDetail | null> {
      const res = await api.get(`/v1/events/chapters/${month}`, chapterDetailResponseSchema);
      const currentUserId = getCurrentUserId?.();

      const promptMap = new Map<string, ReflectionAnswer[]>();
      for (const r of res.reflections) {
        const answers = promptMap.get(r.promptId) ?? [];
        answers.push({
          id: r.promptId,
          name: r.userId === currentUserId ? "Me" : "Partner",
          side: null,
          text: r.reflection,
          mine: r.userId === currentUserId,
        });
        promptMap.set(r.promptId, answers);
      }

      return {
        month,
        number: 1,
        title: res.title,
        from: `${month}-01`,
        to: `${month}-28`,
        art: "sunrise",
        current: true,
        memoryCount: res.reflections.length,
        memories: [],
        reflections: Array.from(promptMap.entries()).map(([prompt, answers]) => ({
          prompt: prompt as ChapterPromptId,
          answers,
        })),
      };
    },

    async reflect(month: string, prompt: ChapterPromptId, text: string): Promise<void> {
      await api.postNoContent(`/v1/events/chapters/${month}/reflect/${prompt}`, {
        reflection: text,
      });
    },

    async rename(month: string, title: string): Promise<void> {
      await api.postNoContent(`/v1/events/chapters/${month}/rename`, { title });
    },
  };
}
