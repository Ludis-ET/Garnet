import type { PlaceView, PlanView, SongView, TogetherRepository } from "@/data/repositories/types";
import type { DemoArt } from "@/data/fixtures/demoDays";
import type { PlanTheme, PlanWhen } from "@/domain/together";
import {
  idResponseSchema,
  togetherPlaceListSchema,
  togetherPlanListSchema,
  togetherSongListSchema,
  type PlanThemeDto,
  type PlanWhenDto,
  type SavePlaceRequest,
  type SavePlanRequest,
  type SaveSongRequest,
  type TogetherPlaceDto,
  type TogetherPlanDto,
  type TogetherSongDto,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import type { ApiClient } from "./client";

function toPlanWhen(when: PlanWhenDto): PlanWhen {
  if (when.kind === "date" && when.detail) {
    return { type: "date", date: when.detail };
  }
  return { type: "someday" };
}

function toContractWhen(when: PlanWhen): PlanWhenDto {
  if (when.type === "date") {
    return { kind: "date", detail: when.date };
  }
  return { kind: "someday" };
}

function toContractTheme(theme: PlanTheme): PlanThemeDto {
  switch (theme) {
    case "Adventure":
      return "project";
    case "Travel":
      return "travel";
    case "Food":
    case "Little things":
      return "date";
    case "Home":
      return "home";
  }
}

function toDomainTheme(theme: PlanThemeDto): PlanTheme {
  switch (theme) {
    case "travel":
      return "Travel";
    case "home":
      return "Home";
    case "project":
      return "Adventure";
    case "date":
      return "Food";
  }
}

function toPlanView(dto: TogetherPlanDto, currentUserId?: string): PlanView {
  const mine = currentUserId ? dto.authorId === currentUserId : true;
  return {
    id: dto.id,
    authorId: dto.authorId,
    title: dto.title,
    note: dto.note,
    theme: toDomainTheme(dto.theme),
    art: (dto.art as DemoArt | null) ?? null,
    place: dto.place,
    when: toPlanWhen(dto.when),
    doneAt: dto.completedAt,
    by: mine ? "Me" : "Partner",
    mine,
  };
}

function toPlaceView(dto: TogetherPlaceDto, currentUserId?: string): PlaceView {
  const mine = currentUserId ? dto.authorId === currentUserId : true;
  return {
    id: dto.id,
    authorId: dto.authorId,
    name: dto.name,
    note: dto.note,
    art: (dto.art as DemoArt | null) ?? null,
    date: dto.createdAt.split("T")[0] ?? "",
    by: mine ? "Me" : "Partner",
    mine,
  };
}

function toSongView(dto: TogetherSongDto, currentUserId?: string): SongView {
  const mine = currentUserId ? dto.authorId === currentUserId : true;
  return {
    id: dto.id,
    authorId: dto.authorId,
    title: dto.title,
    artist: dto.artist,
    link: dto.link,
    note: dto.note,
    addedAt: dto.createdAt,
    by: mine ? "Me" : "Partner",
    mine,
  };
}

export function createHttpTogether(
  api: ApiClient,
  getCurrentUserId?: () => string | undefined,
  sqlite?: SqliteStore,
): TogetherRepository {
  return {
    async plans(): Promise<PlanView[]> {
      const currentUserId = getCurrentUserId?.();
      try {
        const dtos = await api.get("/v1/together/plans", togetherPlanListSchema);
        if (sqlite) {
          for (const p of dtos) {
            await sqlite.saveConfirmedTogether({
              id: p.id,
              relationshipId: "default",
              title: p.title,
              kind: "plan",
              completed: Boolean(p.completedAt),
              completedAt: p.completedAt,
              note: p.note,
              createdAt: p.createdAt,
            });
          }
        }
        return dtos.map((d) => toPlanView(d, currentUserId));
      } catch (err) {
        if (sqlite) {
          const cached = await sqlite.getConfirmedTogether("default");
          if (cached.length > 0) {
            return cached
              .filter((c) => c.kind === "plan")
              .map((c) => ({
                id: c.id,
                authorId: "me",
                title: c.title,
                note: c.note ?? "",
                theme: "Travel" as const,
                art: null,
                place: "",
                when: { type: "someday" as const },
                done: c.completed,
                doneAt: c.completedAt,
                by: "Me",
                mine: true,
              }));
          }
        }
        throw err;
      }
    },

    async savePlan(input: {
      id?: string;
      title: string;
      note: string;
      theme: PlanTheme;
      art: DemoArt | null;
      place: string;
      when: PlanWhen;
    }): Promise<{ id: string }> {
      const body: SavePlanRequest = {
        id: input.id,
        title: input.title,
        note: input.note,
        theme: toContractTheme(input.theme),
        art: input.art,
        place: input.place,
        when: toContractWhen(input.when),
      };
      return api.post("/v1/together/plans", idResponseSchema, body);
    },

    async completePlan(id: string): Promise<void> {
      await api.postNoContent(`/v1/together/plans/${id}/complete`, {});
    },

    async deletePlan(id: string): Promise<void> {
      await api.delete(`/v1/together/plans/${id}`);
    },

    async places(): Promise<PlaceView[]> {
      const dtos = await api.get("/v1/together/places", togetherPlaceListSchema);
      const currentUserId = getCurrentUserId?.();
      return dtos.map((d) => toPlaceView(d, currentUserId));
    },

    async addPlace(input: {
      name: string;
      note: string;
      art: DemoArt | null;
    }): Promise<{ id: string }> {
      const body: SavePlaceRequest = {
        name: input.name,
        note: input.note,
        art: input.art,
      };
      return api.post("/v1/together/places", idResponseSchema, body);
    },

    async deletePlace(id: string): Promise<void> {
      await api.delete(`/v1/together/places/${id}`);
    },

    async songs(): Promise<SongView[]> {
      const dtos = await api.get("/v1/together/songs", togetherSongListSchema);
      const currentUserId = getCurrentUserId?.();
      return dtos.map((d) => toSongView(d, currentUserId));
    },

    async addSong(input: {
      title: string;
      artist: string;
      link: string;
      note: string;
    }): Promise<{ id: string }> {
      const body: SaveSongRequest = {
        title: input.title,
        artist: input.artist,
        link: input.link,
        note: input.note,
      };
      return api.post("/v1/together/songs", idResponseSchema, body);
    },

    async deleteSong(id: string): Promise<void> {
      await api.delete(`/v1/together/songs/${id}`);
    },
  };
}
