import * as Notifications from "expo-notifications";
import { Temporal } from "temporal-polyfill";
import type { NotifyGroup } from "@/domain/notifications";
import type { LocalNotice } from "./plan";

/**
 * Real Android notifications from this phone, no server (P-75). Text and timing come from the
 * planner (`plan.ts`), which applies the person's previews, quiet hours and categories; this
 * file only talks to the system. A tap opens the notice's screen through `onOpen`.
 */
export function notificationsSupported(): boolean {
  return true;
}

export type Permission = "granted" | "denied" | "undetermined";

/** One channel per kind, so each can be tuned in Android settings, plus a silent one. */
const CHANNELS = {
  messages: { name: "Messages", importance: Notifications.AndroidImportance.HIGH },
  signals: { name: "Thoughts and signals", importance: Notifications.AndroidImportance.HIGH },
  reminders: {
    name: "Letters, surprises and dates",
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  quiet: { name: "Quiet", importance: Notifications.AndroidImportance.LOW },
} as const;
type Channel = keyof typeof CHANNELS;

function channelFor(group: NotifyGroup, quiet: boolean): Channel {
  if (quiet) return "quiet";
  if (group === "messages") return "messages";
  if (group === "signals") return "signals";
  return "reminders";
}

let setUp: Promise<void> | null = null;
function setup(): Promise<void> {
  setUp ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
    });
    for (const [id, c] of Object.entries(CHANNELS)) {
      await Notifications.setNotificationChannelAsync(id, {
        name: c.name,
        importance: c.importance,
        ...(id === "quiet" ? { sound: null, enableVibrate: false } : {}),
      });
    }
  })();
  return setUp;
}

export async function permission(ask: boolean): Promise<Permission> {
  await setup();
  const now = await Notifications.getPermissionsAsync();
  if (now.granted) return "granted";
  if (!ask || !now.canAskAgain) return now.canAskAgain ? "undetermined" : "denied";
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? "granted" : "denied";
}

function content(n: LocalNotice): Notifications.NotificationContentInput {
  return { title: n.title, body: n.body, data: { href: n.href, garnet: true } };
}

export async function present(n: LocalNotice): Promise<void> {
  await setup();
  await Notifications.scheduleNotificationAsync({
    identifier: `garnet-${n.id}`,
    content: content(n),
    trigger: { channelId: channelFor(n.group, n.quiet) },
  });
}

/** Replaces every scheduled Garnet notification with this list. */
export async function reschedule(notices: readonly LocalNotice[]): Promise<void> {
  await setup();
  const wanted = new Set(notices.map((n) => `garnet-${n.id}`));
  for (const old of await Notifications.getAllScheduledNotificationsAsync()) {
    if (old.identifier.startsWith("garnet-") && !wanted.has(old.identifier))
      await Notifications.cancelScheduledNotificationAsync(old.identifier);
  }
  for (const n of notices) {
    await Notifications.scheduleNotificationAsync({
      identifier: `garnet-${n.id}`,
      content: content(n),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: Temporal.Instant.from(n.at).epochMilliseconds,
        channelId: channelFor(n.group, n.quiet),
      },
    });
  }
}

export async function setBadge(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export function onOpen(open: (href: string) => void): () => void {
  const go = (r: Notifications.NotificationResponse | null) => {
    const href = r?.notification.request.content.data?.href;
    if (typeof href === "string" && href.startsWith("/")) open(href);
  };
  // A tap that launched the app, then taps while it runs.
  go(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(go);
  return () => {
    sub.remove();
  };
}
