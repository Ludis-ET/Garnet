import { InMemorySqliteDriver, SqliteStore } from "../sqlite/sqliteStore";
import { SyncEngine } from "./syncEngine";
import type { BatchMutationsResponse, ChangeFeedResponse, EntryDto } from "@garnet/contracts";

describe("SyncEngine & SqliteStore (B3, P-81, ADR-0003, F-04)", () => {
  let driver: InMemorySqliteDriver;
  let store: SqliteStore;
  let mockApi: {
    post: jest.Mock;
    get: jest.Mock;
  };
  let engine: SyncEngine;

  const USER_ID = "0192f0a0-0000-7000-8000-000000000001";
  const PARTNER_ID = "0192f0a0-0000-7000-8000-000000000002";

  beforeEach(() => {
    driver = new InMemorySqliteDriver();
    store = new SqliteStore(driver);
    mockApi = {
      post: jest.fn(),
      get: jest.fn(),
    };
    engine = new SyncEngine(store, {
      getUserId: () => USER_ID,
      getUserTimeZone: () => "Africa/Addis_Ababa",
      postMutations: (req) => Promise.resolve(mockApi.post("/v1/mutations", req)),
      getChanges: (since, limit) =>
        Promise.resolve(mockApi.get(`/v1/changes?since=${since}&limit=${limit}`)),
    });
  });

  it("creates entry locally and queues an outbox mutation (offline first)", async () => {
    const entry = await engine.createEntry({
      text: "Morning coffee",
      emoji: "☕",
      visibility: "private",
    });

    expect(entry.body).toBe("Morning coffee");
    expect(entry.emoji).toBe("☕");
    expect(entry.visibility).toBe("private");
    expect(entry.authorId).toBe(USER_ID);

    const pending = await store.getOutbox();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.mutation.kind).toBe("create");
    if (pending[0]?.mutation.kind === "create") {
      expect(pending[0].mutation.entryId).toBe(entry.id);
      expect(pending[0].mutation.body).toBe("Morning coffee");
    }

    const visible = await engine.getVisibleEntries();
    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe(entry.id);
  });

  it("supports optional timestamp when creating entry (P-81, U-11)", async () => {
    const occurredAt = "2026-11-05T08:30:00.000Z";
    const entry = await engine.createEntry({
      text: "Recorded earlier",
      visibility: "shared",
      occurredAt,
    });

    expect(entry.occurredAt).toBe(occurredAt);

    const pending = await store.getOutbox();
    expect(pending).toHaveLength(1);
    if (pending[0]?.mutation.kind === "create") {
      expect(pending[0].mutation.occurredAt).toBe(occurredAt);
    }
  });

  it("edits entry offline, updates optimistic view, and queues edit mutation with baseVersion", async () => {
    const entry = await engine.createEntry({
      text: "Draft thought",
      visibility: "private",
    });

    const updated = await engine.editEntry(entry.id, {
      text: "Polished thought",
      emoji: "✨",
    });

    expect(updated.body).toBe("Polished thought");
    expect(updated.emoji).toBe("✨");

    const pending = await store.getOutbox();
    expect(pending).toHaveLength(2);
    expect(pending[1]?.mutation.kind).toBe("edit");
    if (pending[1]?.mutation.kind === "edit") {
      expect(pending[1].mutation.entryId).toBe(entry.id);
      expect(pending[1].mutation.body).toBe("Polished thought");
      expect(pending[1].baseVersion).toBe(1);
    }
  });

  it("shares entry offline, updating visibility and queueing share mutation", async () => {
    const entry = await engine.createEntry({
      text: "Surprise for you",
      visibility: "private",
    });

    await engine.shareEntry(entry.id, "shared");

    const saved = await engine.getEntryById(entry.id);
    expect(saved?.visibility).toBe("shared");

    const pending = await store.getOutbox();
    expect(pending).toHaveLength(2);
    expect(pending[1]?.mutation.kind).toBe("share");
    if (pending[1]?.mutation.kind === "share") {
      expect(pending[1].mutation.visibility).toBe("shared");
    }
  });

  it("deleting an entry offline hides it immediately and drops unpushed create (privacy guardrail §5)", async () => {
    const entry = await engine.createEntry({
      text: "Private discarded thought",
      visibility: "private",
    });

    expect(await engine.getVisibleEntries()).toHaveLength(1);

    await engine.deleteEntry(entry.id);

    // Entry should no longer be visible
    expect(await engine.getVisibleEntries()).toHaveLength(0);
    expect(await engine.getEntryById(entry.id)).toBeNull();

    // Because it was never pushed to the server, create was cancelled and nothing is leaked
    const pending = await store.getOutbox();
    expect(pending).toHaveLength(0);
  });

  it("pushes batch mutations to API and clears outbox upon server applied response", async () => {
    const entry = await engine.createEntry({
      text: "Online sync moment",
      visibility: "shared",
    });

    const serverEntry: EntryDto = {
      id: entry.id,
      authorId: USER_ID,
      sharedDay: "2026-11-05",
      sharedAt: "2026-11-05T10:00:00Z",
      occurredAt: entry.occurredAt,
      occurredTimeZone: "Africa/Addis_Ababa",
      kind: "text",
      body: "Online sync moment",
      emoji: "✨",
      visibility: "shared",
      version: 1,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      revealedAt: null,
    };

    const mockResponse: BatchMutationsResponse = {
      results: [
        {
          status: "applied",
          entry: serverEntry,
        },
      ],
    };

    mockApi.post.mockResolvedValueOnce(mockResponse);
    mockApi.get.mockResolvedValueOnce({ changes: [], cursor: "0", hasMore: false });

    await engine.sync();

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    const pending = await store.getOutbox();
    expect(pending).toHaveLength(0);

    const confirmed = await engine.getEntryById(entry.id);
    expect(confirmed?.version).toBe(1);
  });

  it("handles conflict from server by creating private conflict copy (ADR-0003)", async () => {
    const entry = await engine.createEntry({
      text: "Original text",
      visibility: "shared",
    });

    // Simulate entry already synced at version 1
    await store.saveConfirmedEntry({
      id: entry.id,
      authorId: USER_ID,
      sharedDay: "2026-11-05",
      sharedAt: "2026-11-05T10:00:00Z",
      occurredAt: entry.occurredAt,
      occurredTimeZone: "Africa/Addis_Ababa",
      kind: "text",
      body: "Server updated version",
      emoji: "✨",
      visibility: "shared",
      version: 2,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      revealedAt: null,
    });

    // Now user edited offline
    await engine.editEntry(entry.id, {
      text: "Conflicting offline edit",
    });

    mockApi.post.mockResolvedValueOnce({
      results: [
        {
          status: "conflict",
          current: {
            id: entry.id,
            authorId: USER_ID,
            sharedDay: "2026-11-05",
            sharedAt: "2026-11-05T10:00:00Z",
            occurredAt: entry.occurredAt,
            occurredTimeZone: "Africa/Addis_Ababa",
            kind: "text",
            body: "Server updated version",
            emoji: "✨",
            visibility: "shared",
            version: 2,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            revealedAt: null,
          },
        },
      ],
    });
    mockApi.get.mockResolvedValueOnce({ changes: [], cursor: "0", hasMore: false });

    await engine.push();

    // Conflict issue was registered
    const issues = engine.drainIssues();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.kind).toBe("conflict-copy-created");

    // The conflict copy was created and is private
    if (issues[0]?.kind === "conflict-copy-created") {
      const copy = await engine.getEntryById(issues[0].copyId);
      expect(copy).not.toBeNull();
      expect(copy?.body).toBe("Conflicting offline edit");
      expect(copy?.visibility).toBe("private");
    }
  });

  it("pulls change feed, updating local entries and advancing cursor", async () => {
    const partnerEntry: EntryDto = {
      id: "0192f0a0-0000-7000-8000-00000000p001",
      authorId: PARTNER_ID,
      sharedDay: "2026-11-05",
      sharedAt: "2026-11-05T11:00:00Z",
      occurredAt: "2026-11-05T11:00:00Z",
      occurredTimeZone: "Europe/London",
      kind: "photo",
      body: "Sunset from London",
      emoji: "🌅",
      visibility: "shared",
      version: 1,
      createdAt: "2026-11-05T11:00:00Z",
      updatedAt: "2026-11-05T11:00:00Z",
      revealedAt: null,
    };

    const feedResponse: ChangeFeedResponse = {
      changes: [
        {
          type: "upsert",
          entry: partnerEntry,
          seq: "1",
        },
      ],
      cursor: "1",
      hasMore: false,
    };

    mockApi.get.mockResolvedValueOnce(feedResponse);

    await engine.pull();

    const partnerSaved = await engine.getEntryById(partnerEntry.id);
    expect(partnerSaved).not.toBeNull();
    expect(partnerSaved?.body).toBe("Sunset from London");
    expect(partnerSaved?.authorId).toBe(PARTNER_ID);

    const cursor = await store.getCursor();
    expect(cursor).toBe("1");
  });

  it("pull feed deletion removes local entry", async () => {
    const entryId = "0192f0a0-0000-7000-8000-00000000p002";
    await store.saveConfirmedEntry({
      id: entryId,
      authorId: PARTNER_ID,
      sharedDay: "2026-11-05",
      sharedAt: "2026-11-05T11:00:00Z",
      occurredAt: "2026-11-05T11:00:00Z",
      occurredTimeZone: "Europe/London",
      kind: "text",
      body: "To be deleted",
      emoji: "✨",
      visibility: "shared",
      version: 1,
      createdAt: "2026-11-05T11:00:00Z",
      updatedAt: "2026-11-05T11:00:00Z",
      revealedAt: null,
    });

    mockApi.get.mockResolvedValueOnce({
      changes: [
        {
          type: "delete",
          entryId,
          seq: "2",
        },
      ],
      cursor: "2",
      hasMore: false,
    });

    await engine.pull();

    expect(await engine.getEntryById(entryId)).toBeNull();
    expect(await store.getCursor()).toBe("2");
  });
});
