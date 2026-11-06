import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { inboxOf } from "@/data/mock/mockInbox";
import { distanceOf } from "@/data/mock/mockUs";
import { viewerOf } from "@/data/mock/viewer";
import type { SqliteStore } from "@/data/sqlite/sqliteStore";
import { nextDate } from "@/domain/events";
import { todayIn } from "@/domain/home";

export type DayPart = "morning" | "day" | "evening" | "night";
export type WidgetSide = "ruby" | "sapphire";

export type WidgetMood =
  "calm" | "happy" | "loving" | "sleepy" | "hug" | "thinking" | "dancing" | "celebrating";

export type WidgetSignal = "thought" | "missing" | "hug" | "listening" | "talk";

/**
 * Everything a home-screen widget may know (widgets plan §2, P-72, P-73, P-90, P-91).
 * Yes/no flags, numbers, sides, zones, and safe enum tokens only: never user-typed words,
 * titles, names, places, signal types or who did what (§5 Product Guardrails).
 */
export interface WidgetSnapshot {
  /** False until this phone is signed in and paired: every widget then says "Open Garnet". */
  ready: boolean;
  mySide: WidgetSide | null;
  partnerSide: WidgetSide | null;
  /** IANA zones (ADR-0002), for each person's part of the day. */
  myZone: string;
  partnerZone: string | null;
  /** A birthday or anniversary today. */
  special: boolean;
  /** Anything unread in this person's notification centre, never what or how many. */
  somethingNew: boolean;
  /** A letter or surprise can be opened now, never which. */
  waiting: boolean;
  /** Days until the next event, never its title or kind. */
  nextEventDays: number | null;
  /** Rounded to 100 km, and only while this person has distance on (P-66). */
  km: number | null;

  /** Diurnal day part on partner's wall clock (morning, day, evening, night). */
  partnerPart: DayPart | null;
  /** Whether the partner's local hour is waking hours (07:00–23:00). */
  partnerAwake: boolean | null;
  /** Partner's shared mood token from Days entries (§5: never private drafts). */
  partnerMood: WidgetMood | null;
  /** Recent gentle connection signal token exchanged. */
  recentSignal: WidgetSignal | null;
  /** Whether today's Shared Spark is completed. */
  sparkActive: boolean;
  /** Whether both partners shared today and recap is ready. */
  dayRecapReady: boolean;
  /** Count of days since the couple's milestone start date. */
  togetherDays: number | null;
}

export const WIDGET_SNAPSHOT_KEYS: readonly (keyof WidgetSnapshot)[] = [
  "ready",
  "mySide",
  "partnerSide",
  "myZone",
  "partnerZone",
  "special",
  "somethingNew",
  "waiting",
  "nextEventDays",
  "km",
  "partnerPart",
  "partnerAwake",
  "partnerMood",
  "recentSignal",
  "sparkActive",
  "dayRecapReady",
  "togetherDays",
];

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  ready: false,
  mySide: null,
  partnerSide: null,
  myZone: "Europe/London",
  partnerZone: null,
  special: false,
  somethingNew: false,
  waiting: false,
  nextEventDays: null,
  km: null,
  partnerPart: null,
  partnerAwake: null,
  partnerMood: null,
  recentSignal: null,
  sparkActive: false,
  dayRecapReady: false,
  togetherDays: null,
};

/**
 * The part of the day on the wall clock in `zone` (widgets plan §3): 05–11 morning, 11–17 day,
 * 17–21 evening, otherwise night. From the zoned time, so DST days of 23 or 25 hours just work.
 */
export function dayPart(now: Temporal.Instant, zone: string): DayPart {
  const hour = now.toZonedDateTimeISO(zone).hour;
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Builds this person's snapshot from the demo state. Pure. */
export function buildWidgetSnapshot(s: DemoState, now: Temporal.Instant): WidgetSnapshot {
  if (s.auth.status.kind !== "signedIn") return EMPTY_SNAPSHOT;
  const v = viewerOf(s);
  if ((s.pairing.byUser[v.userId] ?? EMPTY_PAIRING).partnerName === null) return EMPTY_SNAPSHOT;
  const inbox = inboxOf(s, now);
  const today = todayIn(now, v.me.zone);
  let nextEventDays: number | null = null;
  let special = false;
  for (const e of s.moments.events) {
    if (e.deleted === true) continue;
    const first =
      e.date === null ? today.add({ days: e.inDays ?? 0 }) : Temporal.PlainDate.from(e.date);
    const date = nextDate(first, e.repeats, today);
    if (date === null) continue;
    const days = today.until(date).days;
    if (nextEventDays === null || days < nextEventDays) nextEventDays = days;
    if (days === 0 && (e.kind === "birthday" || e.kind === "anniversary")) special = true;
  }
  const distance = distanceOf(s);

  // Smart context: Diurnal rhythm across Addis Ababa & London
  const partnerZone = v.partner.zone;
  const partnerPart: DayPart = dayPart(now, partnerZone);
  const partnerHour = now.toZonedDateTimeISO(partnerZone).hour;
  const partnerAwake = partnerHour >= 7 && partnerHour < 23;

  // Smart context: Emotions & Feelings from shared entries only (§5: never private drafts)
  let partnerMood: WidgetMood | null = null;
  for (const entry of s.days.entries) {
    if (
      entry.authorId !== v.userId &&
      entry.visibility === "shared" &&
      entry.deleted !== true &&
      entry.mood !== undefined
    ) {
      if (entry.mood === "calm") partnerMood = "calm";
      else if (entry.mood === "happy") partnerMood = "happy";
      else if (entry.mood === "loved") partnerMood = "loving";
      else if (entry.mood === "tired") partnerMood = "sleepy";
      else if (entry.mood === "excited") partnerMood = "dancing";
      else if (entry.mood === "busy") partnerMood = "thinking";
      else partnerMood = "hug";
      break;
    }
  }

  // Smart context: Gentle signals exchanged
  let recentSignal: WidgetSignal | null = null;
  const lastSignal = s.home.incoming[s.home.incoming.length - 1];
  if (lastSignal !== undefined) {
    if (lastSignal.signal === "thought-of-you") recentSignal = "thought";
    else if (lastSignal.signal === "missing-you") recentSignal = "missing";
    else if (lastSignal.signal === "need-you") recentSignal = "hug";
    else if (lastSignal.signal === "just-listen" || lastSignal.signal === "need-to-talk")
      recentSignal = "listening";
  }

  // Smart context: Spark & Day recap ready
  const sharedDayStr = today.toString();
  const readyToday = s.days.ready.byDate[sharedDayStr] ?? s.days.ready.byOffset[0];
  const sparkActive = readyToday ? readyToday.me && readyToday.partner : false;
  const dayRecapReady = sparkActive;

  // Smart context: Days together
  let togetherDays: number | null = null;
  if (s.profiles.togetherSince !== null) {
    try {
      const start = Temporal.PlainDate.from(s.profiles.togetherSince);
      togetherDays = start.until(today).days;
    } catch {
      togetherDays = null;
    }
  }

  return {
    ready: true,
    mySide: v.me.side,
    partnerSide: v.partner.side,
    myZone: v.me.zone,
    partnerZone,
    special,
    somethingNew: inbox.some((i) => i.unread),
    waiting: inbox.some((i) => i.category === "open-when" || i.category === "surprise"),
    nextEventDays,
    km: distance === null ? null : Math.round(distance.km / 100) * 100,
    partnerPart,
    partnerAwake,
    partnerMood,
    recentSignal,
    sparkActive,
    dayRecapReady,
    togetherDays,
  };
}

export interface ProductionWidgetSession {
  userId: string;
  relationshipId: string;
  mySide: WidgetSide;
  partnerSide: WidgetSide;
  myZone: string;
  partnerZone: string;
  partnerName: string | null;
  togetherDate?: string | null;
  km?: number | null;
}

/**
 * Builds the widget snapshot directly from the local SQLite store and active session (P-91).
 * Completely eliminates dependency on DemoState for production builds.
 */
export async function buildProductionWidgetSnapshot(
  sqlite: SqliteStore,
  session: ProductionWidgetSession,
  now: Temporal.Instant,
): Promise<WidgetSnapshot> {
  if (!session.partnerName) return EMPTY_SNAPSHOT;

  const today = todayIn(now, session.myZone);

  // 1. Next event and special days from SQLite
  const events = await sqlite.getConfirmedEvents(session.relationshipId);
  let nextEventDays: number | null = null;
  let special = false;
  for (const e of events) {
    if (!e.date) continue;
    try {
      const first = Temporal.PlainDate.from(e.date);
      const date = nextDate(first, (e.repeats ?? "none") as "none" | "yearly" | "monthly", today);
      if (date === null) continue;
      const days = today.until(date).days;
      if (nextEventDays === null || days < nextEventDays) nextEventDays = days;
      if (days === 0) special = true;
    } catch {
      // ignore malformed dates
    }
  }

  // 2. Diurnal rhythm across Addis Ababa & London
  const partnerPart = dayPart(now, session.partnerZone);
  const partnerHour = now.toZonedDateTimeISO(session.partnerZone).hour;
  const partnerAwake = partnerHour >= 7 && partnerHour < 23;

  // 3. Emotions & Feelings from confirmed entries
  const entries = await sqlite.getConfirmedEntries();
  let partnerMood: WidgetMood | null = null;
  for (const entry of entries) {
    if (entry.authorId !== session.userId && entry.visibility === "shared" && entry.mood) {
      if (entry.mood === "calm") partnerMood = "calm";
      else if (entry.mood === "happy") partnerMood = "happy";
      else if (entry.mood === "loved") partnerMood = "loving";
      else if (entry.mood === "tired") partnerMood = "sleepy";
      else if (entry.mood === "excited") partnerMood = "dancing";
      else if (entry.mood === "busy") partnerMood = "thinking";
      else partnerMood = "hug";
      break;
    }
  }

  // 4. Recent signals
  const signals = await sqlite.getSyncSignals(session.relationshipId);
  let recentSignal: WidgetSignal | null = null;
  if (signals.length > 0) {
    const last = signals[0];
    if (last) {
      if (last.signal === "thought-of-you") recentSignal = "thought";
      else if (last.signal === "missing-you") recentSignal = "missing";
      else if (last.signal === "need-you") recentSignal = "hug";
      else if (last.signal === "just-listen" || last.signal === "need-to-talk")
        recentSignal = "listening";
    }
  }

  // 5. Spark and recap status
  let sparkActive = false;
  let dayRecapReady = false;
  const todayStr = today.toString();
  const todayEntries = entries.filter((e) => e.sharedDay === todayStr);
  const myToday = todayEntries.some((e) => e.authorId === session.userId);
  const partnerToday = todayEntries.some((e) => e.authorId !== session.userId);
  if (myToday && partnerToday) {
    sparkActive = true;
    dayRecapReady = true;
  }

  // 6. Days together count
  let togetherDays: number | null = null;
  if (session.togetherDate) {
    try {
      const start = Temporal.PlainDate.from(session.togetherDate);
      togetherDays = start.until(today).days;
    } catch {
      togetherDays = null;
    }
  }

  // 7. Waiting items
  const letters = await sqlite.getConfirmedLetters(session.relationshipId);
  const surprises = await sqlite.getConfirmedSurprises(session.relationshipId);
  const waiting =
    letters.some((l) => l.status === "sealed" && l.recipientId === session.userId) ||
    surprises.some((s) => s.status === "scheduled" && s.recipientId === session.userId);

  return {
    ready: true,
    mySide: session.mySide,
    partnerSide: session.partnerSide,
    myZone: session.myZone,
    partnerZone: session.partnerZone,
    special,
    somethingNew: waiting,
    waiting,
    nextEventDays,
    km: session.km ? Math.round(session.km / 100) * 100 : null,
    partnerPart,
    partnerAwake,
    partnerMood,
    recentSignal,
    sparkActive,
    dayRecapReady,
    togetherDays,
  };
}

const isSide = (v: unknown): v is WidgetSide => v === "ruby" || v === "sapphire";
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isDayPart = (v: unknown): v is DayPart =>
  v === "morning" || v === "day" || v === "evening" || v === "night";
const isMood = (v: unknown): v is WidgetMood =>
  typeof v === "string" &&
  ["calm", "happy", "loving", "sleepy", "hug", "thinking", "dancing", "celebrating"].includes(v);
const isSignal = (v: unknown): v is WidgetSignal =>
  typeof v === "string" && ["thought", "missing", "hug", "listening", "talk"].includes(v);

/**
 * Reads a saved snapshot back for the widget (P-73). Anything missing, malformed or unknown
 * falls back to the empty snapshot, and only the allowed fields are kept.
 */
export function parseWidgetSnapshot(raw: string | null): WidgetSnapshot {
  if (raw === null) return EMPTY_SNAPSHOT;
  try {
    const o = JSON.parse(raw) as Partial<Record<keyof WidgetSnapshot, unknown>> | null;
    if (o === null || typeof o !== "object" || o.ready !== true || typeof o.myZone !== "string")
      return EMPTY_SNAPSHOT;
    // An unknown zone would make every widget throw; treat it as no snapshot.
    Temporal.Now.instant().toZonedDateTimeISO(o.myZone);
    const partnerZone = typeof o.partnerZone === "string" ? o.partnerZone : null;
    if (partnerZone !== null) Temporal.Now.instant().toZonedDateTimeISO(partnerZone);
    return {
      ready: true,
      mySide: isSide(o.mySide) ? o.mySide : null,
      partnerSide: isSide(o.partnerSide) ? o.partnerSide : null,
      myZone: o.myZone,
      partnerZone,
      special: o.special === true,
      somethingNew: o.somethingNew === true,
      waiting: o.waiting === true,
      nextEventDays: isCount(o.nextEventDays) ? Math.floor(o.nextEventDays) : null,
      km: isCount(o.km) ? o.km : null,
      partnerPart: isDayPart(o.partnerPart) ? o.partnerPart : null,
      partnerAwake: typeof o.partnerAwake === "boolean" ? o.partnerAwake : null,
      partnerMood: isMood(o.partnerMood) ? o.partnerMood : null,
      recentSignal: isSignal(o.recentSignal) ? o.recentSignal : null,
      sparkActive: o.sparkActive === true,
      dayRecapReady: o.dayRecapReady === true,
      togetherDays: isCount(o.togetherDays) ? Math.floor(o.togetherDays) : null,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}
