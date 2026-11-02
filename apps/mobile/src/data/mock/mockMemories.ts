import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import type { DemoMemoryRecord } from "@/data/fixtures/demoMoments";
import type { CollectionView, MemoriesRepository, MemoryView } from "@/data/repositories/types";
import { todayIn } from "@/domain/home";
import { matchesMemory } from "@/domain/memories";
import type { MockStore } from "./MockStore";
import { viewerOf } from "./viewer";

/** When the two of them started (chapters and month headers count from here). */
export function startDate(s: DemoState): Temporal.PlainDate {
  const { startAt, sharedTimezone } = s.relationship;
  // A relationship without a start date counts from the first of this year's September.
  if (startAt === null) return Temporal.PlainDate.from("2026-09-01");
  return Temporal.Instant.from(startAt).toZonedDateTimeISO(sharedTimezone).toPlainDate();
}

export function memoryDate(m: DemoMemoryRecord, today: Temporal.PlainDate): Temporal.PlainDate {
  return m.date === null
    ? today.subtract({ days: m.daysAgo ?? 0 })
    : Temporal.PlainDate.from(m.date);
}

/** A memory as the viewer sees it. Memories belong to both partners (§23). */
export function memoryView(s: DemoState, m: DemoMemoryRecord, now: Temporal.Instant): MemoryView {
  const v = viewerOf(s);
  const today = todayIn(now, v.me.zone);
  const mine = m.authorId === v.userId;
  const live = s.moments.collections.filter((c) => c.deleted !== true);
  return {
    id: m.id,
    mine,
    authorName: mine ? v.me.name : v.partner.name,
    authorSide: mine ? v.me.side : v.partner.side,
    title: m.title,
    story: m.story,
    date: memoryDate(m, today).toString(),
    place: m.place,
    media: m.media,
    kind: m.media === null ? "text" : m.media.type,
    tags: m.tags,
    collections: live
      .filter((c) => m.collectionIds.includes(c.id))
      .map((c) => ({ id: c.id, title: c.title })),
  };
}

const newestFirst = (a: MemoryView, b: MemoryView) =>
  Temporal.PlainDate.compare(Temporal.PlainDate.from(b.date), Temporal.PlainDate.from(a.date));

/**
 * Mock adapter for Memories (MEM-01 to MEM-10). Memories are shared by both partners; saving
 * is explicit; deleting removes it for both with a tombstone and no actor (U-16); removing it
 * from a collection keeps the memory (MEM-09).
 */
export function createMockMemories(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
): MemoriesRepository {
  const live = (s: DemoState) => s.moments.memories.filter((m) => m.deleted !== true);

  const collectionView = (s: DemoState, id: string): CollectionView | null => {
    const c = s.moments.collections.find((x) => x.id === id && x.deleted !== true);
    if (c === undefined) return null;
    const items = live(s)
      .filter((m) => m.collectionIds.includes(id))
      .map((m) => memoryView(s, m, now()))
      .sort(newestFirst);
    const cover = items.find((m) => m.media !== null && m.media.type !== "voice")?.media ?? null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      art: c.art,
      count: items.length,
      cover,
    };
  };

  const patch = (id: string, f: (m: DemoMemoryRecord) => DemoMemoryRecord) => {
    store.update((s) => ({
      ...s,
      moments: {
        ...s.moments,
        memories: s.moments.memories.map((m) => (m.id === id ? f(m) : m)),
      },
    }));
  };

  return {
    list: (filter) =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        return live(s)
          .filter((m) =>
            matchesMemory(
              {
                title: m.title,
                story: m.story,
                kind: m.media === null ? "text" : m.media.type,
                mine: m.authorId === v.userId,
                tags: m.tags,
                collectionIds: m.collectionIds,
              },
              filter,
            ),
          )
          .map((m) => memoryView(s, m, now()))
          .sort(newestFirst);
      }),

    get: (id) =>
      store.simulate(() => {
        const s = store.read();
        const m = live(s).find((x) => x.id === id);
        return m === undefined ? null : memoryView(s, m, now());
      }),

    save: (input) =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const existing =
          input.id === undefined ? undefined : live(s).find((m) => m.id === input.id);
        const record: DemoMemoryRecord = {
          id: existing?.id ?? newId(),
          authorId: existing?.authorId ?? v.userId,
          title: input.title.trim(),
          story: input.story.trim(),
          daysAgo: null,
          date: input.date,
          place: input.place.trim(),
          media: input.media,
          tags: input.tags,
          collectionIds: input.collectionIds,
        };
        store.update((st) => ({
          ...st,
          moments: {
            ...st.moments,
            memories:
              existing === undefined
                ? [...st.moments.memories, record]
                : st.moments.memories.map((m) => (m.id === record.id ? record : m)),
          },
        }));
        return memoryView(store.read(), record, now());
      }),

    remove: (id) =>
      store.simulate(() => {
        patch(id, (m) => ({ ...m, deleted: true }));
      }),

    collections: () =>
      store.simulate(() => {
        const s = store.read();
        return s.moments.collections
          .filter((c) => c.deleted !== true)
          .map((c) => collectionView(s, c.id))
          .filter((c) => c !== null);
      }),

    collection: (id) =>
      store.simulate(() => {
        const s = store.read();
        const collection = collectionView(s, id);
        if (collection === null) return null;
        const memories = live(s)
          .filter((m) => m.collectionIds.includes(id))
          .map((m) => memoryView(s, m, now()))
          .sort(newestFirst);
        return { collection, memories };
      }),

    createCollection: ({ title, description }) =>
      store.simulate(() => {
        const id = newId();
        const arts = ["sunrise", "sea", "night", "garden", "city", "coffee"] as const;
        const art = arts[store.read().moments.collections.length % arts.length] ?? "sunrise";
        store.update((s) => ({
          ...s,
          moments: {
            ...s.moments,
            collections: [
              ...s.moments.collections,
              { id, title: title.trim(), description: description.trim(), art },
            ],
          },
        }));
        const created = collectionView(store.read(), id);
        if (created === null) throw new Error("Collection not created");
        return created;
      }),

    deleteCollection: (id) =>
      store.simulate(() => {
        // The memories stay; only the collection goes (MEM-03).
        store.update((s) => ({
          ...s,
          moments: {
            ...s.moments,
            collections: s.moments.collections.map((c) =>
              c.id === id ? { ...c, deleted: true } : c,
            ),
          },
        }));
      }),

    setInCollection: (memoryId, collectionId, inIt) =>
      store.simulate(() => {
        patch(memoryId, (m) => ({
          ...m,
          collectionIds: inIt
            ? [...new Set([...m.collectionIds, collectionId])]
            : m.collectionIds.filter((c) => c !== collectionId),
        }));
      }),

    start: () => store.simulate(() => startDate(store.read()).toString()),
  };
}
