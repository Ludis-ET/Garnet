import { describe, expect, it } from "vitest";
import {
  deleteAccountRequestSchema,
  endSpaceRequestSchema,
  exportDataBundleSchema,
  exportStatusSchema,
  reauthRequestSchema,
  reauthResponseSchema,
} from "./dataRights";

describe("dataRights contracts", () => {
  it("validates export status schema", () => {
    const valid = {
      state: "ready",
      readyAt: "2026-11-06T12:00:00.000Z",
      expiresAt: "2026-11-13T12:00:00.000Z",
      downloadUrl: "https://example.com/download/token123",
      sizeBytes: 1024,
    };
    expect(exportStatusSchema.parse(valid)).toEqual(valid);

    const noneState = {
      state: "none",
      readyAt: null,
      expiresAt: null,
      downloadUrl: null,
      sizeBytes: null,
    };
    expect(exportStatusSchema.parse(noneState)).toEqual(noneState);
  });

  it("validates reauth schema", () => {
    expect(reauthRequestSchema.parse({ password: "secretPassword" })).toEqual({
      password: "secretPassword",
    });
    expect(() => reauthRequestSchema.parse({ password: "" })).toThrow();
    expect(reauthResponseSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it("enforces confirmation words for end-space and delete-account", () => {
    expect(endSpaceRequestSchema.parse({ confirmWord: "END" })).toEqual({ confirmWord: "END" });
    expect(() => endSpaceRequestSchema.parse({ confirmWord: "end" })).toThrow();
    expect(() => endSpaceRequestSchema.parse({ confirmWord: "DELETE" })).toThrow();

    expect(deleteAccountRequestSchema.parse({ confirmWord: "DELETE" })).toEqual({
      confirmWord: "DELETE",
    });
    expect(() => deleteAccountRequestSchema.parse({ confirmWord: "delete" })).toThrow();
    expect(() => deleteAccountRequestSchema.parse({ confirmWord: "CANCEL" })).toThrow();
  });

  it("validates export data bundle structure", () => {
    const bundle = {
      version: 1,
      exportedAt: "2026-11-06T12:00:00.000Z",
      user: {
        id: "018f3a5b-7c2a-7def-89ab-0123456789ab",
        email: "selam@example.com",
        name: "Selam",
      },
      profile: { nickname: "Ruby" },
      settings: { sound: true },
      days: [{ id: "018f3a5b-7c2a-7def-89ab-0123456789ac", text: "Morning run" }],
      chat: [{ id: "018f3a5b-7c2a-7def-89ab-0123456789ad", body: "Hello!" }],
      letters: [{ id: "018f3a5b-7c2a-7def-89ab-0123456789ae", prompt: "Open when happy" }],
      surprises: [],
      memories: [],
      together: {
        plans: [],
        places: [],
        songs: [],
      },
      events: [],
    };
    expect(exportDataBundleSchema.parse(bundle)).toEqual(bundle);
  });
});
