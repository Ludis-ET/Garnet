/**
 * How the eight signals (§5, @garnet/domain) appear on Home. Labels come from the shared
 * catalogue; emoji and the one-word captions are UI copy (voice-and-copy.md: no guilt words).
 */
import { findSignal, type SignalId } from "@garnet/domain";

export interface SignalLook {
  id: SignalId;
  emoji: string;
  /** One word under the round button (HOME-01). */
  word: string;
}

/** The three prominent ones (spec §10 "Main actions"). */
export const QUICK_SIGNALS: readonly SignalLook[] = [
  { id: "thought-of-you", emoji: "💭", word: "Thinking" },
  { id: "missing-you", emoji: "🥺", word: "Missing" },
  { id: "need-you", emoji: "🫂", word: "Need you" },
];

/** The rest, in the "More" sheet (HOME-04). */
export const MORE_SIGNALS: readonly SignalLook[] = [
  { id: "need-to-talk", emoji: "💬", word: "Talk" },
  { id: "just-listen", emoji: "👂", word: "Listen" },
  { id: "check-on-me", emoji: "🤍", word: "Check on me" },
  { id: "cant-talk-yet", emoji: "⏳", word: "Later" },
  { id: "okay-now", emoji: "🌤️", word: "Okay now" },
];

export function signalLabel(id: SignalId): string {
  return findSignal(id)?.label ?? id;
}

/** The in-app line when the partner's signal arrives (HOME-02). Lock screens stay generic (P-17). */
export function incomingLine(id: SignalId, partner: string): string {
  switch (id) {
    case "thought-of-you":
      return `${partner} thought of you`;
    case "missing-you":
      return `${partner} misses you`;
    case "need-you":
      return `${partner} needs you`;
    case "need-to-talk":
      return `${partner} would like to talk`;
    case "just-listen":
      return `${partner} would like you to listen`;
    case "check-on-me":
      return `${partner} asked you to check in`;
    case "cant-talk-yet":
      return `${partner} can't talk yet`;
    case "okay-now":
      return `${partner} is okay now`;
  }
}
