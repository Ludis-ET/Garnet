import { searchQueryResponseSchema, type SearchQueryResponse } from "@garnet/contracts";
import type { SearchFilters, SearchRepository, SearchResult } from "../repositories/types";
import type { ApiClient } from "./client";

const RECENT_MAX = 8;

export function createHttpSearch(api: ApiClient, initialRecent: string[] = []): SearchRepository {
  let recentList = [...initialRecent];

  return {
    async search(query: string, filters: SearchFilters): Promise<SearchResult[]> {
      const q = query.trim();
      if (q.length === 0) return [];

      const params = new URLSearchParams();
      params.set("q", q);
      if (filters.kinds.length > 0) {
        params.set("kinds", filters.kinds.join(","));
      }
      params.set("who", filters.who);

      const res = await api.get<SearchQueryResponse>(
        `/v1/search?${params.toString()}`,
        searchQueryResponseSchema,
      );

      return res.results.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        snippet: r.snippet,
        at: r.at,
        mine: r.mine,
        sealed: r.sealed,
        href: r.href,
      }));
    },

    recent(): Promise<string[]> {
      return Promise.resolve([...recentList]);
    },

    remember(query: string): Promise<void> {
      const q = query.trim();
      if (q.length === 0) return Promise.resolve();
      recentList = [q, ...recentList.filter((x) => x !== q)].slice(0, RECENT_MAX);
      return Promise.resolve();
    },

    forget(query: string): Promise<void> {
      recentList = recentList.filter((x) => x !== query);
      return Promise.resolve();
    },

    clearRecent(): Promise<void> {
      recentList = [];
      return Promise.resolve();
    },
  };
}
