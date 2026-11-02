/**
 * Memories (MEM-01 to MEM-10). Pure: no React, no I/O.
 *
 * A private archive of their life together. Saving from Days or chat is always an explicit
 * action (§23); "remove from a collection" and "delete the memory" are different things
 * (MEM-09). Who deleted a shared memory is never shown (U-16 open; tombstones carry no actor).
 */
import type { Temporal } from "temporal-polyfill";

export type MemoryKind = "photo" | "video" | "voice" | "text";

export const MEMORY_KINDS: readonly { kind: MemoryKind; label: string; emoji: string }[] = [
  { kind: "photo", label: "Photos", emoji: "📸" },
  { kind: "video", label: "Videos", emoji: "🎬" },
  { kind: "voice", label: "Voice", emoji: "🎙️" },
  { kind: "text", label: "Words", emoji: "✍️" },
];

export const MEMORY_TAGS = ["Us", "Calls", "Food", "Walks", "Home", "Firsts", "Silly"] as const;

export interface MemoryFilter {
  query: string;
  kinds: readonly MemoryKind[];
  who: "both" | "me" | "partner";
  collectionId: string | null;
}

export const NO_MEMORY_FILTER: MemoryFilter = {
  query: "",
  kinds: [],
  who: "both",
  collectionId: null,
};

export function matchesMemory(
  m: {
    title: string;
    story: string;
    kind: MemoryKind;
    mine: boolean;
    tags: readonly string[];
    collectionIds: readonly string[];
  },
  f: MemoryFilter,
): boolean {
  const q = f.query.trim().toLowerCase();
  if (q.length > 0 && ![m.title, m.story, ...m.tags].some((t) => t.toLowerCase().includes(q)))
    return false;
  if (f.kinds.length > 0 && !f.kinds.includes(m.kind)) return false;
  if (f.who === "me" && !m.mine) return false;
  if (f.who === "partner" && m.mine) return false;
  if (f.collectionId !== null && !m.collectionIds.includes(f.collectionId)) return false;
  return true;
}

const MONTHS = [
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

/** "October · Chapter 02" (MEM-01 month headers), counted from when they started. */
export function monthHeader(month: Temporal.PlainYearMonth, start: Temporal.PlainDate): string {
  const n = (month.year - start.year) * 12 + (month.month - start.month) + 1;
  const name = MONTHS[month.month - 1] ?? "";
  return n >= 1 ? `${name} · Chapter ${String(n).padStart(2, "0")}` : `${name} ${month.year}`;
}

/** "Sat 3 Oct 2026"-style short date for memory cards. */
export function memoryDateLabel(date: Temporal.PlainDate): string {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return `${days[date.dayOfWeek - 1] ?? ""} ${date.day} ${(MONTHS[date.month - 1] ?? "").slice(0, 3)} ${date.year}`;
}
