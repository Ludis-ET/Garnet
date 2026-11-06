import type { ApiClient } from "./client";
import { createHttpOpenWhen } from "./httpOpenWhen";
import { createHttpSurprises } from "./httpSurprises";
import { createHttpEvents } from "./httpEvents";
import { createHttpMemories } from "./httpMemories";
import { createHttpTogether } from "./httpTogether";

function mockApiClient(methods: Record<string, unknown>): ApiClient {
  return methods as unknown as ApiClient;
}

describe("Moments HTTP repository adapters (Milestone B8, B-90, B-91, B-92)", () => {
  describe("httpOpenWhen", () => {
    it("lists and gets letters, mapping draft, sealed and opened views", async () => {
      const api = mockApiClient({
        get: jest.fn((path: string) => {
          if (path === "/v1/letters") {
            return Promise.resolve([
              {
                id: "let-1",
                status: "sealed",
                authorId: "u1",
                recipientId: "u2",
                prompt: "Open when you miss me",
                sealedAt: "2026-11-06T12:00:00Z",
                unlockRule: { type: "manual" },
                createdAt: "2026-11-06T11:00:00Z",
              },
            ]);
          }
          if (path === "/v1/letters/let-1") {
            return Promise.resolve({
              id: "let-1",
              status: "sealed",
              authorId: "u1",
              recipientId: "u2",
              prompt: "Open when you miss me",
              sealedAt: "2026-11-06T12:00:00Z",
              unlockRule: { type: "manual" },
              createdAt: "2026-11-06T11:00:00Z",
            });
          }
          return Promise.reject(new Error("unexpected path"));
        }),
        post: jest.fn(),
        patch: jest.fn(),
        patchWith: jest.fn(),
        delete: jest.fn(() => Promise.resolve()),
      });

      const repo = createHttpOpenWhen(api, () => "u2");
      const list = await repo.list();
      expect(list.length).toBe(1);
      const first = list[0];
      expect(first).toBeDefined();
      if (first?.kind === "sealed") {
        expect(first.safePrompt).toBe("Open when you miss me");
        expect("body" in first).toBe(false);
      }

      const item = await repo.get("let-1");
      expect(item.kind).toBe("sealed");
    });

    it("creates draft and opens sealed letter", async () => {
      const api = mockApiClient({
        get: jest.fn(),
        post: jest.fn((path: string, _schema: unknown, body: unknown) => {
          if (path === "/v1/letters/draft") {
            const b = body as { prompt: string; body: string };
            return Promise.resolve({
              id: "let-draft",
              status: "draft",
              authorId: "u1",
              recipientId: "u2",
              prompt: b.prompt,
              body: b.body,
              createdAt: "2026-11-06T12:00:00Z",
            });
          }
          if (path === "/v1/letters/let-sealed/open") {
            return Promise.resolve({
              ok: true,
              view: {
                id: "let-sealed",
                status: "opened",
                authorId: "u1",
                recipientId: "u2",
                prompt: "Open when you land",
                body: "Welcome to London!",
                sealedAt: "2026-11-06T10:00:00Z",
                openedAt: "2026-11-06T12:00:00Z",
                unlockRule: { type: "manual" },
                createdAt: "2026-11-06T09:00:00Z",
              },
            });
          }
          return Promise.reject(new Error("unexpected path"));
        }),
        patch: jest.fn(),
        patchWith: jest.fn(),
        delete: jest.fn(() => Promise.resolve()),
      });

      const repo = createHttpOpenWhen(api, () => "u2");
      const draft = await repo.createDraft({
        safePrompt: "Open when you need a smile",
        body: "Remember our walk in Entoto.",
      });
      expect(draft.kind).toBe("draft");
      if (draft.kind === "draft") {
        expect(draft.safePrompt).toBe("Open when you need a smile");
        expect(draft.body).toBe("Remember our walk in Entoto.");
      }

      const opened = await repo.open("let-sealed");
      expect(opened.ok).toBe(true);
      if (opened.ok) {
        expect(opened.view.kind).toBe("opened");
        if (opened.view.kind === "opened") {
          expect(opened.view.body).toBe("Welcome to London!");
        }
      }
    });
  });

  describe("httpSurprises", () => {
    it("creates, lists, and opens surprises", async () => {
      const api = mockApiClient({
        get: jest.fn((path: string) => {
          if (path === "/v1/surprises") {
            return Promise.resolve({
              partnerName: "Noah",
              items: [
                {
                  id: "sur-1",
                  state: "scheduled",
                  authorId: "u1",
                  recipientId: "u2",
                  safeTitle: "A sweet surprise",
                  reveal: { kind: "now" },
                  createdAt: "2026-11-06T12:00:00Z",
                },
              ],
            });
          }
          return Promise.reject(new Error("unexpected path"));
        }),
        post: jest.fn((path: string) => {
          if (path === "/v1/surprises") {
            return Promise.resolve({ id: "sur-new" });
          }
          if (path === "/v1/surprises/sur-1/open") {
            return Promise.resolve({
              id: "sur-1",
              state: "opened",
              authorId: "u1",
              recipientId: "u2",
              safeTitle: "A sweet surprise",
              reveal: { kind: "now" },
              content: { kind: "idea", textContent: "Sunset stroll" },
              openedAt: "2026-11-06T13:00:00Z",
              createdAt: "2026-11-06T12:00:00Z",
            });
          }
          return Promise.resolve({ id: "unknown" });
        }),
        postNoContent: jest.fn(() => Promise.resolve()),
        patch: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      });

      const repo = createHttpSurprises(api, () => "u2");
      const list = await repo.list();
      expect(list.partnerName).toBe("Noah");
      const first = list.items[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.kind).toBe("locked");
        if (first.kind === "locked") {
          expect(first.content).toBeNull();
        }
      }

      const opened = await repo.open("sur-1");
      expect(opened.kind).toBe("opened");
      if (opened.kind === "opened") {
        expect(opened.content.text).toBe("Sunset stroll");
      }
    });
  });

  describe("httpEvents", () => {
    it("manages calendar events and chapters", async () => {
      const api = mockApiClient({
        get: jest.fn((path: string) => {
          if (path === "/v1/events") {
            return Promise.resolve({
              today: "2026-11-06",
              events: [
                {
                  id: "evt-1",
                  authorId: "u1",
                  title: "Anniversary",
                  kind: "anniversary",
                  firstDate: "2024-10-15",
                  repeats: "yearly",
                  createdAt: "2026-11-06T00:00:00Z",
                  updatedAt: "2026-11-06T00:00:00Z",
                },
              ],
            });
          }
          if (path === "/v1/events/chapters") {
            return Promise.resolve([
              { month: "2026-11", title: "Golden November", reflectionCount: 2 },
            ]);
          }
          return Promise.reject(new Error("unexpected path"));
        }),
        post: jest.fn(() => Promise.resolve({ id: "evt-new" })),
        postNoContent: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      });

      const repo = createHttpEvents(api);
      const res = await repo.list();
      expect(res.events.length).toBe(1);
      expect(res.events[0]?.title).toBe("Anniversary");

      const chapters = await repo.chapters();
      expect(chapters.length).toBe(1);
      expect(chapters[0]?.title).toBe("Golden November");
    });
  });

  describe("httpMemories", () => {
    it("manages memories and collections", async () => {
      const api = mockApiClient({
        get: jest.fn((path: string) => {
          if (path === "/v1/memories") {
            return Promise.resolve([
              {
                id: "mem-1",
                authorId: "u1",
                title: "Coffee in Tomoca",
                story: "Warm aroma",
                date: "2026-10-15",
                place: "Addis",
                kind: "text",
                tags: ["coffee"],
                collections: [],
                createdAt: "2026-10-15T12:00:00Z",
                updatedAt: "2026-10-15T12:00:00Z",
              },
            ]);
          }
          if (path === "/v1/memories/collections") {
            return Promise.resolve([
              {
                id: "col-1",
                authorId: "u1",
                title: "Travels",
                description: "Trips",
                art: "plane",
                count: 1,
                createdAt: "2026-10-15T12:00:00Z",
              },
            ]);
          }
          return Promise.reject(new Error("unexpected path"));
        }),
        post: jest.fn(() =>
          Promise.resolve({
            id: "mem-new",
            authorId: "u1",
            title: "New",
            story: "",
            date: "2026-11-06",
            place: "",
            kind: "text",
            tags: [],
            collections: [],
            createdAt: "2026-11-06T12:00:00Z",
            updatedAt: "2026-11-06T12:00:00Z",
          }),
        ),
        postNoContent: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      });

      const repo = createHttpMemories(api);
      const list = await repo.list({
        query: "Tomoca",
        kinds: [],
        who: "both",
        collectionId: null,
      });
      expect(list.length).toBe(1);
      expect(list[0]?.title).toBe("Coffee in Tomoca");

      const cols = await repo.collections();
      expect(cols.length).toBe(1);
      expect(cols[0]?.title).toBe("Travels");
    });
  });

  describe("httpTogether", () => {
    it("manages plans, places, and songs", async () => {
      const api = mockApiClient({
        get: jest.fn((path: string) => {
          if (path === "/v1/together/plans") {
            return Promise.resolve([
              {
                id: "plan-1",
                authorId: "u1",
                title: "Trip to Hawassa",
                note: "",
                theme: "travel",
                place: "Hawassa",
                when: { kind: "soon" },
                completedAt: null,
                createdAt: "2026-11-06T12:00:00Z",
                updatedAt: "2026-11-06T12:00:00Z",
              },
            ]);
          }
          if (path === "/v1/together/places") {
            return Promise.resolve([
              {
                id: "place-1",
                authorId: "u1",
                name: "Entoto Park",
                note: "",
                createdAt: "2026-11-06T12:00:00Z",
              },
            ]);
          }
          if (path === "/v1/together/songs") {
            return Promise.resolve([
              {
                id: "song-1",
                authorId: "u1",
                title: "Tizita",
                artist: "Mahmoud Ahmed",
                link: "https://example.com/song",
                note: "",
                createdAt: "2026-11-06T12:00:00Z",
              },
            ]);
          }
          return Promise.reject(new Error("unexpected path"));
        }),
        post: jest.fn(() => Promise.resolve({ id: "new-id" })),
        postNoContent: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      });

      const repo = createHttpTogether(api);
      const plans = await repo.plans();
      expect(plans.length).toBe(1);
      expect(plans[0]?.title).toBe("Trip to Hawassa");

      const places = await repo.places();
      expect(places.length).toBe(1);
      expect(places[0]?.name).toBe("Entoto Park");

      const songs = await repo.songs();
      expect(songs.length).toBe(1);
      expect(songs[0]?.title).toBe("Tizita");
    });
  });
});
