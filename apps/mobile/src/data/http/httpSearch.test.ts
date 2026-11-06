import type { ApiClient } from "./client";
import { createHttpSearch } from "./httpSearch";

function asApiClient(mock: Record<string, unknown>): ApiClient {
  return mock as unknown as ApiClient;
}

describe("createHttpSearch (B12, P-88)", () => {
  it("calls GET /v1/search with encoded parameters and maps results", async () => {
    const mockItem = {
      id: "0192f0a0-0000-7000-8000-000000000001",
      kind: "message" as const,
      title: "Noah",
      snippet: "Coffee in Addis",
      at: "2026-11-06T12:00:00Z",
      mine: false,
      sealed: false,
      href: "/chat?messageId=0192f0a0-0000-7000-8000-000000000001",
    };

    const api = {
      get: jest.fn((path: string) => {
        expect(path).toContain("/v1/search?");
        expect(path).toContain("q=coffee");
        expect(path).toContain("kinds=message%2Cmoment");
        expect(path).toContain("who=partner");
        return Promise.resolve({
          results: [mockItem],
          nextCursor: null,
          totalEstimated: 1,
        });
      }),
      post: jest.fn(),
      postNoContent: jest.fn(() => Promise.resolve()),
      patch: jest.fn(() => Promise.resolve()),
      patchWith: jest.fn(),
      put: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      deleteWith: jest.fn(),
    };

    const searchRepo = createHttpSearch(asApiClient(api));
    const results = await searchRepo.search("coffee", {
      kinds: ["message", "moment"],
      who: "partner",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(mockItem.id);
    expect(results[0]?.kind).toBe("message");
    expect(results[0]?.title).toBe("Noah");
    expect(results[0]?.mine).toBe(false);
  });

  it("returns empty array immediately when query is blank", async () => {
    const api = {
      get: jest.fn(),
    };
    const searchRepo = createHttpSearch(asApiClient(api));
    const results = await searchRepo.search("   ", {
      kinds: [],
      who: "both",
    });
    expect(results).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("manages recent searches locally without network requests", async () => {
    const api = {
      get: jest.fn(),
    };
    const searchRepo = createHttpSearch(asApiClient(api), ["old query"]);

    expect(await searchRepo.recent()).toEqual(["old query"]);

    await searchRepo.remember("new search");
    expect(await searchRepo.recent()).toEqual(["new search", "old query"]);

    await searchRepo.forget("old query");
    expect(await searchRepo.recent()).toEqual(["new search"]);

    await searchRepo.clearRecent();
    expect(await searchRepo.recent()).toEqual([]);
  });
});
