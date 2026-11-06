import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type SearchQueryResponse } from "@garnet/contracts";
import { startTestApi, type TestApi } from "./harness";

describe("search engine API (B12, P-88)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  it("searches chat messages across partners while honoring delete-for-me", async () => {
    const msgId = randomUUID();
    // Noah sends a chat message
    const sendRes = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.noah,
      body: {
        id: msgId,
        text: "Starry nights and hot Ethiopian coffee in Addis",
      },
    });
    expect(sendRes.statusCode).toBe(200);

    // Noah searches
    const noahSearch = await api.call("GET", "/v1/search?q=coffee", {
      cookie: api.cookies.noah,
    });
    expect(noahSearch.statusCode).toBe(200);
    const noahData = noahSearch.json<SearchQueryResponse>();
    const foundMsg = noahData.results.find((r) => r.id === msgId);
    expect(foundMsg).toBeDefined();
    expect(foundMsg?.kind).toBe("message");
    expect(foundMsg?.title).toBe("You");
    expect(foundMsg?.mine).toBe(true);

    // Selam searches
    const selamSearch = await api.call("GET", "/v1/search?q=coffee", {
      cookie: api.cookies.selam,
    });
    expect(selamSearch.statusCode).toBe(200);
    const selamData = selamSearch.json<SearchQueryResponse>();
    const selamFound = selamData.results.find((r) => r.id === msgId);
    expect(selamFound).toBeDefined();
    expect(selamFound?.mine).toBe(false);

    // Selam deletes for me
    await api.call("DELETE", `/v1/chat/messages/${msgId}`, {
      cookie: api.cookies.selam,
      body: { mode: "for-me" },
    });

    // Selam searches again: message should be gone
    const selamSearchAfter = await api.call("GET", "/v1/search?q=coffee", {
      cookie: api.cookies.selam,
    });
    const selamAfterData = selamSearchAfter.json<SearchQueryResponse>();
    expect(selamAfterData.results.some((r) => r.id === msgId)).toBe(false);

    // Noah still sees it
    const noahSearchAfter = await api.call("GET", "/v1/search?q=coffee", {
      cookie: api.cookies.noah,
    });
    const noahAfterData = noahSearchAfter.json<SearchQueryResponse>();
    expect(noahAfterData.results.some((r) => r.id === msgId)).toBe(true);
  });

  it("strictly enforces §5 product guardrails: partner's private drafts never match search", async () => {
    const entryId = randomUUID();
    // Noah writes a private draft entry in Days
    const createRes = await api.call("POST", "/v1/mutations", {
      cookie: api.cookies.noah,
      body: {
        mutations: [
          {
            kind: "create",
            mutationId: randomUUID(),
            entryId,
            entryKind: "text",
            body: "Secret surprise travel itinerary to Lalibela hidden from Selam",
            visibility: "private",
            occurredAt: "2026-11-06T12:00:00.000Z",
            occurredTimeZone: "Europe/London",
          },
        ],
      },
    });
    expect(createRes.statusCode).toBe(200);

    // Noah searches: can find his own private draft
    const noahSearch = await api.call("GET", "/v1/search?q=Lalibela", {
      cookie: api.cookies.noah,
    });
    const noahData = noahSearch.json<SearchQueryResponse>();
    expect(noahData.results.some((r) => r.id === entryId)).toBe(true);

    // Selam searches: MUST NEVER match Noah's private draft (§5 Product Guardrail)
    const selamSearch = await api.call("GET", "/v1/search?q=Lalibela", {
      cookie: api.cookies.selam,
    });
    const selamData = selamSearch.json<SearchQueryResponse>();
    expect(selamData.results.some((r) => r.id === entryId)).toBe(false);
  });

  it("strictly enforces §5 guardrails: sealed letter bodies are unsearchable until opened (B-90, U-34)", async () => {
    // Noah drafts a letter
    const draftRes = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.noah,
      body: {
        prompt: "Open when you miss our rainy walks in Kensington",
        body: "SuperSecretPassword123 inside the sealed envelope",
      },
    });
    expect(draftRes.statusCode).toBe(201);
    const { id: letterId } = draftRes.json<{ id: string }>();

    // Noah seals the letter for Selam
    const sealRes = await api.call("POST", `/v1/letters/${letterId}/seal`, {
      cookie: api.cookies.noah,
      body: { unlockRule: { type: "manual" } },
    });
    expect(sealRes.statusCode).toBe(201);

    // Selam searches for the prompt keyword: matches safe prompt, but body is sealed!
    const promptSearch = await api.call("GET", "/v1/search?q=Kensington&kinds=letter", {
      cookie: api.cookies.selam,
    });
    const promptData = promptSearch.json<SearchQueryResponse>();
    const letterResult = promptData.results.find((r) => r.id === letterId);
    expect(letterResult).toBeDefined();
    expect(letterResult?.sealed).toBe(true);
    expect(letterResult?.snippet).toBe("Sealed letter"); // body text never leaked!

    // Selam searches for keyword inside the body ("SuperSecretPassword123"): MUST RETURN 0 MATCHES!
    const bodySearch = await api.call("GET", "/v1/search?q=SuperSecretPassword123", {
      cookie: api.cookies.selam,
    });
    const bodyData = bodySearch.json<SearchQueryResponse>();
    expect(bodyData.results.some((r) => r.id === letterId)).toBe(false);

    // Now Selam opens the letter
    await api.call("POST", `/v1/letters/${letterId}/open`, {
      cookie: api.cookies.selam,
    });

    // Once opened, Selam can search body text
    const openedSearch = await api.call("GET", "/v1/search?q=SuperSecretPassword123", {
      cookie: api.cookies.selam,
    });
    const openedData = openedSearch.json<SearchQueryResponse>();
    const openedLetter = openedData.results.find((r) => r.id === letterId);
    expect(openedLetter).toBeDefined();
    expect(openedLetter?.sealed).toBe(false);
    expect(openedLetter?.snippet).toContain("SuperSecretPassword123");
  });

  it("isolates across relationships: stranger never sees partner content", async () => {
    const res = await api.call("GET", "/v1/search?q=coffee", {
      cookie: api.cookies.stranger,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json<SearchQueryResponse>();
    expect(data.results).toHaveLength(0);
    expect(data.totalEstimated).toBe(0);
  });

  it("supports filters and pagination", async () => {
    // Kinds filter
    const msgOnly = await api.call("GET", "/v1/search?q=coffee&kinds=message", {
      cookie: api.cookies.noah,
    });
    const msgData = msgOnly.json<SearchQueryResponse>();
    expect(msgData.results.every((r) => r.kind === "message")).toBe(true);

    // Who filter
    const partnerOnly = await api.call("GET", "/v1/search?q=coffee&who=partner", {
      cookie: api.cookies.noah,
    });
    const partnerData = partnerOnly.json<SearchQueryResponse>();
    expect(partnerData.results.every((r) => !r.mine)).toBe(true);
  });
});
