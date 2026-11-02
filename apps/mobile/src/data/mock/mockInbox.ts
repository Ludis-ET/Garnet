import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import type { InboxItem, InboxRepository } from "@/data/repositories/types";
import { messagePreview } from "@/domain/chat";
import { nextDate } from "@/domain/events";
import { todayIn } from "@/domain/home";
import { notifSpec, renderNotification } from "@/domain/notifications";
import { formatPromptTitle, viewLetter } from "@/domain/openWhen";
import { revealInstant, viewSurprise } from "@/domain/surprises";
import type { MockStore } from "./MockStore";
import { signalInstant, viewerOf } from "./viewer";

/** Each signal's catalogue category (NOTIF-03). */
const SIGNAL_CATEGORY: Readonly<Record<string, string>> = {
  "thought-of-you": "thought",
  "missing-you": "missing-you",
  "need-you": "need-you",
  "need-to-talk": "need-talk",
  "just-listen": "need-talk",
  "check-on-me": "check-on-me",
  "cant-talk-yet": "cant-talk",
  "okay-now": "okay-now",
};

/**
 * NOTIF-01 · The in-app notification centre, built from what happened for this person: the
 * partner's signals, messages and reactions, letters ready to open and events coming up. Safe
 * text only (catalogue copy; a letter's prompt, never its words). Unread marks are this
 * person's own and never reach the partner (§5).
 */
export function inboxOf(s: DemoState, now: Temporal.Instant): InboxItem[] {
  const v = viewerOf(s);
  const me = v.userId;
  const sender = v.partner.name;
  const read = new Set(s.settings.readIds[me] ?? []);
  const kept = new Set(s.settings.keptUnread[me] ?? []);
  const readUpTo = s.chat.readUpTo ?? null;
  // A message read in the chat is read here too (this person's own read position, P-66).
  const readInChat = (at: string) =>
    readUpTo !== null &&
    Temporal.Instant.compare(Temporal.Instant.from(at), Temporal.Instant.from(readUpTo)) <= 0;
  const items: Omit<InboxItem, "unread">[] = [];
  const add = (id: string, category: string, at: string, href: string, extra = {}) => {
    const spec = notifSpec(category);
    if (spec === undefined) return;
    const text = renderNotification(spec, "full", { sender, partner: sender, ...extra });
    items.push({
      id,
      category,
      group: spec.group,
      label: spec.label,
      emoji: spec.emoji,
      title: text.title,
      body: text.body,
      at,
      href,
    });
  };

  for (const i of s.home.incoming) {
    const at = signalInstant(i, now).toString();
    add(`sig-${i.id}`, SIGNAL_CATEGORY[i.signal] ?? "thought", at, "/us");
  }
  for (const m of s.chat.messages) {
    if (m.senderId === me || m.deletedForEveryone === true || m.deletedForMe === true) continue;
    add(`msg-${m.id}`, "chat-message", m.createdAt, "/us/chat", {
      messagePreview: messagePreview(m),
    });
  }
  for (const m of s.chat.messages) {
    if (m.senderId !== me || m.deletedForEveryone === true) continue;
    if (!m.reactions.some((r) => !r.reactedByMe)) continue;
    add(`react-${m.id}`, "reply-reaction", m.createdAt, "/us/chat");
  }
  for (const l of s.letters) {
    const view = viewLetter(l, me, now);
    if (view.kind !== "sealed" || !view.viewerIsRecipient || !view.eligible) continue;
    add(`letter-${l.id}`, "open-when", l.sealedAt ?? now.toString(), `/moments/open-when/${l.id}`, {
      safePrompt: formatPromptTitle(view.safePrompt),
    });
  }
  for (const sur of s.surprises) {
    const view = viewSurprise(sur, me, now);
    if (view.kind !== "locked" || view.fromMe || !view.ready) continue;
    // Only the safe title the sender chose, or the generic line (SUR, A9).
    add(
      `surprise-${sur.id}`,
      "surprise",
      revealInstant(sur.reveal, sur.createdAt).toString(),
      `/moments/surprises/${sur.id}`,
      {
        safeTitle: view.title,
      },
    );
  }
  const today = todayIn(now, v.me.zone);
  for (const e of s.moments.events) {
    if (e.deleted === true) continue;
    const first =
      e.date === null ? today.add({ days: e.inDays ?? 0 }) : Temporal.PlainDate.from(e.date);
    const date = nextDate(first, e.repeats, today);
    if (date === null) continue;
    const days = today.until(date).days;
    if (days < 0 || days > 7) continue;
    add(
      `event-${e.id}-${date.toString()}`,
      "event-reminder",
      today.toZonedDateTime({ timeZone: v.me.zone, plainTime: "08:00" }).toInstant().toString(),
      `/moments/event/${e.id}`,
      {
        eventTitle: e.title,
        when: days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${String(days)} days`,
      },
    );
  }

  return items
    .filter((i) => Temporal.Instant.compare(Temporal.Instant.from(i.at), now) <= 0)
    .map((i) => ({
      ...i,
      unread:
        kept.has(i.id) || (!read.has(i.id) && !(i.category === "chat-message" && readInChat(i.at))),
    }))
    .sort((a, b) =>
      Temporal.Instant.compare(Temporal.Instant.from(b.at), Temporal.Instant.from(a.at)),
    );
}

export function createMockInbox(store: MockStore, now: () => Temporal.Instant): InboxRepository {
  const markRead = (ids: string[]) => {
    store.update((s) => {
      const me = viewerOf(s).userId;
      return {
        ...s,
        settings: {
          ...s.settings,
          readIds: {
            ...s.settings.readIds,
            [me]: [...new Set([...(s.settings.readIds[me] ?? []), ...ids])],
          },
          keptUnread: {
            ...s.settings.keptUnread,
            [me]: (s.settings.keptUnread[me] ?? []).filter((k) => !ids.includes(k)),
          },
        },
      };
    });
  };
  const markUnread = (id: string) => {
    store.update((s) => {
      const me = viewerOf(s).userId;
      return {
        ...s,
        settings: {
          ...s.settings,
          readIds: {
            ...s.settings.readIds,
            [me]: (s.settings.readIds[me] ?? []).filter((r) => r !== id),
          },
          keptUnread: {
            ...s.settings.keptUnread,
            [me]: [...new Set([...(s.settings.keptUnread[me] ?? []), id])],
          },
        },
      };
    });
  };
  return {
    list: () => store.simulate(() => inboxOf(store.read(), now())),
    markRead: (id) =>
      store.simulate(() => {
        markRead([id]);
      }),
    markUnread: (id) =>
      store.simulate(() => {
        markUnread(id);
      }),
    markAllRead: () =>
      store.simulate(() => {
        markRead(inboxOf(store.read(), now()).map((i) => i.id));
      }),
  };
}
