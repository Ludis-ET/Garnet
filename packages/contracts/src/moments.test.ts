import { describe, expect, it } from "vitest";
import {
  createLetterDraftSchema,
  createSurpriseSchema,
  openWhenSealedViewSchema,
  openWhenViewSchema,
  saveEventSchema,
  saveMemorySchema,
  savePlanSchema,
  saveSongSchema,
  surpriseScheduledViewSchema,
  surpriseViewSchema,
} from "./moments";

describe("moments contracts", () => {
  it("enforces B-90 / U-34: sealed letter view schema excludes body", () => {
    const sealedData = {
      id: "0192e2b3-5798-7521-8254-e6be95232a97",
      status: "sealed",
      authorId: "0192e2b3-5798-7521-8254-e6be95232a98",
      recipientId: "0192e2b3-5798-7521-8254-e6be95232a99",
      prompt: "Open when it rains",
      sealedAt: "2026-11-06T12:00:00Z",
      unlockRule: { type: "manual" },
      createdAt: "2026-11-06T11:00:00Z",
    };

    const parsed = openWhenSealedViewSchema.parse(sealedData);
    expect(parsed.status).toBe("sealed");
    expect("body" in parsed).toBe(false);

    // openWhenViewSchema union also parses it
    const unionParsed = openWhenViewSchema.parse(sealedData);
    expect(unionParsed.status).toBe("sealed");
    expect("body" in unionParsed).toBe(false);
  });

  it("enforces P-68: surprise scheduled view excludes content", () => {
    const scheduledData = {
      id: "0192e2b3-5798-7521-8254-e6be95232a97",
      state: "scheduled",
      authorId: "0192e2b3-5798-7521-8254-e6be95232a98",
      recipientId: "0192e2b3-5798-7521-8254-e6be95232a99",
      safeTitle: "A special melody",
      reveal: { kind: "now" },
      createdAt: "2026-11-06T12:00:00Z",
    };

    const parsed = surpriseScheduledViewSchema.parse(scheduledData);
    expect(parsed.state).toBe("scheduled");
    expect("content" in parsed).toBe(false);

    const unionParsed = surpriseViewSchema.parse(scheduledData);
    expect(unionParsed.state).toBe("scheduled");
    expect("content" in unionParsed).toBe(false);
  });

  it("validates draft inputs, events, memories and together plans", () => {
    const draft = createLetterDraftSchema.parse({
      prompt: "Open when you are feeling down",
      body: "You are stronger than you think.",
      paper: { paper: "rose", font: "serif" },
    });
    expect(draft.prompt).toBe("Open when you are feeling down");

    const surprise = createSurpriseSchema.parse({
      safeTitle: "A surprise",
      reveal: { kind: "now" },
      content: { kind: "idea", textContent: "Walk" },
    });
    expect(surprise.safeTitle).toBe("A surprise");

    const event = saveEventSchema.parse({
      title: "Anniversary",
      kind: "anniversary",
      firstDate: "2024-10-15",
      repeats: "yearly",
    });
    expect(event.repeats).toBe("yearly");

    const memory = saveMemorySchema.parse({
      title: "Walk by the river",
      date: "2026-10-10",
      kind: "photo",
      place: "Thames Path",
    });
    expect(memory.place).toBe("Thames Path");

    const plan = savePlanSchema.parse({
      title: "Weekend in Hawassa",
      theme: "travel",
      place: "Hawassa, Ethiopia",
      when: { kind: "soon" },
    });
    expect(plan.theme).toBe("travel");

    const song = saveSongSchema.parse({
      title: "Something About Us",
      artist: "Daft Punk",
      link: "https://open.spotify.com/track/test",
    });
    expect(song.artist).toBe("Daft Punk");
  });
});
