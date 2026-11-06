import { InMemorySqliteDriver, SqliteStore } from "../sqlite/sqliteStore";
import { SyncEngine } from "../sync/syncEngine";
import { createHttpDays } from "./httpDays";
import { createHttpHome } from "./httpHome";
import { MockStore } from "../mock/MockStore";
import type { ApiClient } from "./client";

describe("HttpDays and HttpHome repositories over SyncEngine (B3, P-81)", () => {
  let driver: InMemorySqliteDriver;
  let sqliteStore: SqliteStore;
  let mockApi: {
    post: jest.Mock;
    get: jest.Mock;
  };
  let syncEngine: SyncEngine;
  let mockStore: MockStore;

  const USER_ID = "0192f0a0-0000-7000-8000-000000000001";

  beforeEach(() => {
    driver = new InMemorySqliteDriver();
    sqliteStore = new SqliteStore(driver);
    mockApi = {
      post: jest.fn(),
      get: jest.fn(),
    };
    syncEngine = new SyncEngine(sqliteStore, {
      getUserId: () => USER_ID,
      getUserTimeZone: () => "Africa/Addis_Ababa",
      postMutations: (req) => Promise.resolve(mockApi.post("/v1/mutations", req)),
      getChanges: (since, limit) =>
        Promise.resolve(mockApi.get(`/v1/changes?since=${since}&limit=${limit}`)),
    });

    mockStore = new MockStore({ latencyMs: 0 });
    mockStore.update((s) => ({
      ...s,
      auth: { ...s.auth, status: { kind: "signedIn", userId: USER_ID, keepSignedIn: true } },
    }));
  });

  it("saves a new moment through httpDays, storing it in SQLite and enqueuing outbox", async () => {
    const days = createHttpDays(mockApi as unknown as ApiClient, syncEngine, mockStore);

    const saved = await days.save({
      kind: "text",
      text: "Tea time",
      emoji: "🫖",
      visibility: "shared",
    });

    expect(saved.id).toBeDefined();
    expect(saved.text).toBe("Tea time");
    expect(saved.emoji).toBe("🫖");
    expect(saved.mine).toBe(true);
    expect(saved.visibility).toBe("shared");

    const outbox = await sqliteStore.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.mutation.kind).toBe("create");
  });

  it("edits an existing moment through httpDays", async () => {
    const days = createHttpDays(mockApi as unknown as ApiClient, syncEngine, mockStore);

    const created = await days.save({
      kind: "text",
      text: "Initial moment",
      emoji: "✨",
      visibility: "private",
    });

    const updated = await days.save({
      id: created.id,
      kind: "text",
      text: "Updated moment",
      emoji: "🌟",
      visibility: "private",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.text).toBe("Updated moment");
    expect(updated.emoji).toBe("🌟");
  });

  it("logs a moment through httpHome, saving to SQLite sync engine", async () => {
    const home = createHttpHome(mockApi as unknown as ApiClient, syncEngine, mockStore);

    const moment = await home.logMoment({
      text: "A quick thought from home",
      emoji: "💡",
      share: false,
    });

    expect(moment.id).toBeDefined();
    expect(moment.text).toBe("A quick thought from home");
    expect(moment.visibility).toBe("private");

    const visible = await syncEngine.getVisibleEntries();
    expect(visible).toHaveLength(1);
    expect(visible[0]?.body).toBe("A quick thought from home");
  });

  it("overview fetches from API when online", async () => {
    const days = createHttpDays(mockApi as unknown as ApiClient, syncEngine, mockStore);

    mockApi.get.mockResolvedValueOnce({
      today: "2026-11-05",
      todayState: "open",
      sharedDayCutoffUtc: "02:00",
      days: [],
    });

    const overview = await days.overview();
    expect(overview.today).toBe("2026-11-05");
    expect(overview.days).toHaveLength(0);
    expect(overview.me).toBeDefined();
    expect(overview.partner).toBeDefined();
  });
});
