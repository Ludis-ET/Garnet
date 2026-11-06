import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put } from "@nestjs/common";
import {
  respondSignalRequestSchema,
  saveLocationRequestSchema,
  sendSignalRequestSchema,
  type SendSignalResponse,
  type SignalHistoryResponse,
  type UsOverviewResponse,
} from "@garnet/contracts";
import { CurrentViewer } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { parseBody } from "../http/body";
import { SignalsService } from "./signals.service";

/**
 * Signals and Us endpoints (B4, B-51, US-01 to US-10, P-07, P-66, §5):
 * - GET /v1/us/overview: Us screen overview (distance, open support signal, recent signals).
 * - GET /v1/signals: signal history (chronological newest first).
 * - POST /v1/signals: send an emotional signal.
 * - POST /v1/signals/:id/respond: partner response preset.
 * - PUT /v1/me/location: update or clear coarse location (~11 km resolution).
 */
@Controller("v1")
export class SignalsController {
  constructor(@Inject(SignalsService) private readonly signalsService: SignalsService) {}

  @Get("us/overview")
  async getOverview(@CurrentViewer() viewer: Viewer): Promise<UsOverviewResponse> {
    return this.signalsService.getOverview(viewer);
  }

  @Get("signals")
  async getHistory(@CurrentViewer() viewer: Viewer): Promise<SignalHistoryResponse> {
    return this.signalsService.getHistory(viewer);
  }

  @Post("signals")
  @HttpCode(200)
  async send(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<SendSignalResponse> {
    const request = parseBody(sendSignalRequestSchema, body);
    return this.signalsService.send(viewer, request);
  }

  @Post("signals/:id/respond")
  @HttpCode(204)
  async respond(
    @CurrentViewer() viewer: Viewer,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<void> {
    const request = parseBody(respondSignalRequestSchema, body);
    return this.signalsService.respond(viewer, id, request);
  }

  @Put("me/location")
  @HttpCode(204)
  async saveLocation(@CurrentViewer() viewer: Viewer, @Body() body: unknown): Promise<void> {
    const request = parseBody(saveLocationRequestSchema, body);
    return this.signalsService.saveLocation(viewer, request);
  }
}
