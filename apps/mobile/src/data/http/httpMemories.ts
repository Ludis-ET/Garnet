import type {
  CollectionView,
  MemoriesRepository,
  MemoryInput,
  MemoryView,
} from "@/data/repositories/types";
import type { DemoArt, DemoMedia } from "@/data/fixtures/demoDays";
import { matchesMemory, type MemoryFilter } from "@/domain/memories";
import {
  memoryCollectionListSchema,
  memoryCollectionSchema,
  memoryListSchema,
  memorySchema,
  type MemoryCollectionDto,
  type MemoryDto,
  type SaveCollectionRequest,
  type SaveMemoryRequest,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import type { ApiClient } from "./client";

function toMemoryView(dto: MemoryDto, currentUserId?: string): MemoryView {
  const mine = currentUserId ? dto.authorId === currentUserId : true;
  return {
    id: dto.id,
    mine,
    authorName: mine ? "Me" : "Partner",
    authorSide: mine ? "ruby" : "sapphire",
    title: dto.title,
    story: dto.story,
    date: dto.date,
    place: dto.place,
    media: (dto.media as DemoMedia | null) ?? null,
    kind: dto.kind,
    tags: dto.tags,
    collections: dto.collections,
  };
}

function toCollectionView(dto: MemoryCollectionDto): CollectionView {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    art: dto.art as DemoArt,
    count: dto.count ?? 0,
    cover: null,
  };
}

export function createHttpMemories(
  api: ApiClient,
  getCurrentUserId?: () => string | undefined,
  sqlite?: SqliteStore,
): MemoriesRepository {
  return {
    async list(filter: MemoryFilter): Promise<MemoryView[]> {
      const currentUserId = getCurrentUserId?.();
      try {
        const dtos = await api.get("/v1/memories", memoryListSchema);
        if (sqlite) {
          for (const m of dtos) {
            await sqlite.saveConfirmedMemory({
              id: m.id,
              relationshipId: "default",
              title: m.title,
              note: m.story,
              mediaId: typeof m.media === "string" ? m.media : null,
              savedAt: m.date,
            });
          }
        }
        const views = dtos.map((d) => toMemoryView(d, currentUserId));
        return views.filter((m) =>
          matchesMemory(
            {
              title: m.title,
              story: m.story,
              kind: m.kind,
              mine: m.mine,
              tags: m.tags,
              collectionIds: m.collections.map((c) => c.id),
            },
            filter,
          ),
        );
      } catch (err) {
        if (sqlite) {
          const cached = await sqlite.getConfirmedMemories("default");
          if (cached.length > 0) {
            return cached.map((c) => ({
              id: c.id,
              mine: true,
              authorName: "Me",
              authorSide: "ruby" as const,
              title: c.title,
              story: c.note ?? "",
              date: c.savedAt,
              place: "",
              media: null,
              kind: "text" as const,
              tags: [],
              collections: [],
            }));
          }
        }
        throw err;
      }
    },

    async get(id: string): Promise<MemoryView | null> {
      try {
        const dto = await api.get(`/v1/memories/${id}`, memorySchema);
        return toMemoryView(dto, getCurrentUserId?.());
      } catch {
        return null;
      }
    },

    async save(input: MemoryInput): Promise<MemoryView> {
      const kind = input.media === null ? "text" : input.media.type;
      const body: SaveMemoryRequest = {
        id: input.id,
        title: input.title,
        story: input.story,
        date: input.date,
        place: input.place,
        kind,
        media: input.media,
        tags: input.tags,
        collectionIds: input.collectionIds,
      };

      const dto = await api.post("/v1/memories", memorySchema, body);
      return toMemoryView(dto, getCurrentUserId?.());
    },

    async remove(id: string): Promise<void> {
      await api.delete(`/v1/memories/${id}`);
    },

    async collections(): Promise<CollectionView[]> {
      const dtos = await api.get("/v1/memories/collections", memoryCollectionListSchema);
      return dtos.map(toCollectionView);
    },

    async collection(
      id: string,
    ): Promise<{ collection: CollectionView; memories: MemoryView[] } | null> {
      const allCols = await this.collections();
      const col = allCols.find((c) => c.id === id);
      if (!col) return null;

      const memories = await this.list({
        query: "",
        kinds: [],
        who: "both",
        collectionId: id,
      });

      return { collection: col, memories };
    },

    async createCollection(input: { title: string; description: string }): Promise<CollectionView> {
      const body: SaveCollectionRequest = {
        title: input.title,
        description: input.description,
        art: "sunrise",
      };
      const dto = await api.post("/v1/memories/collections", memoryCollectionSchema, body);
      return toCollectionView(dto);
    },

    async deleteCollection(id: string): Promise<void> {
      await api.delete(`/v1/memories/collections/${id}`);
    },

    async setInCollection(memoryId: string, collectionId: string, inIt: boolean): Promise<void> {
      await api.postNoContent(`/v1/memories/${memoryId}/collections/${collectionId}`, { inIt });
    },

    start(): Promise<string> {
      return Promise.resolve("2024-10-15");
    },
  };
}
