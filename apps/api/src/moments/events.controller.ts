import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import {
  reflectChapterSchema,
  renameChapterSchema,
  saveEventSchema,
  type CalendarEventDto,
  type ChapterReflectionDto,
  type ChapterSummaryDto,
  type ReflectChapterRequest,
  type RenameChapterRequest,
  type SaveEventRequest,
} from "@garnet/contracts";
import { CurrentViewer, SessionGuard } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { EventsService } from "./events.service";

@Controller("v1/events")
@UseGuards(SessionGuard)
export class EventsController {
  constructor(@Inject(EventsService) private readonly service: EventsService) {}

  @Get()
  async list(@CurrentViewer() viewer: Viewer): Promise<{
    today: string;
    events: (CalendarEventDto & {
      nextOccurrence: string | null;
      times: { me: string; partner: string } | null;
    })[];
  }> {
    return this.service.list(viewer);
  }

  @Get("chapters")
  async chapters(@CurrentViewer() viewer: Viewer): Promise<ChapterSummaryDto[]> {
    return this.service.chapters(viewer);
  }

  @Get("chapters/:month")
  async chapter(
    @Param("month") month: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ title: string; reflections: ChapterReflectionDto[] }> {
    return this.service.chapterReflections(month, viewer);
  }

  @Post("chapters/:month/reflect/:promptId")
  async reflect(
    @Param("month") month: string,
    @Param("promptId") promptId: string,
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    const parsed: ReflectChapterRequest = reflectChapterSchema.parse(body);
    await this.service.reflect(month, promptId, parsed.reflection, viewer);
    return { ok: true };
  }

  @Post("chapters/:month/rename")
  async renameChapter(
    @Param("month") month: string,
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    const parsed: RenameChapterRequest = renameChapterSchema.parse(body);
    await this.service.renameChapter(month, parsed.title, viewer);
    return { ok: true };
  }

  @Get(":id")
  async get(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<CalendarEventDto | null> {
    return this.service.get(id, viewer);
  }

  @Post()
  async save(@Body() body: unknown, @CurrentViewer() viewer: Viewer): Promise<{ id: string }> {
    const input: SaveEventRequest = saveEventSchema.parse(body);
    return this.service.save(input, viewer);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<{ ok: boolean }> {
    await this.service.remove(id, viewer);
    return { ok: true };
  }
}
