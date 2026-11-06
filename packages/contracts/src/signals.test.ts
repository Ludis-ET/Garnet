import { describe, expect, it } from "vitest";
import {
  respondSignalRequestSchema,
  saveLocationRequestSchema,
  sendSignalRequestSchema,
  sendSignalResponseSchema,
  signalHistoryResponseSchema,
  signalItemDtoSchema,
  usOverviewResponseSchema,
} from "./signals";

describe("Signals contracts (B4, §5, P-66)", () => {
  it("validates send signal requests", () => {
    const valid = sendSignalRequestSchema.safeParse({
      signal: "thought-of-you",
      payload: { note: "Thinking of you" },
    });
    expect(valid.success).toBe(true);

    const support = sendSignalRequestSchema.safeParse({
      signal: "need-you",
      payload: {
        need: "comfort",
        level: "I need a hug",
      },
    });
    expect(support.success).toBe(true);

    const invalidSignal = sendSignalRequestSchema.safeParse({
      signal: "invalid-signal",
    });
    expect(invalidSignal.success).toBe(false);
  });

  it("validates send signal responses", () => {
    const valid = sendSignalResponseSchema.safeParse({
      id: "0192f0a0-0000-7000-8000-000000000001",
      signal: "thought-of-you",
      sentAt: "2026-11-05T20:00:00Z",
    });
    expect(valid.success).toBe(true);
  });

  it("validates signal responses", () => {
    const valid = respondSignalRequestSchema.safeParse({
      response: "here",
    });
    expect(valid.success).toBe(true);

    const withBody = respondSignalRequestSchema.safeParse({
      response: "comfort",
      body: "Sending lots of love",
    });
    expect(withBody.success).toBe(true);

    const invalid = respondSignalRequestSchema.safeParse({
      response: "unknown",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates signal item DTOs", () => {
    const valid = signalItemDtoSchema.safeParse({
      id: "0192f0a0-0000-7000-8000-000000000001",
      signal: "need-to-talk",
      mine: false,
      at: "2026-11-05T20:00:00Z",
      payload: { topic: "Us" },
      responses: ["here"],
    });
    expect(valid.success).toBe(true);
  });

  it("validates save coarse location requests", () => {
    const valid = saveLocationRequestSchema.safeParse({
      lat: 9.03,
      lon: 38.74,
    });
    expect(valid.success).toBe(true);

    const clear = saveLocationRequestSchema.safeParse({
      lat: null,
      lon: null,
    });
    expect(clear.success).toBe(true);

    const invalidLat = saveLocationRequestSchema.safeParse({
      lat: 100, // beyond 90
      lon: 38.74,
    });
    expect(invalidLat.success).toBe(false);
  });

  it("validates Us overview response", () => {
    const valid = usOverviewResponseSchema.safeParse({
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
      distance: {
        km: 5900,
        approximate: true,
      },
      openSupport: null,
      recent: [
        {
          id: "0192f0a0-0000-7000-8000-000000000001",
          signal: "thought-of-you",
          mine: true,
          at: "2026-11-05T20:00:00Z",
          payload: {},
          responses: [],
        },
      ],
    });
    expect(valid.success).toBe(true);
  });

  it("validates signal history response", () => {
    const valid = signalHistoryResponseSchema.safeParse({
      signals: [],
    });
    expect(valid.success).toBe(true);
  });
});
