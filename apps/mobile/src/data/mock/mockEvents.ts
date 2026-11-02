import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import type { DemoEventRecord } from "@/data/fixtures/demoMoments";
import type {
  ChapterDetail,
  ChapterSummary,
  EventView,
  EventsRepository,
} from "@/data/repositories/types";
import {
  CHAPTER_PROMPTS,
  chapterNumber,
  eventInstant,
  nextDate,
  occurrenceNumber,
} from "@/domain/events";
import { todayIn } from "@/domain/home";
import { localTimeLabel } from "@/domain/identity";
import type { MockStore } from "./MockStore";
import { memoryDate, memoryView, startDate } from "./mockMemories";
import { viewerOf } from "./viewer";

const ARTS = ["sunrise", "sea", "night", "garden", "city", "coffee"] as const;

/**
 * Mock adapter for Events and chapters (EVT-01 to EVT-09). Times are stored as a local time in
 * a named zone and shown in both partners' zones (ADR-0002); a time the clocks skip is refused,
 * not moved. Reminders are simulated. Chapters run month by month from when they started and
 * every reflection is optional (no scores, no guilt).
 */
export function createMockEvents(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
): EventsRepository {
  const firstOf = (e: DemoEventRecord, today: Temporal.PlainDate) =>
    e.date === null ? today.add({ days: e.inDays ?? 0 }) : Temporal.PlainDate.from(e.date);

  const view = (s: DemoState, e: DemoEventRecord): EventView => {
    const v = viewerOf(s);
    const today = todayIn(now(), v.me.zone);
    const first = firstOf(e, today);
    const next = nextDate(first, e.repeats, today);
    const on = next ?? first;
    const check = e.time === null || e.zone === null ? null : eventInstant(on, e.time, e.zone);
    return {
      id: e.id,
      title: e.title,
      kind: e.kind,
      emoji: e.emoji,
      first: first.toString(),
      next: next?.toString() ?? null,
      daysAway: next === null ? null : today.until(next).total({ unit: "days" }),
      occurrence: occurrenceNumber(first, e.repeats, on),
      time: e.time,
      zone: e.zone,
      times:
        check?.ok === true
          ? {
              me: localTimeLabel(check.instant, v.me.zone),
              partner: localTimeLabel(check.instant, v.partner.zone),
            }
          : null,
      repeats: e.repeats,
      whose: e.whoseId === null ? null : e.whoseId === v.userId ? "me" : "partner",
      description: e.description,
      reminders: e.reminders,
      art: e.art,
      mine: e.authorId === v.userId,
    };
  };

  const live = (s: DemoState) => s.moments.events.filter((e) => e.deleted !== true);

  const months = (s: DemoState): Temporal.PlainYearMonth[] => {
    const start = startDate(s).toPlainYearMonth();
    const current = todayIn(now(), viewerOf(s).me.zone).toPlainYearMonth();
    const out: Temporal.PlainYearMonth[] = [];
    for (let m = start; Temporal.PlainYearMonth.compare(m, current) <= 0; m = m.add({ months: 1 }))
      out.push(m);
    return out.reverse();
  };

  const summary = (s: DemoState, month: Temporal.PlainYearMonth): ChapterSummary => {
    const v = viewerOf(s);
    const today = todayIn(now(), v.me.zone);
    const start = startDate(s);
    const key = month.toString();
    const record = s.moments.chapters.find((c) => c.month === key);
    const number = chapterNumber(start, month);
    const from = month.toPlainDate({ day: 1 });
    const last = month.toPlainDate({ day: month.daysInMonth });
    const current = month.equals(today.toPlainYearMonth());
    return {
      month: key,
      number,
      title: record?.title ?? `Chapter ${String(number).padStart(2, "0")}`,
      from: (Temporal.PlainDate.compare(from, start) < 0 ? start : from).toString(),
      to: (current ? today : last).toString(),
      art: record?.art ?? ARTS[number % ARTS.length] ?? "sunrise",
      current,
      memoryCount: s.moments.memories.filter(
        (m) => m.deleted !== true && memoryDate(m, today).toPlainYearMonth().equals(month),
      ).length,
    };
  };

  return {
    list: () =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const events = live(s)
          .map((e) => view(s, e))
          .sort((a, b) => {
            if (a.next === null || b.next === null) return a.next === null ? 1 : -1;
            return Temporal.PlainDate.compare(
              Temporal.PlainDate.from(a.next),
              Temporal.PlainDate.from(b.next),
            );
          });
        return {
          today: todayIn(now(), v.me.zone).toString(),
          me: v.me,
          partner: v.partner,
          events,
        };
      }),

    get: (id) =>
      store.simulate(() => {
        const s = store.read();
        const e = live(s).find((x) => x.id === id);
        return e === undefined ? null : view(s, e);
      }),

    save: (input) =>
      store.simulate(() => {
        if (input.title.trim().length === 0)
          return { ok: false as const, reason: "empty-title" as const };
        const s = store.read();
        const v = viewerOf(s);
        const zone = input.time === null ? null : (input.zone ?? v.me.zone);
        if (input.time !== null && zone !== null) {
          const check = eventInstant(Temporal.PlainDate.from(input.date), input.time, zone);
          if (!check.ok)
            return {
              ok: false as const,
              reason:
                check.reason === "missing" ? ("missing-time" as const) : ("invalid-time" as const),
            };
        }
        const existing =
          input.id === undefined ? undefined : live(s).find((e) => e.id === input.id);
        const record: DemoEventRecord = {
          id: existing?.id ?? newId(),
          authorId: existing?.authorId ?? v.userId,
          title: input.title.trim(),
          kind: input.kind,
          emoji: existing?.kind === input.kind ? existing.emoji : kindEmoji(input.kind),
          date: input.date,
          time: input.time,
          zone,
          repeats: input.repeats,
          whoseId: input.whose === null ? null : input.whose === "me" ? v.userId : v.partnerId,
          description: input.description.trim(),
          reminders: input.reminders,
          art: input.art,
        };
        store.update((st) => ({
          ...st,
          moments: {
            ...st.moments,
            events:
              existing === undefined
                ? [...st.moments.events, record]
                : st.moments.events.map((e) => (e.id === record.id ? record : e)),
          },
        }));
        return { ok: true as const, event: view(store.read(), record) };
      }),

    remove: (id) =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          moments: {
            ...s.moments,
            events: s.moments.events.map((e) => (e.id === id ? { ...e, deleted: true } : e)),
          },
        }));
      }),

    chapters: () =>
      store.simulate(() => {
        const s = store.read();
        return months(s).map((m) => summary(s, m));
      }),

    chapter: (month) =>
      store.simulate((): ChapterDetail | null => {
        const s = store.read();
        const ym = months(s).find((m) => m.toString() === month);
        if (ym === undefined) return null;
        const v = viewerOf(s);
        const today = todayIn(now(), v.me.zone);
        const answers = s.moments.reflections[month] ?? {};
        return {
          ...summary(s, ym),
          memories: s.moments.memories
            .filter((m) => m.deleted !== true && memoryDate(m, today).toPlainYearMonth().equals(ym))
            .map((m) => memoryView(s, m, now())),
          reflections: CHAPTER_PROMPTS.map((p) => ({
            prompt: p.id,
            answers: (answers[p.id] ?? []).map((a, i) => {
              const mine = a.authorId === v.userId;
              return {
                id: `${p.id}-${String(i)}`,
                name: mine ? v.me.name : v.partner.name,
                side: mine ? v.me.side : v.partner.side,
                text: a.text,
                mine,
              };
            }),
          })),
        };
      }),

    reflect: (month, prompt, text) =>
      store.simulate(() => {
        const v = viewerOf(store.read());
        store.update((s) => {
          const byPrompt = s.moments.reflections[month] ?? {};
          return {
            ...s,
            moments: {
              ...s.moments,
              reflections: {
                ...s.moments.reflections,
                [month]: {
                  ...byPrompt,
                  [prompt]: [
                    ...(byPrompt[prompt] ?? []),
                    { authorId: v.userId, text: text.trim() },
                  ],
                },
              },
            },
          };
        });
      }),

    rename: (month, title) =>
      store.simulate(() => {
        store.update((s) => {
          const exists = s.moments.chapters.some((c) => c.month === month);
          return {
            ...s,
            moments: {
              ...s.moments,
              chapters: exists
                ? s.moments.chapters.map((c) =>
                    c.month === month ? { ...c, title: title.trim() } : c,
                  )
                : [...s.moments.chapters, { month, title: title.trim(), art: "sunrise" }],
            },
          };
        });
      }),
  };
}

function kindEmoji(kind: DemoEventRecord["kind"]): string {
  switch (kind) {
    case "birthday":
      return "🎂";
    case "anniversary":
      return "💜";
    case "travel":
      return "✈️";
    case "date":
      return "🍿";
    case "custom":
      return "✨";
  }
}
