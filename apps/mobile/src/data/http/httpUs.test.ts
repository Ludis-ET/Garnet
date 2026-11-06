import { createHttpUs } from "./httpUs";
import type { ApiClient } from "./client";

describe("HttpUs repository (B4, B-51, US-01 to US-10, P-07, P-66, §5)", () => {
  let mockApi: {
    get: jest.Mock;
    post: jest.Mock;
    postNoContent: jest.Mock;
    put: jest.Mock;
  };

  beforeEach(() => {
    mockApi = {
      get: jest.fn(),
      post: jest.fn(),
      postNoContent: jest.fn(),
      put: jest.fn(),
    };
  });

  it("fetches overview with me, partner, distance, openSupport, and recent", async () => {
    mockApi.get.mockResolvedValueOnce({
      me: {
        name: "Selam",
        side: "ruby",
        zone: "Africa/Addis_Ababa",
      },
      partner: {
        name: "Noah",
        side: "sapphire",
        zone: "Europe/London",
      },
      distance: { km: 5900, approximate: false },
      openSupport: {
        id: "0192f0a0-0000-7000-8000-000000000001",
        signal: "need-you",
        mine: false,
        at: "2026-11-05T20:00:00Z",
        payload: { need: "comfort" },
        responses: [],
      },
      recent: [
        {
          id: "0192f0a0-0000-7000-8000-000000000001",
          signal: "need-you",
          mine: false,
          at: "2026-11-05T20:00:00Z",
          payload: { need: "comfort" },
          responses: [],
        },
      ],
    });

    const us = createHttpUs(mockApi as unknown as ApiClient);
    const overview = await us.overview();

    expect(overview.me.name).toBe("Selam");
    expect(overview.partner.name).toBe("Noah");
    expect(overview.distance).toEqual({ km: 5900, approximate: false });
    expect(overview.openSupport?.signal).toBe("need-you");
    expect(overview.recent).toHaveLength(1);
    expect(mockApi.get).toHaveBeenCalledWith("/v1/us/overview", expect.anything());
  });

  it("fetches signal history", async () => {
    mockApi.get.mockResolvedValueOnce({
      signals: [
        {
          id: "0192f0a0-0000-7000-8000-000000000002",
          signal: "thought-of-you",
          mine: true,
          at: "2026-11-05T21:00:00Z",
          payload: { note: "Sweet dreams" },
          responses: ["thought"],
        },
      ],
    });

    const us = createHttpUs(mockApi as unknown as ApiClient);
    const history = await us.history();

    expect(history).toHaveLength(1);
    expect(history[0]?.signal).toBe("thought-of-you");
    expect(history[0]?.mine).toBe(true);
    expect(mockApi.get).toHaveBeenCalledWith("/v1/signals", expect.anything());
  });

  it("sends a signal", async () => {
    mockApi.post.mockResolvedValueOnce({
      id: "0192f0a0-0000-7000-8000-000000000003",
      signal: "missing-you",
      sentAt: "2026-11-05T22:00:00Z",
    });

    const us = createHttpUs(mockApi as unknown as ApiClient);
    const res = await us.send("missing-you", { level: "A lot" });

    expect(res.sentAt).toBe("2026-11-05T22:00:00Z");
    expect(mockApi.post).toHaveBeenCalledWith("/v1/signals", expect.anything(), {
      signal: "missing-you",
      payload: { level: "A lot" },
    });
  });

  it("responds to a signal", async () => {
    mockApi.postNoContent.mockResolvedValueOnce(undefined);

    const us = createHttpUs(mockApi as unknown as ApiClient);
    await us.respond("0192f0a0-0000-7000-8000-000000000001", "here");

    expect(mockApi.postNoContent).toHaveBeenCalledWith(
      "/v1/signals/0192f0a0-0000-7000-8000-000000000001/respond",
      { response: "here" },
    );
  });

  it("saves coarse location or clears it", async () => {
    mockApi.put.mockResolvedValue(undefined);

    const us = createHttpUs(mockApi as unknown as ApiClient);

    // Save location
    await us.saveLocation({ lat: 9.03, lon: 38.74 });
    expect(mockApi.put).toHaveBeenCalledWith("/v1/me/location", { lat: 9.03, lon: 38.74 });

    // Clear location
    await us.saveLocation(null);
    expect(mockApi.put).toHaveBeenCalledWith("/v1/me/location", { lat: null, lon: null });
  });
});
