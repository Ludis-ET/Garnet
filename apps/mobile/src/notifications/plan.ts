import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { inboxOf } from "@/data/mock/mockInbox";
import { viewerOf } from "@/data/mock/viewer";
import { kindOf, nextDate, type ReminderId } from "@/domain/events";
import { todayIn } from "@/domain/home";
import {
  notifSpec,
  renderNotification,
  type NotifContext,
  type NotifyGroup,
  type PreviewMode,
} from "@/domain/notifications";
import { formatPromptTitle, viewLetter } from "@/domain/openWhen";
import { inQuietHours, withDefaults, type UserSettings } from "@/domain/settings";
import { revealInstant, viewSurprise } from "@/domain/surprises";

/**
 * Real local notifications without a server (owner direction P-75). Pure: from the mock state
 * and the clock, what this phone should show now (the partner's new messages and signals) and
 * what it should schedule (event reminders, letters and surprises becoming ready). The text is
 * always catalogue copy under this person's own preview setting, generic by default (P-17, §5):
 * never a letter, a surprise's contents, a draft, or anything about the partner's activity.
 */
export interface LocalNotice {
  /** Stable, so a reschedule replaces rather than duplicates. */
  id: string;
  group: NotifyGroup;
  title: string;
  body: string;
  /** Where a tap goes (the screen re-checks access). */
  href: string;
  /** When to show it (an ISO instant); now for arrivals. */
  at: string;
  /** Quiet: no sound or vibration (the group is set to Quiet, or it falls in quiet hours). */
  quiet: boolean;
}

/** Groups that arrive from the partner and show the moment they happen. */
const ARRIVALS: ReadonlySet<NotifyGroup> = new Set(["messages", "signals"]);
/** Reminder lead times (EVT, P-65). */
const LEAD_DAYS: Record<ReminderId, number> = { day: 0, dayBefore: 1, weekBefore: 7 };
/** Event reminders arrive at this local time. */
const REMINDER_TIME = "09:00";
/** Android keeps only so many alarms; the nearest ones matter. */
export const MAX_SCHEDULED = 40;

function settingsOf(s: DemoState, userId: string): UserSettings {
  return withDefaults(s.settings.byUser[userId]);
}

/** How a notice reads, and whether it is quiet, under this person's settings; null when off. */
function shape(
  settings: UserSettings,
  zone: string,
  category: string,
  at: Temporal.Instant,
  full: { title: string; body: string },
  context: NotifContext,
): Omit<LocalNotice, "id" | "href" | "at"> | null {
  const spec = notifSpec(category);
  if (spec === undefined) return null;
  const mode = settings.notify[spec.group];
  if (mode === "off") return null;
  const preview: PreviewMode = settings.previews;
  const text = preview === "full" ? full : renderNotification(spec, preview, context);
  const local = at.toZonedDateTimeISO(zone).toPlainTime().toString().slice(0, 5);
  const quiet = mode !== "immediate" || inQuietHours(settings.quiet, local);
  return { group: spec.group, title: text.title, body: text.body, quiet };
}

/**
 * The partner's messages and signals not yet notified: unread inbox items in those groups whose
 * ids aren't in `seen`. Callers mark them seen once shown.
 */
export function arrivals(
  s: DemoState,
  now: Temporal.Instant,
  seen: ReadonlySet<string>,
): LocalNotice[] {
  if (!ready(s)) return [];
  const v = viewerOf(s);
  const settings = settingsOf(s, v.userId);
  const out: LocalNotice[] = [];
  for (const item of inboxOf(s, now)) {
    if (!item.unread || !ARRIVALS.has(item.group) || seen.has(item.id)) continue;
    const at = Temporal.Instant.from(item.at);
    const shaped = shape(settings, v.me.zone, item.category, at, item, {
      sender: v.partner.name,
      partner: v.partner.name,
    });
    if (shaped !== null) out.push({ id: item.id, href: item.href, at: item.at, ...shaped });
  }
  return out;
}

/** Every arrival id there is now, to start from without a burst of old notifications. */
export function arrivalIds(s: DemoState, now: Temporal.Instant): string[] {
  if (!ready(s)) return [];
  return inboxOf(s, now)
    .filter((i) => ARRIVALS.has(i.group))
    .map((i) => i.id);
}

/** Event reminders and letters or surprises becoming ready, soonest first. */
export function scheduled(s: DemoState, now: Temporal.Instant): LocalNotice[] {
  if (!ready(s)) return [];
  const v = viewerOf(s);
  const me = v.userId;
  const zone = v.me.zone;
  const settings = settingsOf(s, me);
  const sender = v.partner.name;
  const out: LocalNotice[] = [];
  const push = (
    id: string,
    category: string,
    at: Temporal.Instant,
    href: string,
    context: NotifContext,
  ) => {
    if (Temporal.Instant.compare(at, now) <= 0) return;
    const spec = notifSpec(category);
    if (spec === undefined) return;
    const full = renderNotification(spec, "full", context);
    const shaped = shape(settings, zone, category, at, full, context);
    if (shaped !== null) out.push({ id, href, at: at.toString(), ...shaped });
  };

  const today = todayIn(now, zone);
  for (const e of s.moments.events) {
    if (e.deleted === true) continue;
    const first =
      e.date === null ? today.add({ days: e.inDays ?? 0 }) : Temporal.PlainDate.from(e.date);
    const date = nextDate(first, e.repeats, today);
    if (date === null) continue;
    for (const r of e.reminders) {
      const lead = LEAD_DAYS[r];
      const at = date
        .subtract({ days: lead })
        .toZonedDateTime({ timeZone: zone, plainTime: REMINDER_TIME })
        .toInstant();
      push(
        `event-${e.id}-${date.toString()}-${r}`,
        "event-reminder",
        at,
        `/moments/event/${e.id}`,
        {
          sender,
          eventTitle: e.title,
          eventType: kindOf(e.kind).label.toLowerCase(),
          when: lead === 0 ? "Today" : lead === 1 ? "Tomorrow" : `In ${String(lead)} days`,
        },
      );
    }
  }

  for (const l of s.letters) {
    if (l.recipientId !== me || l.state !== "sealed" || l.unlock.type !== "date") continue;
    const view = viewLetter(l, me, now);
    if (view.kind !== "sealed") continue;
    push(
      `letter-${l.id}`,
      "open-when",
      Temporal.Instant.from(l.unlock.at),
      `/moments/open-when/${l.id}`,
      {
        sender,
        safePrompt: formatPromptTitle(view.safePrompt),
      },
    );
  }

  for (const sur of s.surprises) {
    const view = viewSurprise(sur, me, now);
    if (view.kind !== "locked" || view.fromMe || view.ready) continue;
    push(
      `surprise-${sur.id}`,
      "surprise",
      revealInstant(sur.reveal, sur.createdAt),
      `/moments/surprises/${sur.id}`,
      { sender, safeTitle: view.title },
    );
  }

  return out
    .sort((a, b) =>
      Temporal.Instant.compare(Temporal.Instant.from(a.at), Temporal.Instant.from(b.at)),
    )
    .slice(0, MAX_SCHEDULED);
}

/** Notifications only once this phone is signed in and paired. */
function ready(s: DemoState): boolean {
  if (s.auth.status.kind !== "signedIn") return false;
  const pairing = s.pairing.byUser[s.auth.status.userId] ?? EMPTY_PAIRING;
  return pairing.partnerName !== null;
}
