import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import type { SearchFilters, SearchRepository, SearchResult } from "@/data/repositories/types";
import { messagePreview } from "@/domain/chat";
import { nextDate } from "@/domain/events";
import { todayIn } from "@/domain/home";
import { formatPromptTitle, viewLetter } from "@/domain/openWhen";
import type { MockStore } from "./MockStore";
import { memoryDate } from "./mockMemories";
import { entryInstant, viewerOf } from "./viewer";

const RECENT_MAX = 8;

/** Every word of the query appears in the text (case-insensitive). */
export function matches(text: string, query: string): boolean {
  const t = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => t.includes(w));
}

/** A short excerpt around the first match ("…the river by the old bridge…"). */
export function excerpt(text: string, query: string, width = 70): string {
  const first = query.toLowerCase().split(/\s+/).find(Boolean) ?? "";
  const at = Math.max(0, text.toLowerCase().indexOf(first));
  const start = Math.max(0, at - 24);
  const end = Math.min(text.length, start + width);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/**
 * SEARCH-01 (prompt 14) over everything this person may see: messages, their own moments and
 * the partner's shared ones, letter prompts (never bodies, never a partner's draft), memories
 * and events. Deleted items never come back (no stale results).
 */
export function searchState(
  s: DemoState,
  query: string,
  filters: SearchFilters,
  now: Temporal.Instant,
): SearchResult[] {
  if (query.trim().length === 0) return [];
  const v = viewerOf(s);
  const me = v.userId;
  const today = todayIn(now, v.me.zone);
  const out: SearchResult[] = [];
  const want = (kind: SearchResult["kind"]) =>
    filters.kinds.length === 0 || filters.kinds.includes(kind);
  const whoOk = (mine: boolean) => filters.who === "both" || (filters.who === "me" ? mine : !mine);

  if (want("message")) {
    for (const m of s.chat.messages) {
      if (m.deletedForMe === true || m.deletedForEveryone === true) continue;
      const text = `${m.text} ${m.media?.caption ?? ""}`.trim();
      if (!matches(text, query)) continue;
      const mine = m.senderId === me;
      out.push({
        kind: "message",
        id: m.id,
        title: mine ? "You" : v.partner.name,
        snippet: excerpt(m.text.length > 0 ? m.text : messagePreview(m), query),
        at: m.createdAt,
        mine,
        sealed: false,
        href: "/us/chat",
      });
    }
  }

  if (want("moment")) {
    for (const e of s.days.entries) {
      if (e.deleted === true) continue;
      const mine = e.authorId === me;
      // A partner's private or not-yet-revealed moment never appears (§4, U-02).
      if (!mine && e.visibility !== "shared") continue;
      if (!matches(`${e.text} ${e.place ?? ""}`, query)) continue;
      const zone = mine ? v.me.zone : v.partner.zone;
      out.push({
        kind: "moment",
        id: e.id,
        title: `${e.emoji} ${mine ? "Your moment" : `${v.partner.name}'s moment`}`,
        snippet: excerpt(e.text, query),
        at: entryInstant(e, zone, now).toString(),
        mine,
        sealed: false,
        href: `/days/entry/${e.id}`,
      });
    }
  }

  if (want("letter")) {
    for (const l of s.letters) {
      const view = viewLetter(l, me, now);
      if (view.kind === "unavailable") continue;
      // Only the prompt is ever searched or shown, whatever the letter's state.
      if (!matches(view.safePrompt, query)) continue;
      out.push({
        kind: "letter",
        id: l.id,
        title: formatPromptTitle(view.safePrompt),
        snippet: null,
        at: l.openedAt ?? l.sealedAt ?? now.toString(),
        mine: l.authorId === me,
        sealed: view.kind === "sealed",
        href: `/moments/open-when/${l.id}`,
      });
    }
  }

  if (want("memory")) {
    for (const m of s.moments.memories) {
      if (m.deleted === true) continue;
      const text = `${m.title} ${m.story} ${m.place} ${m.tags.join(" ")}`;
      if (!matches(text, query)) continue;
      out.push({
        kind: "memory",
        id: m.id,
        title: m.title,
        snippet: excerpt(m.story.length > 0 ? m.story : m.place, query),
        at: memoryDate(m, today).toZonedDateTime({ timeZone: v.me.zone }).toInstant().toString(),
        mine: m.authorId === me,
        sealed: false,
        href: `/our-world/memory/${m.id}`,
      });
    }
  }

  if (want("event")) {
    for (const e of s.moments.events) {
      if (e.deleted === true) continue;
      if (!matches(`${e.title} ${e.description}`, query)) continue;
      const first =
        e.date === null ? today.add({ days: e.inDays ?? 0 }) : Temporal.PlainDate.from(e.date);
      const date = nextDate(first, e.repeats, today) ?? first;
      out.push({
        kind: "event",
        id: e.id,
        title: `${e.emoji} ${e.title}`,
        snippet: e.description.length > 0 ? excerpt(e.description, query) : null,
        at: date.toZonedDateTime({ timeZone: v.me.zone }).toInstant().toString(),
        mine: e.authorId === me,
        sealed: false,
        href: `/moments/event/${e.id}`,
      });
    }
  }

  return out
    .filter((r) => whoOk(r.mine))
    .sort((a, b) =>
      Temporal.Instant.compare(Temporal.Instant.from(b.at), Temporal.Instant.from(a.at)),
    );
}

export function createMockSearch(store: MockStore, now: () => Temporal.Instant): SearchRepository {
  const me = () => viewerOf(store.read()).userId;
  const setRecent = (f: (r: string[]) => string[]) => {
    store.update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        recentSearches: {
          ...s.settings.recentSearches,
          [me()]: f(s.settings.recentSearches[me()] ?? []),
        },
      },
    }));
  };
  return {
    search: (query, filters) =>
      store.simulate(() => searchState(store.read(), query, filters, now())),
    recent: () => store.simulate(() => store.read().settings.recentSearches[me()] ?? []),
    remember: (query) =>
      store.simulate(() => {
        const q = query.trim();
        if (q.length === 0) return;
        setRecent((r) => [q, ...r.filter((x) => x !== q)].slice(0, RECENT_MAX));
      }),
    forget: (query) =>
      store.simulate(() => {
        setRecent((r) => r.filter((x) => x !== query));
      }),
    clearRecent: () =>
      store.simulate(() => {
        setRecent(() => []);
      }),
  };
}
