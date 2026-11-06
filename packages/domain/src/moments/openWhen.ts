// packages/domain/src/moments/openWhen.ts
// Domain rules and formatting for Open When letters.

import { Temporal } from "temporal-polyfill";

export interface LetterUnlockRule {
  type: "manual" | "date" | "event";
  date?: string;
  eventName?: string;
}

/**
 * Checks if a letter is unlockable given the current date (YYYY-MM-DD).
 */
export function isLetterUnlockable(rule: LetterUnlockRule, todayIso: string): boolean {
  if (rule.type === "manual") {
    return true;
  }
  if (rule.type === "date" && rule.date) {
    const unlockDate = Temporal.PlainDate.from(rule.date);
    const today = Temporal.PlainDate.from(todayIso);
    return Temporal.PlainDate.compare(today, unlockDate) >= 0;
  }
  // Event triggers are marked manually unlockable when the event occurs
  return true;
}

/**
 * Cleanly formats the open-when prompt title for display.
 */
export function formatPromptTitle(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.toLowerCase().startsWith("open when ")) {
    return trimmed;
  }
  return `Open when ${trimmed}`;
}
