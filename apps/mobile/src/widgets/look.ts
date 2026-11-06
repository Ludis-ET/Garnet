import type { Mood, Occasion } from "@/features/figures/types";
import { dayPart, type DayPart, type WidgetSnapshot } from "./snapshot";
import type { Temporal } from "temporal-polyfill";

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

/**
 * Context-aware smart character look (P-90):
 * Adapts to time of day, recent signals, partner's shared feelings, and cross-zone diurnal state.
 * Strictly adheres to §5: characters are never sad, angry or abandoned.
 */
export function smartWidgetLook(
  snap: WidgetSnapshot,
  part: DayPart,
): { mood: Mood; occasion: Occasion } {
  if (snap.special) return { mood: "celebrating", occasion: "birthday" };

  if (snap.recentSignal !== null) {
    if (snap.recentSignal === "thought") return { mood: "loving", occasion: "together" };
    if (snap.recentSignal === "hug" || snap.recentSignal === "missing") {
      return { mood: "hug", occasion: "together" };
    }
    return { mood: "listening", occasion: "everyday" };
  }

  if (snap.partnerMood !== null) {
    if (snap.partnerMood === "loving") return { mood: "loving", occasion: "everyday" };
    if (snap.partnerMood === "hug") return { mood: "hug", occasion: "cozy" };
    if (snap.partnerMood === "sleepy") return { mood: "sleepy", occasion: "goodnight" };
    if (snap.partnerMood === "dancing") return { mood: "dancing", occasion: "everyday" };
    if (snap.partnerMood === "happy") return { mood: "happy", occasion: "everyday" };
    if (snap.partnerMood === "calm") return { mood: "calm", occasion: "cozy" };
    if (snap.partnerMood === "thinking") return { mood: "thinking", occasion: "everyday" };
    return { mood: "celebrating", occasion: "birthday" };
  }

  if (snap.waiting) return { mood: "surprised", occasion: "surprise" };
  if (snap.somethingNew) return { mood: "loving", occasion: "everyday" };

  if (snap.partnerAwake === false && part !== "night") {
    return { mood: "calm", occasion: "cozy" };
  }

  return widgetLook(part, false, false, false);
}

export const GREETING: Record<DayPart, string> = {
  morning: "Good morning ☀️",
  day: "Hello, you 💜",
  evening: "Good evening 💜",
  night: "Sleep well 🌙",
};

function cityName(zone: string | null): string {
  if (zone === null) return "Partner";
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

/**
 * Context-aware smart greeting (P-90):
 * Pure communication, no streaks, no comparisons, no accusatory copy (§5 & §8 voice rules).
 */
export function smartGreeting(snap: WidgetSnapshot, now: Temporal.Instant): string {
  if (snap.special) return "Special day together ✨";
  if (snap.recentSignal === "thought") return "Thinking of you 💜";
  if (snap.recentSignal === "hug" || snap.recentSignal === "missing") return "Warm hugs sent 💜";
  if (snap.partnerMood === "loving") return "Feeling loved & close 💜";
  if (snap.partnerMood === "dancing") return "Joyful energy ✨";
  if (snap.partnerMood === "sleepy") return "Resting peacefully 🌙";
  if (snap.partnerMood === "calm") return "Peaceful moments 🌿";
  if (snap.sparkActive) return "Shared Spark is glowing ✨";
  if (snap.waiting) return "Something waiting for you 💌";

  const part = dayPart(now, snap.myZone);
  if (snap.partnerZone !== null && snap.partnerAwake === false && part !== "night") {
    return `${cityName(snap.partnerZone)} is resting 🌙`;
  }
  if (snap.partnerZone !== null && snap.partnerPart === "morning" && part === "morning") {
    return "Morning in both worlds ☀️";
  }

  return GREETING[part];
}
