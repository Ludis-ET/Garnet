import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import {
  savePlaceSchema,
  savePlanSchema,
  saveSongSchema,
  type SavePlaceRequest,
  type SavePlanRequest,
  type SaveSongRequest,
  type TogetherPlaceDto,
  type TogetherPlanDto,
  type TogetherSongDto,
} from "@garnet/contracts";
import { CurrentViewer, SessionGuard } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { TogetherService } from "./together.service";

@Controller("v1/together")
@UseGuards(SessionGuard)
export class TogetherController {
  constructor(@Inject(TogetherService) private readonly service: TogetherService) {}

  // --- Plans -----------------------------------------------------------------

  @Get("plans")
  async plans(@CurrentViewer() viewer: Viewer): Promise<TogetherPlanDto[]> {
    return this.service.plans(viewer);
  }

  @Post("plans")
  async savePlan(@Body() body: unknown, @CurrentViewer() viewer: Viewer): Promise<{ id: string }> {
    const input: SavePlanRequest = savePlanSchema.parse(body);
    return this.service.savePlan(input, viewer);
  }

  @Post("plans/:id/complete")
  async completePlan(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    await this.service.completePlan(id, viewer);
    return { ok: true };
  }

  @Delete("plans/:id")
  async deletePlan(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    await this.service.deletePlan(id, viewer);
    return { ok: true };
  }

  // --- Places ----------------------------------------------------------------

  @Get("places")
  async places(@CurrentViewer() viewer: Viewer): Promise<TogetherPlaceDto[]> {
    return this.service.places(viewer);
  }

  @Post("places")
  async addPlace(@Body() body: unknown, @CurrentViewer() viewer: Viewer): Promise<{ id: string }> {
    const input: SavePlaceRequest = savePlaceSchema.parse(body);
    return this.service.addPlace(input, viewer);
  }

  @Delete("places/:id")
  async deletePlace(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    await this.service.deletePlace(id, viewer);
    return { ok: true };
  }

  // --- Songs -----------------------------------------------------------------

  @Get("songs")
  async songs(@CurrentViewer() viewer: Viewer): Promise<TogetherSongDto[]> {
    return this.service.songs(viewer);
  }

  @Post("songs")
  async addSong(@Body() body: unknown, @CurrentViewer() viewer: Viewer): Promise<{ id: string }> {
    const input: SaveSongRequest = saveSongSchema.parse(body);
    return this.service.addSong(input, viewer);
  }

  @Delete("songs/:id")
  async deleteSong(
    @Param("id") id: string,
    @CurrentViewer() viewer: Viewer,
  ): Promise<{ ok: boolean }> {
    await this.service.deleteSong(id, viewer);
    return { ok: true };
  }
}
