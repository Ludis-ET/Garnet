import type { SurprisesRepository } from "@/data/repositories/types";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import {
  GENERIC_SURPRISE_TITLE,
  type SurpriseContent,
  type SurpriseKind,
  type SurpriseReveal,
  type SurpriseView,
} from "@/domain/surprises";
import type { PaperFont, PaperTone } from "@/domain/models";
import {
  idResponseSchema,
  listSurprisesResponseSchema,
  surpriseViewSchema,
  type CreateSurpriseRequest,
  type SurpriseContentDto,
  type SurpriseRevealDto,
  type SurpriseViewDto,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import type { ApiClient } from "./client";

function toDomainReveal(dto: SurpriseRevealDto): SurpriseReveal {
  if (dto.kind === "now") {
    return { type: "now" };
  }
  if (dto.kind === "date") {
    return { type: "date", at: dto.date };
  }
  return { type: "event", title: "Event", at: new Date().toISOString() };
}

function toContractReveal(r: SurpriseReveal): SurpriseRevealDto {
  if (r.type === "now") {
    return { kind: "now" };
  }
  if (r.type === "date") {
    return { kind: "date", date: r.at };
  }
  return { kind: "now" };
}

function toDomainContent(dto: SurpriseContentDto): SurpriseContent {
  const kind: SurpriseKind = dto.kind === "idea" ? "idea" : dto.kind;
  return {
    kind,
    text: dto.textContent ?? "",
    media: (dto.mediaRef as DemoMedia | null) ?? null,
    song: dto.songInfo ? { title: dto.songInfo.title, link: dto.songInfo.link ?? "" } : null,
    ...(dto.paper
      ? {
          paper: {
            tone: dto.paper.paper as PaperTone,
            font: dto.paper.font as PaperFont,
          },
        }
      : {}),
  };
}

function toContractContent(c: SurpriseContent): SurpriseContentDto {
  const kind = c.kind === "message" ? "idea" : c.kind;
  return {
    kind,
    textContent: c.text,
    mediaRef: c.media ?? undefined,
    songInfo: c.song ? { title: c.song.title, link: c.song.link } : undefined,
    paper: c.paper
      ? {
          paper: c.paper.tone === "rose" ? "rose" : "cream",
          font: c.paper.font === "clean" ? "sans" : "serif",
        }
      : undefined,
  };
}

function toSurpriseView(dto: SurpriseViewDto, currentUserId?: string): SurpriseView {
  const fromMe = currentUserId ? dto.authorId === currentUserId : false;
  const title = dto.safeTitle ?? GENERIC_SURPRISE_TITLE;

  if (dto.state === "scheduled") {
    return {
      kind: "locked",
      id: dto.id,
      title,
      fromMe,
      ready: true,
      reveal: toDomainReveal(dto.reveal),
      content: null,
      safeTitle: dto.safeTitle,
    };
  }

  if (dto.state === "opened") {
    return {
      kind: "opened",
      id: dto.id,
      title,
      fromMe,
      openedAt: dto.openedAt,
      content: toDomainContent(dto.content),
    };
  }

  return {
    kind: "cancelled",
    id: dto.id,
    title,
    fromMe,
  };
}

export function createHttpSurprises(
  api: ApiClient,
  getCurrentUserId?: () => string | undefined,
  sqlite?: SqliteStore,
): SurprisesRepository {
  return {
    async list(): Promise<{ partnerName: string; items: SurpriseView[] }> {
      const currentUserId = getCurrentUserId?.();
      try {
        const res = await api.get("/v1/surprises", listSurprisesResponseSchema);
        if (sqlite) {
          for (const s of res.items) {
            const unlockAt =
              s.state !== "cancelled" && s.reveal.kind === "date" ? s.reveal.date : null;
            const openedAt = s.state === "opened" ? s.openedAt : null;
            await sqlite.saveConfirmedSurprise({
              id: s.id,
              relationshipId: "default",
              authorId: s.authorId,
              recipientId: s.recipientId,
              title: s.safeTitle ?? "A surprise for you",
              note: null,
              status: s.state,
              unlockAt,
              openedAt,
              createdAt: s.createdAt,
            });
          }
        }
        return {
          partnerName: res.partnerName,
          items: res.items.map((i) => toSurpriseView(i, currentUserId)),
        };
      } catch (err) {
        if (sqlite) {
          const cached = await sqlite.getConfirmedSurprises("default");
          if (cached.length > 0) {
            return {
              partnerName: "Partner",
              items: cached.map(
                (c) =>
                  ({
                    kind: c.status === "opened" ? "opened" : "locked",
                    id: c.id,
                    title: c.title,
                    fromMe: currentUserId ? c.authorId === currentUserId : false,
                    ready: true,
                    reveal: { type: "now" },
                    content: null,
                    safeTitle: c.title,
                  }) as SurpriseView,
              ),
            };
          }
        }
        throw err;
      }
    },

    async get(id: string): Promise<SurpriseView> {
      const dto = await api.get(`/v1/surprises/${id}`, surpriseViewSchema);
      return toSurpriseView(dto, getCurrentUserId?.());
    },

    async create(input: {
      content: SurpriseContent;
      safeTitle: string | null;
      reveal: SurpriseReveal;
    }): Promise<{ id: string }> {
      const body: CreateSurpriseRequest = {
        content: toContractContent(input.content),
        safeTitle: input.safeTitle,
        reveal: toContractReveal(input.reveal),
      };
      return api.post("/v1/surprises", idResponseSchema, body);
    },

    async open(id: string): Promise<SurpriseView> {
      const dto = await api.post(`/v1/surprises/${id}/open`, surpriseViewSchema, {});
      return toSurpriseView(dto, getCurrentUserId?.());
    },

    async cancel(id: string): Promise<void> {
      await api.postNoContent(`/v1/surprises/${id}/cancel`, {});
    },

    async retitle(id: string, title: string | null): Promise<void> {
      await api.patch(`/v1/surprises/${id}/retitle`, { safeTitle: title });
    },

    retry(id: string): Promise<void> {
      if (!id) return Promise.resolve();
      return Promise.resolve();
    },
  };
}
