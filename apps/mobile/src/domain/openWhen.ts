import { Temporal } from "temporal-polyfill";
import type { OpenWhenLetter, UserId } from "./models";

/**
 * Open When visibility (spec A9, §7 security-minded UI; known Phase 1 gap: the backend must
 * enforce this too — UI concealment is NOT authorization).
 *
 * Views are separate types so a sealed view cannot carry a body: the compiler enforces it.
 * Only `opened` contains `body` and `mediaRefs`.
 *
 * Not specified, so kept conservative: whether an author may re-read their own sealed letter.
 * Here nobody sees the body before it is opened (open question U-34).
 */
export type OpenWhenView =
  | { kind: "draft"; id: string; safePrompt: string; body: string; mediaRefs: readonly string[] }
  | {
      kind: "sealed";
      id: string;
      safePrompt: string;
      authorId: UserId;
      viewerIsRecipient: boolean;
      /** True when the unlock condition is met and the recipient may choose to open it. */
      eligible: boolean;
    }
  | {
      kind: "opened";
      id: string;
      safePrompt: string;
      authorId: UserId;
      body: string;
      mediaRefs: readonly string[];
      openedAt: string;
    }
  | { kind: "unavailable"; id: string };

export function isEligible(letter: OpenWhenLetter, now: Temporal.Instant): boolean {
  if (letter.state !== "sealed") return false;
  switch (letter.unlock.type) {
    case "manual":
      return true;
    case "date":
      return Temporal.Instant.compare(now, Temporal.Instant.from(letter.unlock.at)) >= 0;
    case "event":
      // Event-triggered unlocks need the event model; until then they are not eligible.
      return false;
  }
}

/** The only function that turns a stored letter into something a screen may render. */
export function viewLetter(
  letter: OpenWhenLetter,
  viewerId: UserId,
  now: Temporal.Instant,
): OpenWhenView {
  const isAuthor = letter.authorId === viewerId;
  const isRecipient = letter.recipientId === viewerId;
  if ((!isAuthor && !isRecipient) || letter.state === "removed")
    return { kind: "unavailable", id: letter.id };

  switch (letter.state) {
    case "draft":
      return isAuthor
        ? {
            kind: "draft",
            id: letter.id,
            safePrompt: letter.safePrompt,
            body: letter.body,
            mediaRefs: letter.mediaRefs,
          }
        : { kind: "unavailable", id: letter.id };
    case "sealed":
      return {
        kind: "sealed",
        id: letter.id,
        safePrompt: letter.safePrompt,
        authorId: letter.authorId,
        viewerIsRecipient: isRecipient,
        eligible: isRecipient && isEligible(letter, now),
      };
    case "opened":
      if (letter.openedAt === null) return { kind: "unavailable", id: letter.id };
      return {
        kind: "opened",
        id: letter.id,
        safePrompt: letter.safePrompt,
        authorId: letter.authorId,
        body: letter.body,
        mediaRefs: letter.mediaRefs,
        openedAt: letter.openedAt,
      };
  }
}

export type OpenResult =
  | { ok: true; letter: OpenWhenLetter }
  | { ok: false; reason: "not-recipient" | "not-sealed" | "not-eligible" };

/** Opening is explicit, recipient-only and requires eligibility. */
export function openLetter(
  letter: OpenWhenLetter,
  viewerId: UserId,
  now: Temporal.Instant,
): OpenResult {
  if (letter.recipientId !== viewerId) return { ok: false, reason: "not-recipient" };
  if (letter.state !== "sealed") return { ok: false, reason: "not-sealed" };
  if (!isEligible(letter, now)) return { ok: false, reason: "not-eligible" };
  return { ok: true, letter: { ...letter, state: "opened", openedAt: now.toString() } };
}
