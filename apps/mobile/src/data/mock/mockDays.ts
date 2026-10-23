import { sharedDayOf, sharedDayWindow } from "@garnet/domain";
import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import type { DemoEntry } from "@/data/fixtures/demoDays";
import type { DaysRepository, DaySummary, EntryView, HomePerson } from "@/data/repositories/types";
import {
  canChangeVisibility,
  matchesFilter,
  partnerCanSee,
  revealState,
  type DayPolicy,
  type RevealState,
} from "@/domain/days";
import type { MockStore } from "./MockStore";
import { entryInstant, viewerOf } from "./viewer";

/** How many shared days the overview lists (today and before). */
const OVERVIEW_DAYS = 10;

/**
 * Mock adapter for DaysRepository (DAYS-01 to DAYS-11). The shared-day policy (cutoff U-02,
 * recap U-06) is a required parameter. Privacy before anything leaves this function:
 * - the viewer's own entries, all of them;
 * - the partner's only when shared, or "after our days meet" once the day is revealed;
 * - the partner's private drafts never — not as rows, previews, dots or search hits.
 */
export function createMockDays(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
  policy: DayPolicy,
): DaysRepository {
  const today = () => sharedDayOf(now(), policy.sharedDay);

  const stateOf = (s: DemoState, date: Temporal.PlainDate): RevealState => {
    const offset = date.until(today()).total({ unit: "days" });
    const ready = s.days.ready.byDate[date.toString()] ??
      s.days.ready.byOffset[offset] ?? { me: false, partner: false };
    return revealState({
      meReady: ready.me,
      partnerReady: ready.partner,
      dayEnded: Temporal.Instant.compare(now(), sharedDayWindow(date, policy.sharedDay).end) >= 0,
      policy,
    });
  };

  /** Every entry the viewer may see, with its instant and shared day. */
  const visible = (s: DemoState) => {
    const v = viewerOf(s);
    const at = now();
    return (
      s.days.entries
        .filter((e) => e.deleted !== true)
        .filter((e) => e.authorId === v.userId || e.authorId === v.partnerId)
        .map((e) => {
          const mine = e.authorId === v.userId;
          const instant = entryInstant(e, mine ? v.me.zone : v.partner.zone, at);
          return { e, mine, instant, day: sharedDayOf(instant, policy.sharedDay) };
        })
        // Nothing from "later today" that hasn't happened yet.
        .filter((x) => Temporal.Instant.compare(x.instant, at) <= 0)
        .filter((x) => x.mine || partnerCanSee(x.e.visibility, stateOf(s, x.day) === "ready"))
    );
  };

  const view = (
    s: DemoState,
    x: { e: DemoEntry; mine: boolean; instant: Temporal.Instant; day: Temporal.PlainDate },
    me: HomePerson,
    partner: HomePerson,
  ): EntryView => {
    const { e } = x;
    const revealed = stateOf(s, x.day) === "ready";
    return {
      id: e.id,
      mine: x.mine,
      authorName: x.mine ? me.name : partner.name,
      kind: e.kind,
      text: e.text,
      emoji: e.emoji,
      at: x.instant.toString(),
      visibility: e.visibility,
      ...(e.media === undefined ? {} : { media: e.media }),
      ...(e.mood === undefined ? {} : { mood: e.mood }),
      ...(e.activity === undefined ? {} : { activity: e.activity }),
      ...(e.place === undefined ? {} : { place: e.place }),
      ...(e.upload === undefined ? {} : { upload: e.upload }),
      editable: x.mine && !revealed,
    };
  };

  const byTime = (a: EntryView, b: EntryView) =>
    Temporal.Instant.compare(Temporal.Instant.from(a.at), Temporal.Instant.from(b.at));

  const patchEntry = (id: string, patch: (e: DemoEntry) => DemoEntry) => {
    store.update((s) => ({
      ...s,
      days: { ...s.days, entries: s.days.entries.map((e) => (e.id === id ? patch(e) : e)) },
    }));
  };

  return {
    overview: () =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const all = visible(s);
        const t = today();
        const days: DaySummary[] = Array.from({ length: OVERVIEW_DAYS }, (_, i) => {
          const date = t.subtract({ days: i });
          const of = all.filter((x) => x.day.equals(date));
          const photo = of.find((x) => x.e.media !== undefined && x.e.media.type !== "voice");
          return {
            date: date.toString(),
            isToday: i === 0,
            preview: of.slice(0, 4).map((x) => x.e.emoji),
            thumb:
              photo?.e.media !== undefined && photo.e.media.type !== "voice"
                ? photo.e.media.art
                : null,
            me: of.some((x) => x.mine),
            partner: of.some((x) => !x.mine),
            state: stateOf(s, date),
          };
        }).filter((d) => d.isToday || d.me || d.partner);
        return { today: t.toString(), days, me: v.me, partner: v.partner };
      }),

    day: (date) =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const d = Temporal.PlainDate.from(date);
        const of = visible(s).filter((x) => x.day.equals(d));
        return {
          date,
          isToday: d.equals(today()),
          mine: of
            .filter((x) => x.mine)
            .map((x) => view(s, x, v.me, v.partner))
            .sort(byTime),
          partner: of
            .filter((x) => !x.mine)
            .map((x) => view(s, x, v.me, v.partner))
            .sort(byTime),
          state: stateOf(s, d),
          me: v.me,
          partnerPerson: v.partner,
        };
      }),

    entry: (id) =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const x = visible(s).find((y) => y.e.id === id);
        return x === undefined ? null : view(s, x, v.me, v.partner);
      }),

    save: (input) =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const existing =
          input.id === undefined ? undefined : s.days.entries.find((e) => e.id === input.id);
        if (existing !== undefined && existing.authorId !== v.userId) throw new Error("Not yours");
        const base: DemoEntry = existing ?? {
          id: newId(),
          authorId: v.userId,
          dayOffset: 0,
          localTime: null,
          at: now().toString(),
          kind: input.kind,
          text: "",
          emoji: input.emoji,
          visibility: "private",
        };
        // P-20: a shared moment stays shared, even when edited.
        const visibility =
          existing !== undefined && !canChangeVisibility(existing.visibility, input.visibility)
            ? existing.visibility
            : input.visibility;
        const next: DemoEntry = {
          id: base.id,
          authorId: base.authorId,
          dayOffset: base.dayOffset,
          localTime: base.localTime,
          at: base.at,
          kind: input.kind,
          text: input.text.trim(),
          emoji: input.emoji,
          visibility,
          ...(input.media === undefined ? {} : { media: input.media }),
          ...(input.mood === undefined ? {} : { mood: input.mood }),
          ...(input.activity === undefined ? {} : { activity: input.activity }),
          ...(input.place === undefined ? {} : { place: input.place }),
        };
        store.update((st) => ({
          ...st,
          days: {
            ...st.days,
            entries:
              existing === undefined
                ? [...st.days.entries, next]
                : st.days.entries.map((e) => (e.id === next.id ? next : e)),
          },
        }));
        const after = store.read();
        const x = visible(after).find((y) => y.e.id === next.id);
        if (x === undefined) throw new Error("Saved entry not visible");
        return view(after, x, v.me, v.partner);
      }),

    setVisibility: (id, visibility) =>
      store.simulate(() => {
        const s = store.read();
        const x = visible(s).find((y) => y.e.id === id && y.mine);
        if (x === undefined) return { ok: false as const, reason: "read-only" as const };
        if (stateOf(s, x.day) === "ready")
          return { ok: false as const, reason: "read-only" as const };
        if (!canChangeVisibility(x.e.visibility, visibility))
          return { ok: false as const, reason: "shared-stays-shared" as const };
        patchEntry(id, (e) => ({ ...e, visibility }));
        return { ok: true as const };
      }),

    remove: (id) =>
      store.simulate(() => {
        const s = store.read();
        const x = visible(s).find((y) => y.e.id === id);
        // Own moments, or the partner's shared ones (D-11). A tombstone, never reused (P-05).
        if (x === undefined || (!x.mine && x.e.visibility === "private"))
          throw new Error("Not available");
        patchEntry(id, (e) => ({ ...e, deleted: true }));
      }),

    retryUpload: (id) =>
      store.simulate(() => {
        patchEntry(id, (e) => {
          const next = { ...e };
          delete next.upload;
          return next;
        });
      }),

    finishDay: (date) =>
      store.simulate(() => {
        store.update((s) => {
          const d = Temporal.PlainDate.from(date);
          const offset = d.until(today()).total({ unit: "days" });
          const current = s.days.ready.byDate[date] ??
            s.days.ready.byOffset[offset] ?? { me: false, partner: false };
          return {
            ...s,
            days: {
              ...s.days,
              ready: {
                ...s.days.ready,
                byDate: { ...s.days.ready.byDate, [date]: { ...current, me: true } },
              },
            },
          };
        });
      }),

    search: (filter) =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const hits = visible(s).filter((x) =>
          matchesFilter({ text: x.e.text, kind: x.e.kind, mine: x.mine }, filter),
        );
        const byDay = new Map<string, EntryView[]>();
        for (const x of hits) {
          const key = x.day.toString();
          byDay.set(key, [...(byDay.get(key) ?? []), view(s, x, v.me, v.partner)]);
        }
        return [...byDay.entries()]
          .sort(([a], [b]) =>
            Temporal.PlainDate.compare(Temporal.PlainDate.from(b), Temporal.PlainDate.from(a)),
          )
          .map(([date, entries]) => ({ date, entries: entries.sort(byTime) }));
      }),
  };
}
