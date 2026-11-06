import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createSurpriseSchema,
  retitleSurpriseSchema,
  type CreateSurpriseRequest,
  type RetitleSurpriseRequest,
  type SurpriseViewDto,
} from "@garnet/contracts";
import { CurrentViewer, SessionGuard } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { SurprisesService } from "./surprises.service";

@Controller("v1/surprises")
@UseGuards(SessionGuard)
export class SurprisesController {
  constructor(@Inject(SurprisesService) private readonly service: SurprisesService) {}

  @Get()
  async list(
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ partnerName: string; items: SurpriseViewDto[] }> {
    return this.service.list(viewer);
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<SurpriseViewDto> {
    return this.service.get(id, viewer);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentViewer() viewer: Viewer): Promise<{ id: string }> {
    const input: CreateSurpriseRequest = createSurpriseSchema.parse(body);
    return this.service.create(input, viewer);
  }

  @Post(":id/open")
  async open(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<SurpriseViewDto> {
    return this.service.open(id, viewer);
  }

  @Patch(":id/retitle")
  async retitle(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    const parsed: RetitleSurpriseRequest = retitleSurpriseSchema.parse(body);
    await this.service.retitle(id, parsed.safeTitle, viewer);
    return { ok: true };
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<{ ok: boolean }> {
    await this.service.cancel(id, viewer);
    return { ok: true };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<{ ok: boolean }> {
    await this.service.delete(id, viewer);
    return { ok: true };
  }
}
