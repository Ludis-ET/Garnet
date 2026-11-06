import { describe, expect, it } from "vitest";
import {
  batchMutationsRequestSchema,
  batchMutationsResponseSchema,
  changeFeedQuerySchema,
  changeFeedResponseSchema,
  dayDetailResponseSchema,
  daysOverviewResponseSchema,
  mutationSchema,
} from "./sync";

describe("sync contracts (B3, P-81, ADR-0003)", () => {
  it("validates create mutation with default values", () => {
    const parsed = mutationSchema.parse({
      kind: "create",
      mutationId: "0192f0a0-0000-7000-8000-000000000001",
      entryId: "0192f0a0-0000-7000-8000-000000000002",
      occurredAt: "2026-11-05T12:00:00Z",
      occurredTimeZone: "Africa/Addis_Ababa",
    });
    expect(parsed).toMatchObject({
      kind: "create",
      entryKind: "text",
      visibility: "private",
      body: "",
    });
  });

  it("validates edit mutation with optional timestamp (P-81 / U-11)", () => {
    const parsed = mutationSchema.parse({
      kind: "edit",
      mutationId: "0192f0a0-0000-7000-8000-000000000001",
      entryId: "0192f0a0-0000-7000-8000-000000000002",
      baseVersion: 2,
      body: "Updated moment",
      emoji: "🌟",
      occurredAt: "2026-11-05T12:30:00Z",
    });
    expect(parsed.kind).toBe("edit");
    if (parsed.kind === "edit") {
      expect(parsed.occurredAt).toBe("2026-11-05T12:30:00Z");
      expect(parsed.emoji).toBe("🌟");
    }
  });

  it("validates share mutation with afterReveal visibility", () => {
    const parsed = mutationSchema.parse({
      kind: "share",
      mutationId: "0192f0a0-0000-7000-8000-000000000001",
      entryId: "0192f0a0-0000-7000-8000-000000000002",
      baseVersion: 1,
      visibility: "afterReveal",
    });
    expect(parsed.kind).toBe("share");
    if (parsed.kind === "share") {
      expect(parsed.visibility).toBe("afterReveal");
    }
  });

  it("validates batch mutation request and response with conflict handling", () => {
    const req = batchMutationsRequestSchema.parse({
      mutations: [
        {
          kind: "delete",
          mutationId: "0192f0a0-0000-7000-8000-000000000001",
          entryId: "0192f0a0-0000-7000-8000-000000000002",
        },
      ],
    });
    expect(req.mutations).toHaveLength(1);

    const res = batchMutationsResponseSchema.parse({
      results: [
        { status: "applied", entry: null },
        { status: "gone" },
        {
          status: "conflict",
          current: {
            id: "0192f0a0-0000-7000-8000-000000000002",
            authorId: "0192f0a0-0000-7000-8000-000000000003",
            kind: "text",
            body: "Server version",
            visibility: "shared",
            occurredAt: "2026-11-05T10:00:00Z",
            occurredTimeZone: "Europe/London",
            sharedAt: "2026-11-05T10:05:00Z",
            sharedDay: "2026-11-05",
            version: 3,
            revealedAt: null,
            createdAt: "2026-11-05T10:00:00Z",
            updatedAt: "2026-11-05T10:05:00Z",
          },
        },
      ],
    });
    expect(res.results).toHaveLength(3);
  });

  it("validates change feed query and response", () => {
    const query = changeFeedQuerySchema.parse({ since: "123", limit: "25" });
    expect(query).toEqual({ since: "123", limit: 25 });

    const feed = changeFeedResponseSchema.parse({
      changes: [
        {
          type: "upsert",
          seq: "124",
          mutationId: "0192f0a0-0000-7000-8000-000000000001",
          entry: {
            id: "0192f0a0-0000-7000-8000-000000000002",
            authorId: "0192f0a0-0000-7000-8000-000000000003",
            kind: "feeling",
            body: "Feeling good",
            mood: "happy",
            visibility: "shared",
            occurredAt: "2026-11-05T10:00:00Z",
            occurredTimeZone: "Africa/Addis_Ababa",
            sharedAt: "2026-11-05T10:00:00Z",
            sharedDay: "2026-11-05",
            version: 1,
            revealedAt: null,
            createdAt: "2026-11-05T10:00:00Z",
            updatedAt: "2026-11-05T10:00:00Z",
          },
        },
        {
          type: "delete",
          seq: "125",
          entryId: "0192f0a0-0000-7000-8000-000000000002",
        },
      ],
      cursor: "125",
      hasMore: false,
    });
    expect(feed.changes).toHaveLength(2);
  });

  it("validates days overview and day detail", () => {
    const overview = daysOverviewResponseSchema.parse({
      today: "2026-11-05",
      days: [
        {
          date: "2026-11-05",
          isToday: true,
          preview: ["✨", "☕"],
          me: true,
          partner: false,
          state: "open",
        },
      ],
    });
    expect(overview.days).toHaveLength(1);

    const detail = dayDetailResponseSchema.parse({
      date: "2026-11-05",
      isToday: true,
      mine: [],
      partner: [],
      state: "open",
      meReady: false,
      partnerReady: false,
    });
    expect(detail.date).toBe("2026-11-05");
  });
});
