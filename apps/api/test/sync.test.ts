/**
 * Sync and Days API integration tests (B3, P-81, ADR-0003, F-04).
 */
import {
  batchMutationsResponseSchema,
  changeFeedResponseSchema,
  dayDetailResponseSchema,
  daysOverviewResponseSchema,
  type BatchMutationsRequest,
} from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

const sendMutations = async (cookie: string, req: BatchMutationsRequest) => {
  const res = await api.call("POST", "/v1/mutations", { cookie, body: req });
  expect(res.statusCode).toBe(200);
  return batchMutationsResponseSchema.parse(res.json());
};

const getChanges = async (cookie: string, since = "0") => {
  const res = await api.call("GET", `/v1/changes?since=${since}&limit=50`, { cookie });
  expect(res.statusCode).toBe(200);
  return changeFeedResponseSchema.parse(res.json());
};

describe("POST /v1/mutations (F-04 sync invariants)", () => {
  it("applies a create mutation for a private draft and respects privacy (§5)", async () => {
    const entryId = "0192f0a0-0000-7000-8000-000000001001";
    const mutationId = "0192f0a0-0000-7000-8000-000000002001";

    const res = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "create",
          mutationId,
          entryId,
          entryKind: "text",
          body: "My private thought",
          visibility: "private",
          occurredAt: "2026-11-05T12:00:00Z",
          occurredTimeZone: "Europe/London",
        },
      ],
    });

    expect(res.results).toHaveLength(1);
    const result = res.results[0]!;
    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.entry).not.toBeNull();
      expect(result.entry?.id).toBe(entryId);
      expect(result.entry?.body).toBe("My private thought");
      expect(result.entry?.visibility).toBe("private");
      expect(result.entry?.sharedDay).toBeNull();
      expect(result.entry?.version).toBe(1);
    }

    // Selam's change feed contains the draft
    const selamFeed = await getChanges(api.cookies.selam);
    expect(selamFeed.changes.some((c) => c.type === "upsert" && c.entry.id === entryId)).toBe(true);

    // Noah's feed NEVER contains Selam's private draft (§5 Product Guardrail)
    const noahFeed = await getChanges(api.cookies.noah);
    expect(noahFeed.changes.some((c) => c.type === "upsert" && c.entry.id === entryId)).toBe(false);
  });

  it("handles idempotent replay safely without re-applying", async () => {
    const entryId = "0192f0a0-0000-7000-8000-000000001002";
    const mutationId = "0192f0a0-0000-7000-8000-000000002002";
    const payload: BatchMutationsRequest = {
      mutations: [
        {
          kind: "create",
          mutationId,
          entryId,
          entryKind: "feeling",
          body: "Happy moment",
          mood: "happy",
          visibility: "shared",
          occurredAt: "2026-11-05T12:15:00Z",
          occurredTimeZone: "Europe/London",
        },
      ],
    };

    const first = await sendMutations(api.cookies.selam, payload);
    expect(first.results[0]!.status).toBe("applied");

    // Retrying with the same mutationId + payload answers the same
    const second = await sendMutations(api.cookies.selam, payload);
    expect(second.results[0]!.status).toBe("applied");
    if (second.results[0]!.status === "applied") {
      expect(second.results[0]!.entry?.id).toBe(entryId);
    }

    // Reusing the same mutationId with a DIFFERENT payload is rejected
    const reuse = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "create",
          mutationId,
          entryId: "0192f0a0-0000-7000-8000-000000001999",
          entryKind: "text",
          body: "Spoofed payload",
          visibility: "private",
          occurredAt: "2026-11-05T12:15:00Z",
          occurredTimeZone: "Europe/London",
        },
      ],
    });
    expect(reuse.results[0]).toEqual({ status: "rejected", reason: "idempotency-key-reuse" });
  });

  it("handles edit and detects optimistic concurrency conflict", async () => {
    const entryId = "0192f0a0-0000-7000-8000-000000001003";
    const createMutationId = "0192f0a0-0000-7000-8000-000000002003";

    await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "create",
          mutationId: createMutationId,
          entryId,
          entryKind: "text",
          body: "Initial draft",
          visibility: "private",
          occurredAt: "2026-11-05T12:30:00Z",
          occurredTimeZone: "Europe/London",
        },
      ],
    });

    // Valid edit with baseVersion = 1, including optional timestamp (P-81 / U-11)
    const editRes = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "edit",
          mutationId: "0192f0a0-0000-7000-8000-000000002004",
          entryId,
          baseVersion: 1,
          body: "Edited draft text",
          emoji: "✍️",
          occurredAt: "2026-11-05T12:35:00Z",
        },
      ],
    });
    expect(editRes.results[0]!.status).toBe("applied");
    if (editRes.results[0]!.status === "applied") {
      expect(editRes.results[0]!.entry?.version).toBe(2);
      expect(editRes.results[0]!.entry?.body).toBe("Edited draft text");
      expect(editRes.results[0]!.entry?.emoji).toBe("✍️");
    }

    // Stale edit with baseVersion = 1 results in conflict
    const conflictRes = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "edit",
          mutationId: "0192f0a0-0000-7000-8000-000000002005",
          entryId,
          baseVersion: 1,
          body: "Conflicting edit",
        },
      ],
    });
    expect(conflictRes.results[0]!.status).toBe("conflict");
    if (conflictRes.results[0]!.status === "conflict") {
      expect(conflictRes.results[0]!.current.version).toBe(2);
      expect(conflictRes.results[0]!.current.body).toBe("Edited draft text");
    }
  });

  it("shares an entry and assigns server-authoritative sharedDay", async () => {
    const entryId = "0192f0a0-0000-7000-8000-000000001004";
    await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "create",
          mutationId: "0192f0a0-0000-7000-8000-000000002006",
          entryId,
          entryKind: "text",
          body: "Will share this",
          visibility: "private",
          occurredAt: "2026-11-05T13:00:00Z",
          occurredTimeZone: "Europe/London",
        },
      ],
    });

    const shareRes = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "share",
          mutationId: "0192f0a0-0000-7000-8000-000000002007",
          entryId,
          baseVersion: 1,
          visibility: "shared",
        },
      ],
    });

    expect(shareRes.results[0]!.status).toBe("applied");
    if (shareRes.results[0]!.status === "applied") {
      expect(shareRes.results[0]!.entry?.visibility).toBe("shared");
      expect(shareRes.results[0]!.entry?.sharedDay).not.toBeNull();
      expect(shareRes.results[0]!.entry?.sharedAt).not.toBeNull();
    }

    // Now Noah's change feed receives the shared entry!
    const noahFeed = await getChanges(api.cookies.noah);
    expect(noahFeed.changes.some((c) => c.type === "upsert" && c.entry.id === entryId)).toBe(true);
  });

  it("deletes an entry and writes a tombstone that wins over later edits (P-05)", async () => {
    const entryId = "0192f0a0-0000-7000-8000-000000001005";
    await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "create",
          mutationId: "0192f0a0-0000-7000-8000-000000002008",
          entryId,
          entryKind: "text",
          body: "To be deleted",
          visibility: "shared",
          occurredAt: "2026-11-05T13:30:00Z",
          occurredTimeZone: "Europe/London",
        },
      ],
    });

    const delRes = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "delete",
          mutationId: "0192f0a0-0000-7000-8000-000000002009",
          entryId,
        },
      ],
    });
    expect(delRes.results[0]).toEqual({ status: "applied", entry: null });

    // Any subsequent mutation on this entryId returns "gone"
    const editAfterDelete = await sendMutations(api.cookies.selam, {
      mutations: [
        {
          kind: "edit",
          mutationId: "0192f0a0-0000-7000-8000-000000002010",
          entryId,
          baseVersion: 2,
          body: "Trying to edit deleted entry",
        },
      ],
    });
    expect(editAfterDelete.results[0]).toEqual({ status: "gone" });
  });
});

describe("GET /v1/days and day detail", () => {
  it("provides overview and separated mine/partner day details", async () => {
    const overviewRes = await api.call("GET", "/v1/days", { cookie: api.cookies.selam });
    expect(overviewRes.statusCode).toBe(200);
    const overview = daysOverviewResponseSchema.parse(overviewRes.json());
    expect(overview.days.length).toBeGreaterThanOrEqual(1);

    const todayDate = overview.today;
    const dayRes = await api.call("GET", `/v1/days/${todayDate}`, { cookie: api.cookies.selam });
    expect(dayRes.statusCode).toBe(200);
    const day = dayDetailResponseSchema.parse(dayRes.json());
    expect(day.date).toBe(todayDate);
    expect(day.isToday).toBe(true);
    expect(Array.isArray(day.mine)).toBe(true);
    expect(Array.isArray(day.partner)).toBe(true);
  });

  it("completes day readiness and reveals recap when both finish", async () => {
    const overview = daysOverviewResponseSchema.parse(
      (await api.call("GET", "/v1/days", { cookie: api.cookies.selam })).json(),
    );
    const date = overview.today;

    // Selam finishes her day
    const selamFinish = await api.call("POST", `/v1/days/${date}/finish`, {
      cookie: api.cookies.selam,
      body: {},
    });
    expect(selamFinish.statusCode).toBe(200);
    const selamDay = dayDetailResponseSchema.parse(selamFinish.json());
    expect(selamDay.meReady).toBe(true);
    expect(selamDay.partnerReady).toBe(false);
    expect(selamDay.state).toBe("waiting");

    // Noah finishes his day
    const noahFinish = await api.call("POST", `/v1/days/${date}/finish`, {
      cookie: api.cookies.noah,
      body: {},
    });
    expect(noahFinish.statusCode).toBe(200);
    const noahDay = dayDetailResponseSchema.parse(noahFinish.json());
    expect(noahDay.meReady).toBe(true);
    expect(noahDay.partnerReady).toBe(true);
    expect(noahDay.state).toBe("ready");
  });
});
