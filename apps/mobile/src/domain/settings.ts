/**
 * Each person's own settings (prompt 15, SET-01 to SET-17). Every setting here is one person's
 * alone: nothing changes what the partner gets (§5 "each person controls only their own").
 * Open questions stay open: the quiet-hours window (U-21) has no default, only a labelled
 * suggestion; reminders start "not chosen" and send nothing (P-65).
 */
import type { NotifyGroup, NotifyMode, PreviewMode } from "./notifications";

export type ReminderLevel = "off" | "gentle" | "custom";

/** Home's cards below Garnet (P-66), each one the person can hide. */
export type HomeCardId = "now" | "messages" | "upcoming" | "letters" | "memory" | "today";

export const HOME_CARDS: readonly { id: HomeCardId; label: string; detail: string }[] = [
  { id: "now", label: "Right now", detail: "Both clocks and when you're both awake" },
  { id: "messages", label: "Messages", detail: "Unread messages and the latest one" },
  { id: "upcoming", label: "Coming up", detail: "Your next event" },
  { id: "letters", label: "Waiting for you", detail: "Letters you can open" },
  { id: "memory", label: "A memory", detail: "One of your memories, each day" },
  { id: "today", label: "Today", detail: "Your own moments today" },
];

export interface QuietHours {
  on: boolean;
  /** "HH:MM" in the person's own zone; null until they choose (U-21 open). */
  start: string | null;
  end: string | null;
}

/** Shown as "Suggested", never applied on its own (U-21). */
export const SUGGESTED_QUIET_HOURS = { start: "22:00", end: "07:00" } as const;

export interface UserSettings {
  notify: Record<NotifyGroup, NotifyMode>;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  quiet: QuietHours;
  /** Lock-screen previews: generic by default (P-17, §5). */
  previews: PreviewMode;
  /** null: not chosen yet, which sends no reminders (P-65). */
  reminders: ReminderLevel | null;
  /** SET-04: what Home calls the partner, and how it greets. */
  partnerNickname: string;
  greeting: "time" | "custom";
  customGreeting: string;
  /** SET-13 export of this person's own data. */
  export: { state: "none" | "preparing" | "ready" | "expired"; readyAt: string | null };
  /** Home layout (P-66): the shortcut ring, the characters below, and each card. */
  home: { ring: boolean; watchers: boolean; cards: Record<HomeCardId, boolean> };
  /** "system" follows the phone; "reduce" calms motion in Garnet whatever the phone says. */
  motion: "system" | "reduce";
  haptics: boolean;
  /**
   * How far apart (owner direction P-66): the phone's location, read while Garnet is open and
   * rounded to about 10 km, gives the distance. The partner sees only the kilometres.
   */
  location: { share: boolean };
}

export function defaultSettings(): UserSettings {
  return {
    // Categories start on (P-52); each person can quieten or turn off any group.
    notify: {
      messages: "immediate",
      signals: "immediate",
      days: "immediate",
      letters: "immediate",
      events: "immediate",
      account: "immediate",
      reminders: "off",
    },
    sound: true,
    vibration: true,
    badge: true,
    quiet: { on: false, start: null, end: null },
    previews: "generic",
    reminders: null,
    partnerNickname: "",
    greeting: "time",
    customGreeting: "",
    export: { state: "none", readyAt: null },
    home: {
      ring: true,
      watchers: true,
      cards: {
        now: true,
        messages: true,
        upcoming: true,
        letters: true,
        memory: true,
        today: true,
      },
    },
    motion: "system",
    haptics: true,
    location: { share: true },
  };
}

/** Fills in anything missing (settings saved by an older prototype build). */
export function withDefaults(s: Partial<UserSettings> | undefined): UserSettings {
  const d = defaultSettings();
  return {
    ...d,
    ...s,
    notify: { ...d.notify, ...s?.notify },
    quiet: { ...d.quiet, ...s?.quiet },
    export: { ...d.export, ...s?.export },
    home: { ...d.home, ...s?.home, cards: { ...d.home.cards, ...s?.home?.cards } },
    location: { ...d.location, ...s?.location },
  };
}

/** The Home greeting as SET-04 previews it ("Good evening, love"). */
export function greetingLine(s: UserSettings, partnerName: string, hour: number): string {
  const who = s.partnerNickname.trim() || partnerName;
  if (s.greeting === "custom" && s.customGreeting.trim() !== "") {
    return s.customGreeting.trim().replace(/\{name\}/g, who);
  }
  const part = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return part === "night" ? `Still up, ${who}?` : `Good ${part}, ${who}`;
}

/** "22:00" → minutes after midnight. */
export function minutesOf(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Whether a local time falls inside quiet hours (windows may cross midnight). */
export function inQuietHours(q: QuietHours, hhmm: string): boolean {
  if (!q.on || q.start === null || q.end === null) return false;
  const t = minutesOf(hhmm);
  const a = minutesOf(q.start);
  const b = minutesOf(q.end);
  return a <= b ? t >= a && t < b : t >= a || t < b;
}

export const NOTIFY_MODES: readonly { value: NotifyMode; label: string }[] = [
  { value: "immediate", label: "Now" },
  { value: "quiet", label: "Quiet" },
  { value: "scheduled", label: "Later" },
  { value: "off", label: "Off" },
];
