/**
 * Surprises (prompt 12, SUR-01 to SUR-07; spec §29, §62). A surprise stays hidden until its
 * recipient opens it: lists, notifications, search and widgets only ever see a safe title the
 * sender chose, or the generic "Something for you" (A9). Cancelling, and editing before it
 * opens, are provisional sender options ("rules not final", spec A2, P-68); nothing is ever
 * edited after it opens.
 */
import { Temporal } from "temporal-polyfill";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import type { LetterStyle } from "./models";

export type SurpriseKind = "message" | "photo" | "video" | "voice" | "letter" | "song" | "idea";

export const SURPRISE_KINDS: readonly { kind: SurpriseKind; label: string; emoji: string }[] = [
  { kind: "message", label: "Message", emoji: "💬" },
  { kind: "photo", label: "Photo", emoji: "📷" },
  { kind: "video", label: "Video", emoji: "🎬" },
  { kind: "voice", label: "Voice note", emoji: "🎙️" },
  { kind: "letter", label: "Letter", emoji: "💌" },
  { kind: "song", label: "Song link", emoji: "🎵" },
  { kind: "idea", label: "Future-date idea", emoji: "🗓️" },
];

export type SurpriseReveal =
  { type: "now" } | { type: "date"; at: string } | { type: "event"; title: string; at: string };

/** What's inside. Only the sender, and the recipient once opened, ever see it. */
export interface SurpriseContent {
  kind: SurpriseKind;
  text: string;
  media: DemoMedia | null;
  /** Song links store a title and a link, never audio (spec §33). */
  song: { title: string; link: string } | null;
  /** A letter's paper and hand, shown the same when it's read (P-71). */
  paper?: LetterStyle;
}

export interface SurpriseRecord {
  id: string;
  authorId: string;
  recipientId: string;
  content: SurpriseContent;
  /** Shown before opening if the sender chose one; otherwise the generic line. */
  safeTitle: string | null;
  reveal: SurpriseReveal;
  /** "failed": a simulated scheduling error the sender can retry (SUR-07). */
  state: "scheduled" | "opened" | "cancelled" | "failed";
  createdAt: string;
  openedAt: string | null;
}

export const GENERIC_SURPRISE_TITLE = "Something for you";

/** A title with its spaces trimmed, or null when there's nothing left. */
export function cleanTitle(title: string | null | undefined): string | null {
  const t = title?.trim() ?? "";
  return t.length > 0 ? t : null;
}

export type SurpriseView =
  | {
      kind: "locked";
      id: string;
      title: string;
      fromMe: boolean;
      /** Ready to open now (recipient) or already openable by them (sender). */
      ready: boolean;
      reveal: SurpriseReveal;
      /** The sender's own view of what's inside; never present for the recipient. */
      content: SurpriseContent | null;
      safeTitle: string | null;
    }
  | {
      kind: "opened";
      id: string;
      title: string;
      fromMe: boolean;
      openedAt: string;
      content: SurpriseContent;
    }
  | { kind: "cancelled"; id: string; title: string; fromMe: boolean }
  | { kind: "failed"; id: string; title: string; content: SurpriseContent; reveal: SurpriseReveal }
  | { kind: "unavailable"; id: string };

export function revealInstant(r: SurpriseReveal, createdAt: string): Temporal.Instant {
  return Temporal.Instant.from(r.type === "now" ? createdAt : r.at);
}

/**
 * What one person may see of a surprise. The recipient never gets the content (or anything
 * derived from it) before opening; a scheduling failure is the sender's alone.
 */
export function viewSurprise(
  s: SurpriseRecord,
  viewerId: string,
  now: Temporal.Instant,
): SurpriseView {
  const fromMe = s.authorId === viewerId;
  const forMe = s.recipientId === viewerId;
  if (!fromMe && !forMe) return { kind: "unavailable", id: s.id };
  const title = cleanTitle(s.safeTitle) ?? GENERIC_SURPRISE_TITLE;
  switch (s.state) {
    case "failed":
      return fromMe
        ? { kind: "failed", id: s.id, title, content: s.content, reveal: s.reveal }
        : { kind: "unavailable", id: s.id };
    case "cancelled":
      return { kind: "cancelled", id: s.id, title, fromMe };
    case "opened":
      if (s.openedAt === null) return { kind: "unavailable", id: s.id };
      return { kind: "opened", id: s.id, title, fromMe, openedAt: s.openedAt, content: s.content };
    case "scheduled":
      return {
        kind: "locked",
        id: s.id,
        title,
        fromMe,
        ready: Temporal.Instant.compare(now, revealInstant(s.reveal, s.createdAt)) >= 0,
        reveal: s.reveal,
        content: fromMe ? s.content : null,
        safeTitle: s.safeTitle,
      };
  }
}

/** A song link must be a web link (no scripts, no app schemes). */
export function isSongLink(link: string): boolean {
  return /^https:\/\/[^\s]+\.[^\s]+$/i.test(link.trim());
}

/** Whether the sender's draft is complete enough to lock. */
export function contentReady(c: SurpriseContent): boolean {
  switch (c.kind) {
    case "message":
    case "letter":
    case "idea":
      return c.text.trim().length > 0;
    case "photo":
    case "video":
    case "voice":
      return c.media !== null;
    case "song":
      return c.song !== null && c.song.title.trim().length > 0 && isSongLink(c.song.link);
  }
}

/** "Right away", "Opens today", "Opens on 14 Nov", "Opens on Noah's birthday · 14 Nov". */
export function revealWords(
  r: SurpriseReveal,
  createdAt: string,
  zone: string,
  now: Temporal.Instant,
): string {
  if (r.type === "now") return "Right away";
  const day = revealInstant(r, createdAt).toZonedDateTimeISO(zone).toPlainDate();
  const today = now.toZonedDateTimeISO(zone).toPlainDate();
  const date = day.equals(today)
    ? "today"
    : day.equals(today.add({ days: 1 }))
      ? "tomorrow"
      : day.toLocaleString("en-GB", { day: "numeric", month: "short" });
  const when = date === "today" || date === "tomorrow" ? date : `on ${date}`;
  return r.type === "event" ? `Opens on ${r.title} · ${date}` : `Opens ${when}`;
}
