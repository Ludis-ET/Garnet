/**
 * Us presentation text (US-02 to US-10): the details a signal carries, and what a reply says to
 * the person who sent it. Names, not pronouns; "sent", never "seen" (§5, voice-and-copy.md).
 */
import type { SignalId } from "@garnet/domain";
import {
  CHECK_WHEN,
  NEEDS,
  RESPONSE_LABEL,
  type SignalPayload,
  type SignalResponse,
} from "@/domain/us";

/**
 * Short lines for a signal's detail view (need, level, topic, when, options, attachments).
 * Lines the headline already says (`title`) are left out, so nothing is said twice.
 */
export function payloadLines(payload: SignalPayload, title = ""): string[] {
  const lines: string[] = [];
  const need = NEEDS.find((n) => n.id === payload.need);
  if (need !== undefined) lines.push(`${need.emoji} ${need.label}`);
  if (payload.level !== undefined) lines.push(payload.level);
  if (payload.topic !== undefined) lines.push(payload.topic);
  const when = CHECK_WHEN.find((w) => w.id === payload.when);
  if (when !== undefined) lines.push(when.label);
  for (const o of payload.options ?? []) lines.push(o);
  for (const a of payload.attachments ?? [])
    lines.push(a === "photo" ? "📸 Photo" : a === "voice" ? "🎙️ Voice note" : "🎬 Video");
  const said = title.toLowerCase();
  return lines.filter((l) => {
    const words = need !== undefined && l.startsWith(need.emoji) ? need.label : l;
    return !said.includes(words.toLowerCase());
  });
}

/** The toast after replying (US-05 "You let Selam know you're here."). */
export function respondedLine(response: SignalResponse, partner: string): string {
  switch (response) {
    case "here":
      return `You let ${partner} know you're here.`;
    case "comfort":
      return "Comfort sent 🤍";
    case "space":
      return `Giving ${partner} some space 🤍`;
    case "later":
      return `Check on ${partner} when you can.`;
    case "hug":
      return "Hug sent 🫂";
    case "thought":
      return "Thought sent 💭";
  }
}

/** A reply as history shows it ("Noah: I'm here"). */
export function replyLine(response: SignalResponse, from: string): string {
  return `${from}: ${RESPONSE_LABEL[response]}`;
}

/** The send button on each compose sheet. */
export function sendLabel(signal: SignalId, partner: string): string {
  switch (signal) {
    case "thought-of-you":
      return "💭 Send a thought";
    case "okay-now":
      return `Let ${partner} know`;
    case "missing-you":
    case "need-you":
    case "need-to-talk":
    case "just-listen":
    case "check-on-me":
    case "cant-talk-yet":
      return `Send to ${partner}`;
  }
}
