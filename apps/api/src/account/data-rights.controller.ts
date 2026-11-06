import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Res } from "@nestjs/common";
import {
  deleteAccountRequestSchema,
  endSpaceRequestSchema,
  reauthRequestSchema,
  type ExportStatusDto,
  type ReauthResponseDto,
} from "@garnet/contracts";
import type { FastifyReply } from "fastify";
import { CurrentViewer, Public } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { parseBody } from "../http/body";
import { DataRightsService } from "./data-rights.service";

/**
 * Data rights, export, space ending and account deletion controller (B-100, B-101, B-120, P-37, P-80).
 */
@Controller("v1/me")
export class DataRightsController {
  constructor(@Inject(DataRightsService) private readonly service: DataRightsService) {}

  @Get("export")
  async getStatus(@CurrentViewer() viewer: Viewer): Promise<ExportStatusDto> {
    return this.service.getExportStatus(viewer);
  }

  @Post("export")
  @HttpCode(200)
  async prepare(@CurrentViewer() viewer: Viewer): Promise<ExportStatusDto> {
    return this.service.prepareExport(viewer);
  }

  @Post("export/expire")
  @HttpCode(204)
  async expire(@CurrentViewer() viewer: Viewer): Promise<void> {
    await this.service.expireExport(viewer);
  }

  @Public()
  @Get("export/download/:token")
  async download(@Param("token") token: string, @Res() res: FastifyReply): Promise<void> {
    const json = await this.service.getExportDownload(token);
    res
      .header("content-type", "application/json; charset=utf-8")
      .header("content-disposition", `attachment; filename="garnet-export-${token}.json"`)
      .send(json);
  }

  @Post("reauth")
  @HttpCode(200)
  async reauth(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<ReauthResponseDto> {
    const { password } = parseBody(reauthRequestSchema, body);
    await this.service.reauth(viewer, password);
    return { ok: true };
  }

  @Post("end-space")
  @HttpCode(204)
  async endSpace(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const { confirmWord } = parseBody(endSpaceRequestSchema, body);
    await this.service.endSpace(viewer, confirmWord);
  }

  @Delete("account")
  @HttpCode(204)
  async deleteAccount(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const { confirmWord } = parseBody(deleteAccountRequestSchema, body);
    await this.service.deleteAccount(viewer, confirmWord);
  }
}
