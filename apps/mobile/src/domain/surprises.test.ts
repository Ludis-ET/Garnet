import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import {
  contentReady,
  GENERIC_SURPRISE_TITLE,
  isSongLink,
  viewSurprise,
  type SurpriseRecord,
} from "./surprises";

const NOAH = "noah";
const SELAM = "selam";
const now = Temporal.Instant.from("2026-10-28T12:00:00Z");

function record(over: Partial<SurpriseRecord> = {}): SurpriseRecord {
  return {
    id: "s1",
    authorId: NOAH,
    recipientId: SELAM,
    content: { kind: "message", text: "The secret words", media: null, song: null },
    safeTitle: null,
    reveal: { type: "date", at: "2026-11-01T09:00:00Z" },
    state: "scheduled",
    createdAt: "2026-10-20T09:00:00Z",
    openedAt: null,
    ...over,
  };
}

describe("what each person sees of a surprise (SUR-01 to SUR-07)", () => {
  it("never gives the recipient the content before it opens", () => {
    const v = viewSurprise(record(), SELAM, now);
    expect(v).toMatchObject({ kind: "locked", ready: false, content: null });
    expect(JSON.stringify(v)).not.toContain("secret words");
  });

  it("shows the sender's own content while locked, and the safe title or the generic one", () => {
    expect(viewSurprise(record(), NOAH, now)).toMatchObject({
      kind: "locked",
      title: GENERIC_SURPRISE_TITLE,
      content: { text: "The secret words" },
    });
    expect(viewSurprise(record({ safeTitle: "For your birthday" }), SELAM, now)).toMatchObject({
      title: "For your birthday",
    });
  });

  it("is ready once its time has come, and opened shows the content to both", () => {
    const due = record({ reveal: { type: "date", at: "2026-10-27T09:00:00Z" } });
    expect(viewSurprise(due, SELAM, now)).toMatchObject({
      kind: "locked",
      ready: true,
      content: null,
    });
    const opened = record({ state: "opened", openedAt: "2026-10-27T10:00:00Z" });
    expect(viewSurprise(opened, SELAM, now)).toMatchObject({
      kind: "opened",
      content: { text: "The secret words" },
    });
  });

  it("keeps a scheduling failure the sender's alone", () => {
    expect(viewSurprise(record({ state: "failed" }), NOAH, now).kind).toBe("failed");
    expect(viewSurprise(record({ state: "failed" }), SELAM, now).kind).toBe("unavailable");
  });

  it("is unavailable to anyone else, and withdrawn shows no content", () => {
    expect(viewSurprise(record(), "stranger", now).kind).toBe("unavailable");
    const c = viewSurprise(record({ state: "cancelled" }), SELAM, now);
    expect(c.kind).toBe("cancelled");
    expect(JSON.stringify(c)).not.toContain("secret words");
  });

  it("never leaks the content to the recipient in any state before opening (property)", () => {
    const states = fc.constantFrom("scheduled", "cancelled", "failed") as fc.Arbitrary<
      SurpriseRecord["state"]
    >;
    fc.assert(
      fc.property(
        states,
        fc.integer({ min: -30, max: 30 }),
        fc.string({ minLength: 3 }),
        (state, days, secret) => {
          const r = record({
            state,
            content: { kind: "message", text: `zz${secret}zz`, media: null, song: null },
            reveal: { type: "date", at: now.add({ hours: days * 24 }).toString() },
          });
          const v = viewSurprise(r, SELAM, now);
          expect(JSON.stringify(v)).not.toContain(`zz${secret}zz`);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("drafts", () => {
  it("accepts only https song links", () => {
    expect(isSongLink("https://music.example/track/1")).toBe(true);
    expect(isSongLink("javascript:alert(1)")).toBe(false);
    expect(isSongLink("http://insecure.example")).toBe(false);
  });

  it("needs something inside before it can be locked", () => {
    expect(contentReady({ kind: "message", text: " ", media: null, song: null })).toBe(false);
    expect(
      contentReady({ kind: "photo", text: "", media: { type: "photo", art: "sea" }, song: null }),
    ).toBe(true);
    expect(
      contentReady({
        kind: "song",
        text: "",
        media: null,
        song: { title: "Ours", link: "https://x.example/a" },
      }),
    ).toBe(true);
  });
});
