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
  createLetterDraftSchema,
  saveLetterDraftSchema,
  sealLetterSchema,
  type CreateLetterDraftRequest,
  type OpenWhenViewDto,
  type SaveLetterDraftRequest,
  type SealLetterRequest,
} from "@garnet/contracts";
import { CurrentViewer, SessionGuard } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { OpenWhenService } from "./open-when.service";

@Controller("v1/letters")
@UseGuards(SessionGuard)
export class OpenWhenController {
  constructor(@Inject(OpenWhenService) private readonly service: OpenWhenService) {}

  @Get()
  async list(@CurrentViewer() viewer: Viewer): Promise<OpenWhenViewDto[]> {
    return this.service.list(viewer);
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<OpenWhenViewDto> {
    return this.service.get(id, viewer);
  }

  @Post("draft")
  async createDraft(
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<OpenWhenViewDto> {
    const input: CreateLetterDraftRequest = createLetterDraftSchema.parse(body);
    return this.service.createDraft(input, viewer);
  }

  @Patch(":id")
  async saveDraft(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<OpenWhenViewDto> {
    const patch: SaveLetterDraftRequest = saveLetterDraftSchema.parse(body);
    return this.service.saveDraft(id, patch, viewer);
  }

  @Post(":id/seal")
  async seal(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentViewer() viewer: Viewer,
  ): Promise<OpenWhenViewDto> {
    const parsed: SealLetterRequest = sealLetterSchema.parse(body);
    return this.service.seal(id, parsed.unlockRule, viewer);
  }

  @Post(":id/open")
  async open(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean; view?: OpenWhenViewDto; reason?: string }> {
    return this.service.open(id, viewer);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @CurrentViewer() viewer: Viewer): Promise<{ ok: boolean }> {
    return this.service.delete(id, viewer);
  }
}
