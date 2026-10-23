/**
 * Days and logging rules (DAYS-01 to DAYS-11). Pure: no React, no I/O.
 *
 * - A day is a stream of small moments (§11). Visibility (§4, day-log rules): a new moment is a
 *   private draft; sharing is explicit; "after our days meet" stays the author's until reveal.
 *   A shared moment can't become private again (P-20).
 * - The shared day and its cutoff come from @garnet/domain (D-12, D-13). The cutoff is
 *   UNRESOLVED (U-02) and recap timing too (U-06), so both are a required `DayPolicy` with no
 *   default; the prototype passes PROVISIONAL_DAY_POLICY, labelled as such on screen.
 * - Times use Temporal and IANA zones (ADR-0002).
 */
import {
  createSharedDayConfig,
  PROPOSED_REFERENCE_TIME_ZONE,
  type SharedDayConfig,
} from "@garnet/domain";
import { Temporal } from "temporal-polyfill";

export type EntryKind =
  "text" | "photo" | "video" | "voice" | "feeling" | "activity" | "food" | "work" | "place";

export const ENTRY_KINDS: readonly { kind: EntryKind; label: string; emoji: string }[] = [
  { kind: "text", label: "Text", emoji: "✏️" },
  { kind: "photo", label: "Photo", emoji: "📸" },
  { kind: "video", label: "Video", emoji: "🎬" },
  { kind: "voice", label: "Voice", emoji: "🎙️" },
  { kind: "feeling", label: "Feeling", emoji: "💗" },
  { kind: "activity", label: "Activity", emoji: "🏃" },
  { kind: "food", label: "Food", emoji: "🍝" },
  { kind: "work", label: "Work", emoji: "💼" },
  { kind: "place", label: "Place", emoji: "📍" },
];

export function kindMeta(kind: EntryKind): { label: string; emoji: string } {
  return ENTRY_KINDS.find((k) => k.kind === kind) ?? { label: "Text", emoji: "✏️" };
}

export const FEELINGS = [
  { id: "calm", label: "Calm", emoji: "😌" },
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "excited", label: "Excited", emoji: "🤩" },
  { id: "loved", label: "Loved", emoji: "🥰" },
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "busy", label: "Busy", emoji: "🌀" },
  { id: "stressed", label: "Stressed", emoji: "😮‍💨" },
  { id: "low", label: "Low", emoji: "🌧️" },
] as const;
export type FeelingId = (typeof FEELINGS)[number]["id"];

export const ACTIVITIES = [
  { id: "coffee", label: "Coffee", emoji: "☕" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "commute", label: "Commute", emoji: "🚇" },
  { id: "food", label: "Food", emoji: "🍝" },
  { id: "gym", label: "Gym", emoji: "🏋️" },
  { id: "study", label: "Study", emoji: "📚" },
  { id: "outside", label: "Outside", emoji: "🌳" },
  { id: "home", label: "Home", emoji: "🏠" },
] as const;
export type ActivityId = (typeof ACTIVITIES)[number]["id"];

/** Day-log visibility (§4): a private draft, shared now, or the author's until the reveal. */
export type Visibility = "private" | "shared" | "afterReveal";

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Only you",
  shared: "Shared",
  afterReveal: "After our days meet",
};

/**
 * Whether the partner may see an entry. Private drafts never; "after our days meet" only once
 * the day is revealed; shared ones always (day-log rules 2–4).
 */
export function partnerCanSee(visibility: Visibility, revealed: boolean): boolean {
  switch (visibility) {
    case "private":
      return false;
    case "afterReveal":
      return revealed;
    case "shared":
      return true;
  }
}

/** P-20: once shared, a moment can't go back to private (it may already have been seen). */
export function canChangeVisibility(from: Visibility, to: Visibility): boolean {
  if (from === to) return true;
  if (from === "shared") return false;
  return true;
}

export type RecapRule = "both-ready" | "both-ready-or-cutoff";

/** U-02 (cutoff) and U-06 (recap timing) are open: a required policy, no default. */
export interface DayPolicy {
  sharedDay: SharedDayConfig;
  recap: RecapRule;
}

/**
 * The prototype's PROVISIONAL policy (labelled on screen, DAYS-10): days run 04:00–04:00 London
 * (D-13 proposed zone; the 04:00 is only the example in the DAYS-10 prompt) and the recap opens
 * when both are ready. Not a decision: U-02 and U-06 stay open.
 */
export const PROVISIONAL_DAY_POLICY: DayPolicy = {
  sharedDay: createSharedDayConfig({
    referenceTimeZone: PROPOSED_REFERENCE_TIME_ZONE,
    cutoff: { hour: 4, minute: 0 },
  }),
  recap: "both-ready",
};

export type RevealState = "open" | "waiting" | "ready";

/**
 * "open": you haven't finished your day; "waiting": you have, the days haven't met yet;
 * "ready": the recap can be seen (both finished, or — under the cutoff rule — the day has ended).
 * Waiting copy never says who hasn't finished (§2: no blame).
 */
export function revealState(input: {
  meReady: boolean;
  partnerReady: boolean;
  dayEnded: boolean;
  policy: DayPolicy;
}): RevealState {
  const met =
    (input.meReady && input.partnerReady) ||
    (input.policy.recap === "both-ready-or-cutoff" && input.dayEnded);
  if (met) return "ready";
  return input.meReady ? "waiting" : "open";
}

/** A month as weeks (Monday first), with null for days outside the month. */
export function monthGrid(year: number, month: number): (Temporal.PlainDate | null)[][] {
  const first = Temporal.PlainDate.from({ year, month, day: 1 });
  const lead = first.dayOfWeek - 1;
  const cells: (Temporal.PlainDate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 0; d < first.daysInMonth; d++) cells.push(first.add({ days: d }));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Temporal.PlainDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "Tue 3 Nov" (fixed English labels; locale formatting comes with i18n). */
export function dayLabel(date: Temporal.PlainDate): string {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
  return `${days[date.dayOfWeek - 1] ?? ""} ${date.day} ${months[date.month - 1] ?? ""}`;
}

export function monthLabel(year: number, month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[month - 1] ?? ""} ${year}`;
}

/** "This week", "Last week", or "Week of 12 Oct" (weeks start on Monday). */
export function weekLabel(date: Temporal.PlainDate, today: Temporal.PlainDate): string {
  const monday = (d: Temporal.PlainDate) => d.subtract({ days: d.dayOfWeek - 1 });
  const weeks = Math.round(monday(date).until(monday(today)).total({ unit: "days" }) / 7);
  if (weeks === 0) return "This week";
  if (weeks === 1) return "Last week";
  const m = monday(date);
  return `Week of ${dayLabel(m).split(" ").slice(1).join(" ")}`;
}

export interface SearchableEntry {
  text: string;
  kind: EntryKind;
  mine: boolean;
}

export interface EntryFilter {
  query: string;
  kinds: readonly EntryKind[];
  who: "both" | "me" | "partner";
}

/** DAYS-11: case-insensitive text match, optional kinds, and whose moments. */
export function matchesFilter(entry: SearchableEntry, filter: EntryFilter): boolean {
  const q = filter.query.trim().toLowerCase();
  if (q.length > 0 && !entry.text.toLowerCase().includes(q)) return false;
  if (filter.kinds.length > 0 && !filter.kinds.includes(entry.kind)) return false;
  if (filter.who === "me" && !entry.mine) return false;
  if (filter.who === "partner" && entry.mine) return false;
  return true;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
