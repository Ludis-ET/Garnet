import { Body, Controller, Get, HttpCode, Inject, Post, Query } from "@nestjs/common";
import {
  batchMutationsRequestSchema,
  changeFeedQuerySchema,
  type BatchMutationsResponse,
  type ChangeFeedResponse,
} from "@garnet/contracts";
import { CurrentViewer } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { parseBody } from "../http/body";
import { SyncService } from "./sync.service";

/**
 * Atomic sync endpoints (B3, P-81, ADR-0003, F-04):
 * - POST /v1/mutations: applies queued local mutations with idempotency and optimistic locking.
 * - GET /v1/changes: pulls the change feed since the client's last seen cursor sequence.
 */
@Controller("v1")
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Post("mutations")
  @HttpCode(200)
  async applyMutations(
    @CurrentViewer() viewer: Viewer,
    @Body() body: unknown,
  ): Promise<BatchMutationsResponse> {
    const request = parseBody(batchMutationsRequestSchema, body);
    return this.syncService.applyMutations(viewer, request);
  }

  @Get("changes")
  async getChanges(
    @CurrentViewer() viewer: Viewer,
    @Query() query: Record<string, unknown>,
  ): Promise<ChangeFeedResponse> {
    const { since, limit } = changeFeedQuerySchema.parse(query);
    return this.syncService.getChanges(viewer, since, limit);
  }
}
