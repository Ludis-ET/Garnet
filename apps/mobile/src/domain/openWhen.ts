import { Temporal } from "temporal-polyfill";
import type { LetterStyle, OpenWhenLetter, UnlockRule, UserId } from "./models";

/** Letters written before paper choices existed read on cream, in serif. */
export const DEFAULT_LETTER_STYLE: LetterStyle = { tone: "cream", font: "serif" };

/**
 * Open When visibility (spec A9, §7 security-minded UI; known Phase 1 gap: the backend must
 * enforce this too — UI concealment is NOT authorization).
 *
 * Views are separate types so a sealed view cannot carry a body: the compiler enforces it.
 * Only `opened` and author's `draft` contain `body` and `mediaRefs`.
 *
 * Not specified, so kept conservative: whether an author may re-read their own sealed letter.
 * Here nobody sees the body before it is opened (open question U-34).
 */
export type OpenWhenView =
  | {
      kind: "draft";
      id: string;
      safePrompt: string;
      authorId: UserId;
      recipientId: UserId;
      viewerIsRecipient: false;
      body: string;
      paper: LetterStyle;
      mediaRefs: readonly string[];
      unlock: UnlockRule;
      updatedAt?: string;
    }
  | {
      kind: "sealed";
      id: string;
      safePrompt: string;
      authorId: UserId;
      recipientId: UserId;
      sealedAt: string | null;
      unlock: UnlockRule;
      viewerIsRecipient: boolean;
      /** True when the unlock condition is met and the recipient may choose to open it. */
      eligible: boolean;
    }
  | {
      kind: "opened";
      id: string;
      paper: LetterStyle;
      safePrompt: string;
      authorId: UserId;
      recipientId: UserId;
      viewerIsRecipient: boolean;
      sealedAt: string | null;
      openedAt: string;
      unlock: UnlockRule;
      body: string;
      mediaRefs: readonly string[];
    }
  | { kind: "unavailable"; id: string };

/** Curated prompts from OPEN-02 */
export const SUGGESTED_PROMPTS = [
  "you miss me",
  "you have a terrible day",
  "you can't sleep",
  "you're homesick",
  "you're angry with me",
  "you need to laugh",
  "you need motivation",
  "on your first day at work",
  "you need to hear my voice",
  "you want to remember us",
] as const;

export function formatPromptTitle(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Open when…";
  if (/^open\s/i.test(trimmed)) return trimmed;
  if (/^on\s/i.test(trimmed)) return `Open ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
  return `Open when ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

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
            authorId: letter.authorId,
            recipientId: letter.recipientId,
            viewerIsRecipient: false,
            body: letter.body,
            paper: letter.paper ?? DEFAULT_LETTER_STYLE,
            mediaRefs: letter.mediaRefs,
            unlock: letter.unlock,
            ...(letter.sealedAt ? { updatedAt: letter.sealedAt } : {}),
          }
        : { kind: "unavailable", id: letter.id };
    case "sealed":
      return {
        kind: "sealed",
        id: letter.id,
        safePrompt: letter.safePrompt,
        authorId: letter.authorId,
        recipientId: letter.recipientId,
        sealedAt: letter.sealedAt,
        unlock: letter.unlock,
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
        recipientId: letter.recipientId,
        viewerIsRecipient: isRecipient,
        sealedAt: letter.sealedAt,
        openedAt: letter.openedAt,
        unlock: letter.unlock,
        body: letter.body,
        paper: letter.paper ?? DEFAULT_LETTER_STYLE,
        mediaRefs: letter.mediaRefs,
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
