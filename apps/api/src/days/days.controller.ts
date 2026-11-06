import { Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import type { DayDetailResponse, DaysOverviewResponse, EntryDto } from "@garnet/contracts";
import { CurrentViewer } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { DaysService } from "./days.service";

/**
 * Days and moments endpoints (B3, P-81, B-30 to B-33):
 * - GET /v1/days: 10-day overview summaries.
 * - GET /v1/days/:date: day detail with mine and partner's visible moments.
 * - POST /v1/days/:date/finish: marks caller ready for the recap.
 * - GET /v1/entries/:id: single entry view under RLS.
 */
@Controller("v1")
export class DaysController {
  constructor(@Inject(DaysService) private readonly daysService: DaysService) {}

  @Get("days")
  async getOverview(@CurrentViewer() viewer: Viewer): Promise<DaysOverviewResponse> {
    return this.daysService.getOverview(viewer);
  }

  @Get("days/:date")
  async getDayDetail(
    @CurrentViewer() viewer: Viewer,
    @Param("date") date: string,
  ): Promise<DayDetailResponse> {
    return this.daysService.getDayDetail(viewer, date);
  }

  @Post("days/:date/finish")
  @HttpCode(200)
  async finishDay(
    @CurrentViewer() viewer: Viewer,
    @Param("date") date: string,
  ): Promise<DayDetailResponse> {
    return this.daysService.finishDay(viewer, date);
  }

  @Get("entries/:id")
  async getEntry(@CurrentViewer() viewer: Viewer, @Param("id") id: string): Promise<EntryDto> {
    return this.daysService.getEntry(viewer, id);
  }
}
