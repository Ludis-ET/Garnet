import { Controller, Get, Inject, Query } from "@nestjs/common";
import { searchQueryRequestSchema, type SearchQueryResponse } from "@garnet/contracts";
import { CurrentViewer } from "../auth/session.guard";
import type { Viewer } from "../db/database";
import { SearchService } from "./search.service";

/**
 * Global and per-page search endpoint (B12, P-88):
 * GET /v1/search?q=...&kinds=...&who=...&limit=...&cursor=...
 * Honors §5 Product Guardrails & RLS: sealed content bodies & private drafts are never leaked.
 */
@Controller("v1/search")
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentViewer() viewer: Viewer,
    @Query() rawQuery: Record<string, unknown>,
  ): Promise<SearchQueryResponse> {
    let kinds = rawQuery["kinds"];
    if (typeof kinds === "string") {
      kinds = kinds.includes(",") ? kinds.split(",").map((s) => s.trim()) : [kinds];
    }
    const parsed = searchQueryRequestSchema.parse({
      ...rawQuery,
      kinds,
    });
    return this.searchService.search(viewer, parsed);
  }
}
