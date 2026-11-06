import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  commitMediaSchema,
  requestUploadSchema,
  type CommitMediaDto,
  type CommitMediaResponse,
  type MediaUrlResponse,
  type RequestUploadDto,
  type RequestUploadResponse,
} from "@garnet/contracts";
import { CurrentViewer, SessionGuard } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { MediaService } from "./media.service";
import { MediaPurgeService } from "./media-purge.service";

@Controller("v1/media")
@UseGuards(SessionGuard)
export class MediaController {
  constructor(
    @Inject(MediaService) private readonly mediaService: MediaService,
    @Inject(MediaPurgeService) private readonly purgeService: MediaPurgeService,
  ) {}

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  async requestUpload(
    @CurrentViewer() viewer: Viewer,
    @Body() body: RequestUploadDto,
  ): Promise<RequestUploadResponse> {
    const input = requestUploadSchema.parse(body);
    return this.mediaService.requestUpload(viewer, input);
  }

  @Post(":id/commit")
  @HttpCode(HttpStatus.OK)
  async commit(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
    @Body() body: CommitMediaDto,
  ): Promise<CommitMediaResponse> {
    const input = commitMediaSchema.parse(body);
    return this.mediaService.commit(viewer, id, input);
  }

  @Get(":id/url")
  @HttpCode(HttpStatus.OK)
  async getUrl(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
  ): Promise<MediaUrlResponse> {
    return this.mediaService.getDownloadUrl(viewer, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@CurrentViewer() viewer: Viewer, @Param("id") id: string): Promise<void> {
    return this.mediaService.deleteMedia(viewer, id);
  }

  @Post("admin/purge")
  @HttpCode(HttpStatus.OK)
  async runPurge(): Promise<{ purged: number; failed: number }> {
    return this.purgeService.runPurge();
  }
}
