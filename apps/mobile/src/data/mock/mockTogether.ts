import type { Temporal } from "temporal-polyfill";
import type { TogetherRepository } from "@/data/repositories/types";
import { isSongLink } from "@/domain/surprises";
import { planProblem, whenKey, type PlanRecord } from "@/domain/together";
import type { MockStore } from "./MockStore";
import { viewerOf } from "./viewer";

/** Plans, places and songs (prompt 13) on the demo store; shared between the two of you. */
export function createMockTogether(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
): TogetherRepository {
  const who = () => viewerOf(store.read());
  const name = (authorId: string) => {
    const v = who();
    return authorId === v.userId ? "You" : v.partner.name;
  };
  const setPlans = (f: (p: PlanRecord[]) => PlanRecord[]) => {
    store.update((s) => ({ ...s, together: { ...s.together, plans: f(s.together.plans) } }));
  };
  const plan = (id: string) => {
    const p = store.read().together.plans.find((x) => x.id === id && x.deleted !== true);
    if (p === undefined) throw new Error("This plan isn't here anymore.");
    return p;
  };
  return {
    plans: () =>
      store.simulate(() =>
        store
          .read()
          .together.plans.filter((p) => p.deleted !== true)
          .sort((a, b) => whenKey(a.when).localeCompare(whenKey(b.when)))
          .map((p) => ({ ...p, by: name(p.authorId), mine: p.authorId === who().userId })),
      ),
    savePlan: (input) =>
      store.simulate(() => {
        const problem = planProblem(input);
        if (problem !== null) throw new Error(problem);
        if (input.id !== undefined) {
          const id = input.id;
          plan(id);
          setPlans((ps) =>
            ps.map((p) =>
              p.id === id
                ? {
                    ...p,
                    title: input.title.trim(),
                    note: input.note,
                    theme: input.theme,
                    art: input.art,
                    place: input.place,
                    when: input.when,
                  }
                : p,
            ),
          );
          return { id };
        }
        const id = newId();
        setPlans((ps) => [
          ...ps,
          {
            id,
            authorId: who().userId,
            title: input.title.trim(),
            note: input.note,
            theme: input.theme,
            art: input.art,
            place: input.place,
            when: input.when,
            doneAt: null,
          },
        ]);
        return { id };
      }),
    completePlan: (id) =>
      store.simulate(() => {
        plan(id);
        const today = now().toZonedDateTimeISO(who().me.zone).toPlainDate().toString();
        setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, doneAt: today } : p)));
      }),
    deletePlan: (id) =>
      store.simulate(() => {
        setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, deleted: true } : p)));
      }),
    places: () =>
      store.simulate(() =>
        store
          .read()
          .together.places.filter((p) => p.deleted !== true)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((p) => ({ ...p, by: name(p.authorId), mine: p.authorId === who().userId })),
      ),
    addPlace: (input) =>
      store.simulate(() => {
        if (input.name.trim().length === 0) throw new Error("Give the place a name.");
        const id = newId();
        const date = now().toZonedDateTimeISO(who().me.zone).toPlainDate().toString();
        store.update((s) => ({
          ...s,
          together: {
            ...s.together,
            places: [
              ...s.together.places,
              {
                id,
                authorId: who().userId,
                name: input.name.trim(),
                note: input.note,
                art: input.art,
                date,
              },
            ],
          },
        }));
        return { id };
      }),
    deletePlace: (id) =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          together: {
            ...s.together,
            places: s.together.places.map((p) => (p.id === id ? { ...p, deleted: true } : p)),
          },
        }));
      }),
    songs: () =>
      store.simulate(() =>
        store
          .read()
          .together.songs.filter((x) => x.deleted !== true)
          .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
          .map((x) => ({ ...x, by: name(x.authorId), mine: x.authorId === who().userId })),
      ),
    addSong: (input) =>
      store.simulate(() => {
        if (input.title.trim().length === 0) throw new Error("Give the song a title.");
        if (!isSongLink(input.link)) throw new Error("Use a full https:// link.");
        const id = newId();
        store.update((s) => ({
          ...s,
          together: {
            ...s.together,
            songs: [
              ...s.together.songs,
              {
                id,
                authorId: who().userId,
                title: input.title.trim(),
                artist: input.artist.trim(),
                link: input.link.trim(),
                note: input.note,
                addedAt: now().toString(),
              },
            ],
          },
        }));
        return { id };
      }),
    deleteSong: (id) =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          together: {
            ...s.together,
            songs: s.together.songs.map((x) => (x.id === id ? { ...x, deleted: true } : x)),
          },
        }));
      }),
  };
}
