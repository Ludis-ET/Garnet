import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  saveCollectionSchema,
  saveMemorySchema,
  type MemoryCollectionDto,
  type MemoryDto,
  type SaveCollectionRequest,
  type SaveMemoryRequest,
} from "@garnet/contracts";
import { CurrentViewer, SessionGuard } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { MemoriesService } from "./memories.service";

@Controller("v1/memories")
@UseGuards(SessionGuard)
export class MemoriesController {
  constructor(@Inject(MemoriesService) private readonly service: MemoriesService) {}

  @Get()
  async list(
    @Query("search") search: string | undefined,
    @Query("tag") tag: string | undefined,
    @Query("month") month: string | undefined,
    @CurrentViewer() viewer: Viewer,
  ): Promise<MemoryDto[]> {
    return this.service.list(viewer, {
      ...(search !== undefined ? { search } : {}),
      ...(tag !== undefined ? { tag } : {}),
      ...(month !== undefined ? { month } : {}),
    });
  }

  @Get("collections")
  async collections(@CurrentViewer() viewer: Viewer): Promise<MemoryCollectionDto[]> {
    return this.service.collections(viewer);
  }

  @Post("collections")
  async createCollection(
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<MemoryCollectionDto> {
    const input: SaveCollectionRequest = saveCollectionSchema.parse(body);
    return this.service.createCollection(input, viewer);
  }

  @Delete("collections/:id")
  async deleteCollection(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    await this.service.deleteCollection(id, viewer);
    return { ok: true };
  }

  @Post(":id/collections/:colId")
  async setInCollection(
    @Param("id") id: string,
    @Param("colId") colId: string,
    @Body("inIt") inIt: boolean,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    await this.service.setInCollection(id, colId, inIt, viewer);
    return { ok: true };
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<MemoryDto | null> {
    return this.service.get(id, viewer);
  }

  @Post()
  async save(@Body() body: unknown, @CurrentViewer() viewer: Viewer): Promise<MemoryDto> {
    const input: SaveMemoryRequest = saveMemorySchema.parse(body);
    return this.service.save(input, viewer);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<{ ok: boolean }> {
    await this.service.remove(id, viewer);
    return { ok: true };
  }
}
