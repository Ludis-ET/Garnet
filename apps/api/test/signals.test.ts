import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type {
  SendSignalResponse,
  SignalHistoryResponse,
  UsOverviewResponse,
} from "@garnet/contracts";
import { startTestApi, type TestApi } from "./harness";

describe("Signals and Us API (B4, B-51, US-01 to US-10, P-07, P-66, §5)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  }, 60_000);

  afterAll(async () => {
    await api.close();
  });

  it("sends gentle and support signals with payloads", async () => {
    // 1. Gentle signal: thought-of-you
    const res1 = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.selam,
      body: {
        signal: "thought-of-you",
        payload: { note: "Thinking about our walk" },
      },
    });
    expect(res1.statusCode).toBe(200);
    const body1 = res1.json<SendSignalResponse>();
    expect(body1.signal).toBe("thought-of-you");
    expect(body1.sentAt).toBeTruthy();

    // 2. Missing-you signal with missing level
    const res2 = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.selam,
      body: {
        signal: "missing-you",
        payload: { level: "A lot" },
      },
    });
    expect(res2.statusCode).toBe(200);

    // 3. Support signal: check-on-me with when, answered so it does not linger
    const res3 = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.noah,
      body: {
        signal: "check-on-me",
        payload: { when: "later" },
      },
    });
    expect(res3.statusCode).toBe(200);
    const id3 = res3.json<SendSignalResponse>().id;
    await api.call("POST", `/v1/signals/${id3}/respond`, {
      cookie: api.cookies.selam,
      body: { response: "later" },
    });
  });

  it("pins unanswered partner support signal on Us overview (US-05)", async () => {
    // Noah sends support signal "need-to-talk"
    const sendRes = await api.call("POST", "/v1/signals", {
      cookie: api.cookies.noah,
      body: {
        signal: "need-to-talk",
        payload: { topic: "Something difficult" },
      },
    });
    const supportId = sendRes.json<SendSignalResponse>().id;

    // Selam checks Us overview: support signal is pinned as openSupport
    const overviewRes1 = await api.call("GET", "/v1/us/overview", {
      cookie: api.cookies.selam,
    });
    const overview1 = overviewRes1.json<UsOverviewResponse>();
    expect(overview1.openSupport).not.toBeNull();
    expect(overview1.openSupport?.id).toBe(supportId);
    expect(overview1.openSupport?.mine).toBe(false);

    // Selam responds to Noah's support signal
    const respondRes = await api.call("POST", `/v1/signals/${supportId}/respond`, {
      cookie: api.cookies.selam,
      body: { response: "here" },
    });
    expect(respondRes.statusCode).toBe(204);

    // Support signal is now answered, so openSupport is cleared
    const overviewRes2 = await api.call("GET", "/v1/us/overview", {
      cookie: api.cookies.selam,
    });
    const overview2 = overviewRes2.json<UsOverviewResponse>();
    expect(overview2.openSupport).toBeNull();
  });

  it("clears openSupport when partner sends okay-now afterwards (US-09)", async () => {
    // Noah sends support signal "just-listen"
    await api.call("POST", "/v1/signals", {
      cookie: api.cookies.noah,
      body: { signal: "just-listen" },
    });

    const overview1 = (
      await api.call("GET", "/v1/us/overview", { cookie: api.cookies.selam })
    ).json<UsOverviewResponse>();
    expect(overview1.openSupport?.signal).toBe("just-listen");

    // Noah sends "okay-now"
    await api.call("POST", "/v1/signals", {
      cookie: api.cookies.noah,
      body: { signal: "okay-now" },
    });

    // Selam sees openSupport cleared by okay-now
    const overview2 = (
      await api.call("GET", "/v1/us/overview", { cookie: api.cookies.selam })
    ).json<UsOverviewResponse>();
    expect(overview2.openSupport).toBeNull();
  });

  it("calculates distance between coarse coordinates (~11 km, P-66)", async () => {
    // Set Selam's coarse location: Addis Ababa (9.03, 38.74)
    await api.call("PUT", "/v1/me/location", {
      cookie: api.cookies.selam,
      body: { lat: 9.032, lon: 38.742 },
    });

    // Set Noah's coarse location: London (51.507, -0.128)
    await api.call("PUT", "/v1/me/location", {
      cookie: api.cookies.noah,
      body: { lat: 51.5074, lon: -0.1278 },
    });

    const overview = (
      await api.call("GET", "/v1/us/overview", { cookie: api.cookies.selam })
    ).json<UsOverviewResponse>();

    expect(overview.distance).not.toBeNull();
    // Addis Ababa to London is approximately 5900 km
    expect(overview.distance?.km).toBeGreaterThan(5800);
    expect(overview.distance?.km).toBeLessThan(6000);
    expect(overview.distance?.approximate).toBe(false);

    // If location sharing is disabled, distance is null
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.selam,
      body: { location: { share: false } },
    });

    const overviewOff = (
      await api.call("GET", "/v1/us/overview", { cookie: api.cookies.selam })
    ).json<UsOverviewResponse>();
    expect(overviewOff.distance).toBeNull();

    // Restore location sharing
    await api.call("PATCH", "/v1/me/settings", {
      cookie: api.cookies.selam,
      body: { location: { share: true } },
    });
  });

  it("lists chronological signal history without totals or counts (§5)", async () => {
    const res = await api.call("GET", "/v1/signals", {
      cookie: api.cookies.selam,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<SignalHistoryResponse>();
    expect(Array.isArray(body.signals)).toBe(true);
    expect(body.signals.length).toBeGreaterThan(0);

    // Verify ordering: newest first
    for (let i = 1; i < body.signals.length; i++) {
      const prev = new Date(body.signals[i - 1]?.at ?? "").getTime();
      const curr = new Date(body.signals[i]?.at ?? "").getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
