import { type Href, router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { Temporal } from "temporal-polyfill";
import { useDemoControls } from "@/data/RepositoryProvider";
import { inboxOf } from "@/data/mock/mockInbox";
import { clearStored, readStored, writeStored } from "@/data/mock/storage";
import { withDefaults } from "@/domain/settings";
import { arrivalIds, arrivals, scheduled } from "./plan";
import {
  notificationsSupported,
  onOpen,
  permission,
  present,
  reschedule,
  setBadge,
} from "./system";

/** Notices already shown on this phone, so each arrives once (P-75). */
const SEEN_KEY = "garnet_notified_v1";
const MAX_SEEN = 500;

function loadSeen(): Set<string> | null {
  try {
    const raw = readStored(SEEN_KEY);
    return raw === null ? null : new Set(JSON.parse(raw) as string[]);
  } catch {
    clearStored(SEEN_KEY);
    return null;
  }
}

/**
 * Real notifications from the mock data (owner direction P-75): the partner's new messages and
 * signals show right away (not the chat's own messages while that chat is open), and event
 * reminders, letters and surprises are scheduled for their time. A tap opens the right screen.
 * Renders nothing; does nothing where the platform has no notifications yet.
 */
export function NotificationSync() {
  const store = useDemoControls();
  const pathname = usePathname();
  const where = useRef(pathname);
  useEffect(() => {
    where.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!notificationsSupported()) return;
    return onOpen((href) => {
      router.push(href as Href);
    });
  }, []);

  useEffect(() => {
    if (!notificationsSupported()) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let asked = false;
    const sync = async () => {
      const s = store.read();
      if (s.auth.status.kind !== "signedIn") return;
      const me = s.auth.status.userId;
      // Ask once, after the person said yes to notifications in setup (SETUP-07).
      const wants = s.profiles.byUser[me]?.notifications.status === "on";
      const allowed = await permission(wants && !asked);
      asked = true;
      if (allowed !== "granted") return;
      const now = Temporal.Now.instant();
      let seen = loadSeen();
      // First run: what's already there counts as seen, so no burst of old notifications.
      seen ??= new Set(arrivalIds(s, now));
      const inChat = AppState.currentState === "active" && where.current.startsWith("/us/chat");
      for (const n of arrivals(s, now, seen)) {
        seen.add(n.id);
        if (n.group === "messages" && inChat) continue;
        await present(n);
      }
      writeStored(SEEN_KEY, JSON.stringify([...seen].slice(-MAX_SEEN)));
      await reschedule(scheduled(s, now));
      const unread = inboxOf(s, now).filter((i) => i.unread).length;
      await setBadge(withDefaults(s.settings.byUser[me]).badge ? unread : 0);
    };
    const run = () => {
      void sync().catch(() => {
        // The app carries on; the next change tries again.
      });
    };
    run();
    const off = store.subscribe(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(run, 600);
    });
    return () => {
      off();
      if (timer !== null) clearTimeout(timer);
    };
  }, [store]);

  return null;
}
