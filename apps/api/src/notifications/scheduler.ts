import { sql, type Kysely } from "kysely";
import { Temporal } from "temporal-polyfill";
import type { Database } from "../db/database";
import type { NotificationsService } from "./notifications.service";

/**
 * Notifications that come at a time (P-102): a surprise on its day, and events, birthdays and
 * anniversaries on theirs. Every few minutes the API looks for what is due today in each
 * person's own zone (ADR-0002), from 9:00 their time, never in the night. Each notice is claimed
 * in the database first, so several API processes send it once.
 */
export const SCHEDULER_INTERVAL_MS = 5 * 60_000;
/** Day notices wait until this local hour. */
export const MORNING_HOUR = 9;

interface SurpriseRow {
  id: string;
  relationship_id: string;
  author_id: string;
  recipient_id: string;
  reveal: unknown;
  recipient_zone: string | null;
}

interface EventRow {
  event_id: string;
  relationship_id: string;
  kind: string;
  first_date: string;
  repeats: string;
  member_id: string;
  member_zone: string | null;
}

/** The person's own date and hour now; UTC for an unknown zone. */
export function localNow(now: Temporal.Instant, zone: string | null) {
  try {
    return now.toZonedDateTimeISO(zone ?? "UTC");
  } catch {
    return now.toZonedDateTimeISO("UTC");
  }
}

/** Whether an event (first on `first`, repeating) falls on `day`. */
export function eventFallsOn(first: string, repeats: string, day: Temporal.PlainDate): boolean {
  let start: Temporal.PlainDate;
  try {
    start = Temporal.PlainDate.from(first.slice(0, 10));
  } catch {
    return false;
  }
  if (Temporal.PlainDate.compare(day, start) < 0) return false;
  switch (repeats) {
    case "yearly": {
      // 29 February falls on the 28th in other years.
      const day29 = start.month === 2 && start.day === 29 && !day.inLeapYear;
      return day.month === start.month && day.day === (day29 ? 28 : start.day);
    }
    case "monthly":
      return day.day === Math.min(start.day, day.daysInMonth);
    default:
      return day.equals(start);
  }
}

export class NotificationScheduler {
  #timer: ReturnType<typeof setInterval> | null = null;
  #running = false;

  constructor(
    private readonly db: Kysely<Database>,
    private readonly notifications: Pick<NotificationsService, "sendNotification">,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  start(): void {
    if (this.#timer !== null) return;
    this.#timer = setInterval(() => {
      void this.runOnce();
    }, SCHEDULER_INTERVAL_MS);
    this.#timer.unref();
    void this.runOnce();
  }

  stop(): void {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
  }

  async runOnce(now: Temporal.Instant = Temporal.Now.instant()): Promise<number> {
    if (this.#running) return 0;
    this.#running = true;
    try {
      return (await this.#surprises(now)) + (await this.#events(now));
    } catch (error) {
      this.onError(error);
      return 0;
    } finally {
      this.#running = false;
    }
  }

  async #claim(key: string): Promise<boolean> {
    const r = await sql<{ ok: boolean }>`select notification_claim(${key}) as ok`.execute(this.db);
    return r.rows[0]?.ok === true;
  }

  async #surprises(now: Temporal.Instant): Promise<number> {
    const rows = (await sql<SurpriseRow>`select * from due_surprise_candidates()`.execute(this.db))
      .rows;
    if (rows.length === 0) return 0;
    const events = await this.#eventRows();
    let sent = 0;
    for (const s of rows) {
      const local = localNow(now, s.recipient_zone);
      if (local.hour < MORNING_HOUR) continue;
      const today = local.toPlainDate();
      const reveal = (typeof s.reveal === "string" ? JSON.parse(s.reveal) : s.reveal) as {
        kind?: string;
        date?: string;
        eventId?: string;
      };
      let due = false;
      if (reveal.kind === "date" && typeof reveal.date === "string") {
        try {
          due =
            Temporal.PlainDate.compare(Temporal.PlainDate.from(reveal.date.slice(0, 10)), today) <=
            0;
        } catch {
          due = false;
        }
      } else if (reveal.kind === "event" && typeof reveal.eventId === "string") {
        const e = events.find((x) => x.event_id === reveal.eventId);
        due = e !== undefined && eventFallsOn(e.first_date, e.repeats, today);
      }
      if (!due || !(await this.#claim(`surprise:${s.id}`))) continue;
      await this.notifications.sendNotification({
        relationshipId: s.relationship_id,
        recipientUserId: s.recipient_id,
        senderUserId: s.author_id,
        category: "surprise",
        group: "letters",
        href: `/moments/surprises/${s.id}`,
      });
      sent += 1;
    }
    return sent;
  }

  async #eventRows(): Promise<EventRow[]> {
    return (await sql<EventRow>`select * from event_notice_candidates()`.execute(this.db)).rows;
  }

  async #events(now: Temporal.Instant): Promise<number> {
    let sent = 0;
    for (const e of await this.#eventRows()) {
      const local = localNow(now, e.member_zone);
      if (local.hour < MORNING_HOUR) continue;
      const today = local.toPlainDate();
      if (!eventFallsOn(e.first_date, e.repeats, today)) continue;
      if (!(await this.#claim(`event:${e.event_id}:${e.member_id}:${today.toString()}`))) continue;
      await this.notifications.sendNotification({
        relationshipId: e.relationship_id,
        recipientUserId: e.member_id,
        category: e.kind === "birthday" || e.kind === "anniversary" ? "birthday" : "event-reminder",
        group: "events",
        href: `/moments/event/${e.event_id}`,
      });
      sent += 1;
    }
    return sent;
  }
}
