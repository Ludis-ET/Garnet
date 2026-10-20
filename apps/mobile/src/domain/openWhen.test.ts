import { Temporal } from "temporal-polyfill";
import type { OpenWhenLetter } from "./models";
import { isEligible, openLetter, viewLetter } from "./openWhen";

const AUTHOR = "user-a";
const RECIPIENT = "user-b";
const STRANGER = "user-x";
const SECRET = "the secret body text";
const NOW = Temporal.Instant.from("2026-11-01T12:00:00Z");

const letter = (overrides: Partial<OpenWhenLetter> = {}): OpenWhenLetter => ({
  id: "letter-1",
  authorId: AUTHOR,
  recipientId: RECIPIENT,
  safePrompt: "Open when you miss me",
  body: SECRET,
  mediaRefs: ["media-private-1"],
  unlock: { type: "manual" },
  state: "sealed",
  sealedAt: "2026-10-01T09:00:00Z",
  openedAt: null,
  ...overrides,
});

describe("Open When views never leak a sealed body", () => {
  it.each([AUTHOR, RECIPIENT, STRANGER])(
    "sealed letter viewed by %s contains no body or media",
    (viewer) => {
      const serialized = JSON.stringify(viewLetter(letter(), viewer, NOW));
      expect(serialized).not.toContain(SECRET);
      expect(serialized).not.toContain("media-private-1");
    },
  );

  it("a draft is visible only to its author", () => {
    expect(viewLetter(letter({ state: "draft" }), AUTHOR, NOW).kind).toBe("draft");
    expect(viewLetter(letter({ state: "draft" }), RECIPIENT, NOW)).toEqual({
      kind: "unavailable",
      id: "letter-1",
    });
  });

  it("non-members and removed letters are unavailable", () => {
    expect(viewLetter(letter(), STRANGER, NOW).kind).toBe("unavailable");
    expect(viewLetter(letter({ state: "removed" }), RECIPIENT, NOW).kind).toBe("unavailable");
  });

  it("only the recipient sees eligibility", () => {
    const forAuthor = viewLetter(letter(), AUTHOR, NOW);
    const forRecipient = viewLetter(letter(), RECIPIENT, NOW);
    expect(forAuthor).toMatchObject({ kind: "sealed", eligible: false, viewerIsRecipient: false });
    expect(forRecipient).toMatchObject({ kind: "sealed", eligible: true, viewerIsRecipient: true });
  });
});

describe("opening is explicit, recipient-only and eligibility-gated", () => {
  it("a date-locked letter is not eligible before its time and is at/after it", () => {
    const at = "2026-11-01T12:00:00Z";
    expect(
      isEligible(
        letter({ unlock: { type: "date", at } }),
        Temporal.Instant.from("2026-11-01T11:59:59Z"),
      ),
    ).toBe(false);
    expect(isEligible(letter({ unlock: { type: "date", at } }), Temporal.Instant.from(at))).toBe(
      true,
    );
  });

  it("rejects the author, early opens and already-opened letters", () => {
    expect(openLetter(letter(), AUTHOR, NOW)).toEqual({ ok: false, reason: "not-recipient" });
    const future = letter({ unlock: { type: "date", at: "2027-01-01T00:00:00Z" } });
    expect(openLetter(future, RECIPIENT, NOW)).toEqual({ ok: false, reason: "not-eligible" });
    expect(
      openLetter(letter({ state: "opened", openedAt: NOW.toString() }), RECIPIENT, NOW),
    ).toEqual({
      ok: false,
      reason: "not-sealed",
    });
  });

  it("after opening, the body and media become visible", () => {
    const result = openLetter(letter(), RECIPIENT, NOW);
    if (!result.ok) throw new Error("expected to open");
    expect(viewLetter(result.letter, RECIPIENT, NOW)).toMatchObject({
      kind: "opened",
      body: SECRET,
      openedAt: NOW.toString(),
    });
  });
});
