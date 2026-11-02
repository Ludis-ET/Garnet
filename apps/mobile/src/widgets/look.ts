import type { Mood, Occasion } from "@/features/figures/types";
import type { DayPart } from "./snapshot";

/** The character's look by time of day and moment (widgets plan §3, P-72). Never sad. */
export function widgetLook(
  part: DayPart,
  special: boolean,
  somethingNew: boolean,
  waiting: boolean,
): { mood: Mood; occasion: Occasion } {
  if (special) return { mood: "celebrating", occasion: "birthday" };
  if (waiting) return { mood: "surprised", occasion: "surprise" };
  if (somethingNew) return { mood: "loving", occasion: "everyday" };
  switch (part) {
    case "morning":
      return { mood: "hello", occasion: "morning" };
    case "day":
      return { mood: "happy", occasion: "everyday" };
    case "evening":
      return { mood: "calm", occasion: "cozy" };
    case "night":
      return { mood: "sleepy", occasion: "goodnight" };
  }
}

export const GREETING: Record<DayPart, string> = {
  morning: "Good morning ☀️",
  day: "Hello, you 💜",
  evening: "Good evening 💜",
  night: "Sleep well 🌙",
};
