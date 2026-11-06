import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  CalendarEventDto,
  MemoryDto,
  OpenWhenViewDto,
  SurpriseViewDto,
  TogetherPlanDto,
  TogetherSongDto,
} from "@garnet/contracts";
import { startTestApi, type TestApi } from "./harness";

describe("Moments integration suite (Milestone B8, B-90, B-91, B-92)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  describe("Open When Letters (B-90, U-31, U-34)", () => {
    it("handles full lifecycle: draft -> seal (body withheld) -> open -> shared delete", async () => {
      // 1. Selam creates draft letter
      const draftRes = await api.call("POST", "/v1/letters/draft", {
        cookie: api.cookies.selam,
        body: {
          prompt: "Open when it rains in London",
          body: "Sending warm thoughts and an imaginary umbrella.",
          paper: { paper: "cream", font: "serif" },
        },
      });
      expect(draftRes.statusCode).toBe(201);
      const draftData = draftRes.json<OpenWhenViewDto>();
      const letterId = draftData.id;
      expect(draftData.status).toBe("draft");
      if (draftData.status === "draft") {
        expect(draftData.body).toBe("Sending warm thoughts and an imaginary umbrella.");
      }

      // Noah cannot see Selam's draft (Private drafts stay private §5)
      const noahDraftRes = await api.call("GET", `/v1/letters/${letterId}`, {
        cookie: api.cookies.noah,
      });
      expect(noahDraftRes.statusCode).toBe(404);

      // Selam edits draft
      const patchRes = await api.call("PATCH", `/v1/letters/${letterId}`, {
        cookie: api.cookies.selam,
        body: {
          body: "Sending warm thoughts, hot tea, and an imaginary umbrella.",
        },
      });
      expect(patchRes.statusCode).toBe(200);
      const patchData = patchRes.json<OpenWhenViewDto>();
      if (patchData.status === "draft") {
        expect(patchData.body).toContain("hot tea");
      }

      // 2. Selam seals the letter
      const sealRes = await api.call("POST", `/v1/letters/${letterId}/seal`, {
        cookie: api.cookies.selam,
        body: { unlockRule: { type: "manual" } },
      });
      expect(sealRes.statusCode).toBe(201);
      const sealData = sealRes.json<OpenWhenViewDto>();
      expect(sealData.status).toBe("sealed");
      expect("body" in sealData).toBe(false);

      // CRITICAL B-90 / U-34: Both partners now see sealed letter, but neither gets the body!
      const selamSealed = await api.call("GET", `/v1/letters/${letterId}`, {
        cookie: api.cookies.selam,
      });
      expect(selamSealed.statusCode).toBe(200);
      const selamSealedData = selamSealed.json<OpenWhenViewDto>();
      expect(selamSealedData.status).toBe("sealed");
      expect("body" in selamSealedData).toBe(false);

      const noahSealed = await api.call("GET", `/v1/letters/${letterId}`, {
        cookie: api.cookies.noah,
      });
      expect(noahSealed.statusCode).toBe(200);
      const noahSealedData = noahSealed.json<OpenWhenViewDto>();
      expect(noahSealedData.status).toBe("sealed");
      expect("body" in noahSealedData).toBe(false);

      // 3. Noah opens the letter
      const openRes = await api.call("POST", `/v1/letters/${letterId}/open`, {
        cookie: api.cookies.noah,
      });
      expect(openRes.statusCode).toBe(201);
      const openResult = openRes.json<{ ok: boolean; view: OpenWhenViewDto }>();
      expect(openResult.ok).toBe(true);
      expect(openResult.view.status).toBe("opened");
      if (openResult.view.status === "opened") {
        expect(openResult.view.body).toContain("hot tea");
      }

      // Now both partners can see the opened body
      const selamOpened = await api.call("GET", `/v1/letters/${letterId}`, {
        cookie: api.cookies.selam,
      });
      const selamOpenedData = selamOpened.json<OpenWhenViewDto>();
      expect(selamOpenedData.status).toBe("opened");
      if (selamOpenedData.status === "opened") {
        expect(selamOpenedData.body).toContain("hot tea");
      }

      // Shared deletion (U-31): Noah deletes opened letter
      const delRes = await api.call("DELETE", `/v1/letters/${letterId}`, {
        cookie: api.cookies.noah,
      });
      expect(delRes.statusCode).toBe(200);

      const gone = await api.call("GET", `/v1/letters/${letterId}`, {
        cookie: api.cookies.selam,
      });
      expect(gone.statusCode).toBe(404);
    });
  });

  describe("Surprises (P-68, P-71)", () => {
    it("schedules, retitles, withholds content while locked, and reveals upon open", async () => {
      // Noah creates scheduled surprise
      const createRes = await api.call("POST", "/v1/surprises", {
        cookie: api.cookies.noah,
        body: {
          content: {
            kind: "song",
            textContent: "Our favorite coffee shop track",
            songInfo: { title: "Tizita", artist: "Mahmoud Ahmed" },
          },
          safeTitle: "A morning surprise",
          reveal: { kind: "now" },
        },
      });
      expect(createRes.statusCode).toBe(201);
      const surpriseId = createRes.json<{ id: string }>().id;

      // Selam lists surprises: content is NOT delivered
      const listRes = await api.call("GET", "/v1/surprises", {
        cookie: api.cookies.selam,
      });
      expect(listRes.statusCode).toBe(200);
      const listData = listRes.json<{ partnerName: string; items: SurpriseViewDto[] }>();
      const item = listData.items.find((i) => i.id === surpriseId);
      expect(item).toBeDefined();
      if (item) {
        expect(item.state).toBe("scheduled");
        expect("content" in item).toBe(false);
      }

      // Noah retitles safe title
      const retitleRes = await api.call("PATCH", `/v1/surprises/${surpriseId}/retitle`, {
        cookie: api.cookies.noah,
        body: { safeTitle: "For your sunny morning" },
      });
      expect(retitleRes.statusCode).toBe(200);

      // Selam opens the surprise
      const openRes = await api.call("POST", `/v1/surprises/${surpriseId}/open`, {
        cookie: api.cookies.selam,
      });
      expect(openRes.statusCode).toBe(201);
      const openData = openRes.json<SurpriseViewDto>();
      expect(openData.state).toBe("opened");
      expect(openData.safeTitle).toBe("For your sunny morning");
      if (openData.state === "opened") {
        expect(openData.content.textContent).toBe("Our favorite coffee shop track");
        expect(openData.content.songInfo?.title).toBe("Tizita");
      }
    });
  });

  describe("Events & Chapters (ADR-0002, EVT-07)", () => {
    it("manages calendar events with dual timezone displays and chapter reflections", async () => {
      // Save event with time
      const saveRes = await api.call("POST", "/v1/events", {
        cookie: api.cookies.selam,
        body: {
          title: "Weekly Sunday Call",
          kind: "date",
          firstDate: "2026-11-08",
          eventTime: "18:00",
          timeZone: "Europe/London",
          repeats: "none",
        },
      });
      expect(saveRes.statusCode).toBe(201);
      const eventId = saveRes.json<{ id: string }>().id;

      // List events: verifies dual time calculation (London vs Addis)
      const listRes = await api.call("GET", "/v1/events", {
        cookie: api.cookies.selam,
      });
      expect(listRes.statusCode).toBe(200);
      type EventWithTimes = CalendarEventDto & { times?: { me: string; partner: string } };
      const listData = listRes.json<{ today: string; events: EventWithTimes[] }>();
      const event = listData.events.find((e) => e.id === eventId);
      expect(event).toBeDefined();
      expect(event?.times).toBeDefined();
      // 18:00 London is 21:00 Addis in November (UTC vs UTC+3)
      expect(event?.times?.me).toBe("18:00");
      expect(event?.times?.partner).toBe("21:00");

      // Chapters: reflect on November prompt
      const reflectRes = await api.call("POST", "/v1/events/chapters/2026-11/reflect/gratitude", {
        cookie: api.cookies.selam,
        body: { reflection: "Grateful for every conversation across the miles." },
      });
      expect(reflectRes.statusCode).toBe(201);

      // Rename chapter
      const renameRes = await api.call("POST", "/v1/events/chapters/2026-11/rename", {
        cookie: api.cookies.noah,
        body: { title: "Golden November" },
      });
      expect(renameRes.statusCode).toBe(201);

      // Chapter detail contains reflections and title
      const chapterRes = await api.call("GET", "/v1/events/chapters/2026-11", {
        cookie: api.cookies.selam,
      });
      expect(chapterRes.statusCode).toBe(200);
      const chapterData = chapterRes.json<{
        title: string;
        reflections: { promptId: string; userId: string; reflection: string }[];
      }>();
      expect(chapterData.title).toBe("Golden November");
      expect(chapterData.reflections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Memories & Collections (U-16, §23)", () => {
    it("curates joint memories and categorizes into collections", async () => {
      // 1. Create collection
      const colRes = await api.call("POST", "/v1/memories/collections", {
        cookie: api.cookies.selam,
        body: {
          title: "Our Coffee Adventures",
          description: "Every cup shared together",
          art: "cup",
        },
      });
      expect(colRes.statusCode).toBe(201);
      const colId = colRes.json<{ id: string }>().id;

      // 2. Save memory linked to collection
      const memRes = await api.call("POST", "/v1/memories", {
        cookie: api.cookies.noah,
        body: {
          title: "Buna at Bole",
          story: "A warm traditional ceremony",
          date: "2026-10-20",
          place: "Addis Ababa",
          kind: "text",
          tags: ["buna", "traditional"],
          collectionIds: [colId],
        },
      });
      expect(memRes.statusCode).toBe(201);
      const memData = memRes.json<MemoryDto>();
      const memId = memData.id;
      expect(memData.collections[0]?.id).toBe(colId);

      // 3. Filter memories
      const filtered = await api.call("GET", "/v1/memories?tag=buna", {
        cookie: api.cookies.selam,
      });
      expect(filtered.statusCode).toBe(200);
      const filteredData = filtered.json<MemoryDto[]>();
      expect(filteredData.some((m) => m.id === memId)).toBe(true);

      const nonMatching = await api.call("GET", "/v1/memories?tag=ocean", {
        cookie: api.cookies.selam,
      });
      expect(nonMatching.statusCode).toBe(200);
      const nonMatchingData = nonMatching.json<MemoryDto[]>();
      expect(nonMatchingData.some((m) => m.id === memId)).toBe(false);

      // 4. Anonymous deletion for both partners (U-16)
      const delRes = await api.call("DELETE", `/v1/memories/${memId}`, {
        cookie: api.cookies.selam,
      });
      expect(delRes.statusCode).toBe(200);

      const checkGone = await api.call("GET", `/v1/memories/${memId}`, {
        cookie: api.cookies.noah,
      });
      expect(checkGone.statusCode).toBe(200);
      expect(checkGone.json()).toBeNull();
    });
  });

  describe("Our World (Together) (P-21, P-72)", () => {
    it("manages shared plans, places, and soundtracks", async () => {
      // Plans
      const planRes = await api.call("POST", "/v1/together/plans", {
        cookie: api.cookies.selam,
        body: {
          title: "Cooking Ethiopian feast in London",
          theme: "home",
          place: "London Flat",
          when: { kind: "soon" },
        },
      });
      expect(planRes.statusCode).toBe(201);
      const planId = planRes.json<{ id: string }>().id;

      // Complete together
      const completeRes = await api.call("POST", `/v1/together/plans/${planId}/complete`, {
        cookie: api.cookies.noah,
      });
      expect(completeRes.statusCode).toBe(201);

      const plansList = await api.call("GET", "/v1/together/plans", {
        cookie: api.cookies.selam,
      });
      const plansData = plansList.json<TogetherPlanDto[]>();
      const completedPlan = plansData.find((p) => p.id === planId);
      expect(completedPlan?.completedAt).not.toBeNull();

      // Places (P-21: explicit check-in, no background geolocation)
      const placeRes = await api.call("POST", "/v1/together/places", {
        cookie: api.cookies.selam,
        body: {
          name: "National Theatre Rooftop",
          note: "Watching the Thames at twilight",
        },
      });
      expect(placeRes.statusCode).toBe(201);

      // Songs
      const songRes = await api.call("POST", "/v1/together/songs", {
        cookie: api.cookies.noah,
        body: {
          title: "Tezeta",
          artist: "Mulatu Astatke",
          link: "https://open.spotify.com/track/example",
          note: "Makes the distance feel shorter",
        },
      });
      expect(songRes.statusCode).toBe(201);
      const songId = songRes.json<{ id: string }>().id;

      const songsList = await api.call("GET", "/v1/together/songs", {
        cookie: api.cookies.selam,
      });
      const songsData = songsList.json<TogetherSongDto[]>();
      expect(songsData.some((s) => s.id === songId)).toBe(true);
    });
  });
});
