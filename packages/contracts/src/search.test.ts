import { describe, expect, it } from "vitest";
import {
  searchQueryRequestSchema,
  searchQueryResponseSchema,
  searchResultItemSchema,
} from "./search";

describe("search contracts", () => {
  it("validates search query request with defaults", () => {
    const parsed = searchQueryRequestSchema.parse({ q: "hello" });
    expect(parsed.q).toBe("hello");
    expect(parsed.who).toBe("both");
    expect(parsed.limit).toBe(30);
    expect(parsed.kinds).toBeUndefined();
  });

  it("coerces limit and trims query string", () => {
    const parsed = searchQueryRequestSchema.parse({
      q: "  star  ",
      limit: "50",
      who: "partner",
      kinds: ["message", "letter"],
    });
    expect(parsed.q).toBe("star");
    expect(parsed.limit).toBe(50);
    expect(parsed.who).toBe("partner");
    expect(parsed.kinds).toEqual(["message", "letter"]);
  });

  it("rejects empty query string", () => {
    expect(() => searchQueryRequestSchema.parse({ q: "   " })).toThrow();
  });

  it("validates search result item and response", () => {
    const item = {
      id: "018f6c5e-8b1e-7f41-a1bf-894f2759e001",
      kind: "moment" as const,
      title: "Trip to Lalibela",
      snippet: "Visiting the rock-hewn churches",
      at: "2026-11-06T15:00:00.000Z",
      mine: true,
      sealed: false,
      href: "/days?date=2026-11-06",
    };
    expect(searchResultItemSchema.parse(item)).toEqual(item);

    const response = {
      results: [item],
      nextCursor: null,
      totalEstimated: 1,
    };
    expect(searchQueryResponseSchema.parse(response)).toEqual(response);
  });
});
