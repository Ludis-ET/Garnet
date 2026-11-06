// packages/domain/src/moments/memories.ts
// Memory filtering and presentation helpers (§23, U-16).

import { Temporal } from "temporal-polyfill";

export interface MemoryItem {
  id: string;
  title: string;
  story: string;
  date: string;
  place: string;
  tags: string[];
}

export interface MemoryFilterOptions {
  search?: string;
  tag?: string;
  month?: string; // YYYY-MM
}

/**
 * Evaluates whether a memory matches search and tag filters.
 */
export function matchesMemory(memory: MemoryItem, filter: MemoryFilterOptions): boolean {
  if (filter.tag && !memory.tags.includes(filter.tag)) {
    return false;
  }
  if (filter.month && !memory.date.startsWith(filter.month)) {
    return false;
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    const matchesTitle = memory.title.toLowerCase().includes(q);
    const matchesStory = memory.story.toLowerCase().includes(q);
    const matchesPlace = memory.place.toLowerCase().includes(q);
    const matchesTag = memory.tags.some((t) => t.toLowerCase().includes(q));
    if (!matchesTitle && !matchesStory && !matchesPlace && !matchesTag) {
      return false;
    }
  }
  return true;
}

/**
 * Returns month header (e.g. "October 2026") from ISO date string.
 */
export function formatMonthHeader(isoDate: string): string {
  const plainDate = Temporal.PlainDate.from(isoDate);
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
  const monthName = months[plainDate.month - 1] ?? "";
  return `${monthName} ${plainDate.year}`;
}
