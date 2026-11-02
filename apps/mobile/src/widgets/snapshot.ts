import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { inboxOf } from "@/data/mock/mockInbox";
import { distanceOf } from "@/data/mock/mockUs";
import { viewerOf } from "@/data/mock/viewer";
import { nextDate } from "@/domain/events";
import { todayIn } from "@/domain/home";

export type DayPart = "morning" | "day" | "evening" | "night";
export type WidgetSide = "ruby" | "sapphire";

/**
 * Everything a home-screen widget may know (widgets plan §2, P-72, P-73). Yes/no flags and
 * numbers only: never words, titles, names, places, signal types or who did what (§5). The
 * app writes it; widget code reads nothing else.
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
];

/** Signed out, not paired, or nothing saved yet. */
export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  ready: false,
  mySide: null,
  partnerSide: null,
  myZone: "UTC",
  partnerZone: null,
  special: false,
  somethingNew: false,
  waiting: false,
  nextEventDays: null,
  km: null,
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
  return {
    ready: true,
    mySide: v.me.side,
    partnerSide: v.partner.side,
    myZone: v.me.zone,
    partnerZone: v.partner.zone,
    special,
    somethingNew: inbox.some((i) => i.unread),
    waiting: inbox.some((i) => i.category === "open-when" || i.category === "surprise"),
    nextEventDays,
    km: distance === null ? null : Math.round(distance.km / 100) * 100,
  };
}

const isSide = (v: unknown): v is WidgetSide => v === "ruby" || v === "sapphire";
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

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
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}
