/**
 * Our World's shared lists (prompt 13): plans for when you meet again (FUT-01 to FUT-03),
 * places saved as memories (PLACE-01) and your soundtrack (SONG-01). All shared between the
 * two of you. Places are only ever entries someone chose to add: never a live position, never
 * "last seen" (P-21). Songs keep a title, artist and link, never audio (spec §33). No
 * countdowns as the main measure of a plan.
 */
import { Temporal } from "temporal-polyfill";
import type { DemoArt } from "@/data/fixtures/demoDays";

export type PlanTheme = "Adventure" | "Food" | "Home" | "Travel" | "Little things";

export const PLAN_THEMES: readonly { theme: PlanTheme; emoji: string }[] = [
  { theme: "Adventure", emoji: "🏔️" },
  { theme: "Food", emoji: "🍝" },
  { theme: "Home", emoji: "🏡" },
  { theme: "Travel", emoji: "✈️" },
  { theme: "Little things", emoji: "✨" },
];

export type PlanWhen =
  | { type: "someday" }
  | { type: "date"; date: string }
  | { type: "range"; from: string; to: string };

export interface PlanRecord {
  id: string;
  authorId: string;
  title: string;
  note: string;
  theme: PlanTheme;
  art: DemoArt | null;
  place: string;
  when: PlanWhen;
  doneAt: string | null;
  deleted?: boolean;
}

export interface PlaceRecord {
  id: string;
  authorId: string;
  name: string;
  note: string;
  art: DemoArt | null;
  /** The day it was added (ISO date): an entry, not a position. */
  date: string;
  deleted?: boolean;
}

export interface SongRecord {
  id: string;
  authorId: string;
  title: string;
  artist: string;
  link: string;
  note: string;
  addedAt: string;
  deleted?: boolean;
}

/** "Someday", "14 Dec", "Dec–Jan" (a gentle sense of when, never a countdown). */
export function whenWords(w: PlanWhen): string {
  const month = (d: string) =>
    Temporal.PlainDate.from(d).toLocaleString("en-GB", { month: "short" });
  switch (w.type) {
    case "someday":
      return "Someday";
    case "date":
      return Temporal.PlainDate.from(w.date).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
      });
    case "range": {
      const a = month(w.from);
      const b = month(w.to);
      return a === b ? a : `${a}–${b}`;
    }
  }
}

/** When it sorts in "By date": dated plans first by date, then "Someday". */
export function whenKey(w: PlanWhen): string {
  return w.type === "someday" ? "9999-12-31" : w.type === "date" ? w.date : w.from;
}

/** A plan needs a title; a range must run forwards. */
export function planProblem(p: { title: string; when: PlanWhen }): string | null {
  if (p.title.trim().length === 0) return "Give it a name.";
  if (p.when.type === "range" && Temporal.PlainDate.compare(p.when.from, p.when.to) > 0)
    return "The range should end after it starts.";
  return null;
}
