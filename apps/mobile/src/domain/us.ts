/**
 * Us: emotional signals (US-01 to US-10). Pure: no React, no I/O.
 *
 * Signals are communication, not measurement (§5): nothing here counts, ranks or scores, and
 * nothing claims the partner saw anything. Wording follows voice-and-copy.md (no blame). The
 * check-in times are a prototype proposal (P-56); quiet hours (window U-21) still apply on
 * delivery. Times use Temporal and IANA zones (ADR-0002).
 */
import type { SignalId } from "@garnet/domain";
import { Temporal } from "temporal-polyfill";

export const MISSING_LEVELS = ["A little", "A lot", "I need a hug"] as const;
export type MissingLevel = (typeof MISSING_LEVELS)[number];

export const NEEDS = [
  { id: "down", emoji: "🌧️", label: "I'm feeling down" },
  { id: "overwhelmed", emoji: "🌊", label: "I'm overwhelmed" },
  { id: "lonely", emoji: "🌙", label: "I feel lonely" },
  { id: "talk", emoji: "💬", label: "I need to talk" },
  { id: "comfort", emoji: "🫂", label: "I need comfort" },
  { id: "upset", emoji: "🌩️", label: "Something upset me" },
  { id: "unsure", emoji: "🌫️", label: "I don't know what's wrong" },
  { id: "you", emoji: "❤️", label: "I just need you" },
] as const;
export type NeedId = (typeof NEEDS)[number]["id"];

export const TALK_TOPICS = [
  "Work",
  "Life",
  "Us",
  "Something difficult",
  "Something on my mind",
  "I don't know",
  "Just listen",
] as const;
export type TalkTopic = (typeof TALK_TOPICS)[number];

export const CANT_TALK_OPTIONS = [
  "Check on me later",
  "Give me some space",
  "Stay close",
  "Send comfort",
] as const;

export type CheckWhen = "now" | "later" | "tonight" | "tomorrow";
export const CHECK_WHEN: readonly { id: CheckWhen; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "later", label: "Later today" },
  { id: "tonight", label: "Tonight" },
  { id: "tomorrow", label: "Tomorrow" },
];

/**
 * When a check-in lands, in the partner's own zone (P-56, proposed): now; in about three hours;
 * 21:00 tonight (or now if it's already later); 09:00 tomorrow. Shown as "around 21:00 for Noah".
 */
export function checkInAt(
  when: CheckWhen,
  now: Temporal.Instant,
  partnerZone: string,
): Temporal.ZonedDateTime {
  const here = now.toZonedDateTimeISO(partnerZone);
  switch (when) {
    case "now":
      return here;
    case "later":
      return here.add({ hours: 3 });
    case "tonight": {
      const nine = here.with({
        hour: 21,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0,
      });
      return Temporal.ZonedDateTime.compare(nine, here) > 0 ? nine : here;
    }
    case "tomorrow":
      return here
        .add({ days: 1 })
        .with({ hour: 9, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  }
}

/** Everything a signal may carry. All optional; none of it is required to send. */
export interface SignalPayload {
  note?: string;
  level?: MissingLevel;
  need?: NeedId;
  topic?: TalkTopic;
  when?: CheckWhen;
  options?: readonly string[];
  /** Simulated attachments (Phase 2): only their kind is recorded. */
  attachments?: readonly ("photo" | "voice" | "video")[];
}

export const SIGNAL_LOOK: Record<SignalId, { emoji: string; title: string; support: boolean }> = {
  "thought-of-you": { emoji: "💭", title: "Thought of You", support: false },
  "missing-you": { emoji: "🥺", title: "Missing You", support: false },
  "need-you": { emoji: "🫂", title: "I Need You", support: true },
  "need-to-talk": { emoji: "💬", title: "I Need to Talk", support: true },
  "just-listen": { emoji: "👂", title: "Just Listen", support: true },
  "check-on-me": { emoji: "🤍", title: "Please Check On Me", support: true },
  "cant-talk-yet": { emoji: "⏳", title: "I Can't Talk Yet", support: false },
  "okay-now": { emoji: "🌤️", title: "I'm Okay Now", support: false },
};

function needLabel(id: NeedId | undefined): string | null {
  return NEEDS.find((n) => n.id === id)?.label ?? null;
}

/** The line in history for a signal this person sent (US-10). "Sent", nothing more (§5). */
export function sentLine(signal: SignalId): string {
  switch (signal) {
    case "thought-of-you":
      return "You sent a thought";
    case "missing-you":
      return "You said you miss them";
    case "need-you":
      return "You sent a support signal";
    case "need-to-talk":
      return "You asked to talk";
    case "just-listen":
      return "You asked them to listen";
    case "check-on-me":
      return "You asked for a check-in";
    case "cant-talk-yet":
      return "You said you can't talk yet";
    case "okay-now":
      return "You let them know you're okay";
  }
}

/** The in-app line when the partner's signal arrives (US-02 to US-09). Names, not pronouns. */
export function receivedLine(signal: SignalId, partner: string, payload: SignalPayload): string {
  switch (signal) {
    case "thought-of-you":
      return `A little thought from ${partner} 💭`;
    case "missing-you":
      return payload.level === "I need a hug"
        ? `${partner} needs a hug`
        : `${partner} is missing you`;
    case "need-you": {
      const need = needLabel(payload.need);
      return need === null ? `${partner} sent you a support signal 🫂` : `${partner}: "${need}"`;
    }
    case "need-to-talk":
      return payload.topic === "Just listen"
        ? `${partner} would like to talk — just listen`
        : `${partner} would like to talk${payload.topic === undefined ? "" : ` · ${payload.topic}`}`;
    case "just-listen":
      return `${partner} would like you to just listen`;
    case "check-on-me":
      return `${partner} asked you to check in`;
    case "cant-talk-yet":
      return `${partner} can't talk just now`;
    case "okay-now":
      return `${partner} let you know they're okay ❤️`;
  }
}

/** Responses to a received signal (US-05 and friends). No call buttons in Phase 2 (A13). */
export type SignalResponse = "here" | "comfort" | "space" | "later" | "hug" | "thought";

export const RESPONSE_LABEL: Record<SignalResponse, string> = {
  here: "I'm here",
  comfort: "Send comfort",
  space: "Give space",
  later: "Check on them later",
  hug: "Send a hug back",
  thought: "Send one back",
};

/** The response buttons each received signal offers. */
export function responsesFor(signal: SignalId): readonly SignalResponse[] {
  switch (signal) {
    case "thought-of-you":
      return ["thought"];
    case "missing-you":
      return ["hug"];
    case "need-you":
    case "need-to-talk":
    case "just-listen":
      return ["here", "comfort"];
    case "check-on-me":
      return ["here", "later"];
    case "cant-talk-yet":
      return ["comfort", "space"];
    case "okay-now":
      return [];
  }
}

/** History grouping (US-10): "Today", "Yesterday", or the date. Never counts or totals. */
export function historyDayLabel(day: Temporal.PlainDate, today: Temporal.PlainDate): string {
  const diff = day.until(today).total({ unit: "days" });
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day.day} ${months[day.month - 1] ?? ""}`;
}
