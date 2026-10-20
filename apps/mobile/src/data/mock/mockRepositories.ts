import { Temporal } from "temporal-polyfill";
import { openLetter, viewLetter } from "@/domain/openWhen";
import type { DemoUser } from "@/domain/models";
import type { Repositories } from "@/data/repositories/types";
import type { MockStore } from "./MockStore";

function requireUser(store: MockStore, id: string): DemoUser {
  const user = store.read().users[id];
  if (user === undefined) throw new Error(`Unknown demo user ${id}`);
  return user;
}

/** Mock adapters. `now` is injectable so tests and reviews are deterministic. */
export function createMockRepositories(
  store: MockStore,
  now: () => Temporal.Instant = () => Temporal.Now.instant(),
): Repositories {
  const partnerId = () => {
    const { meId, relationship } = store.read();
    const other = relationship.partnerIds.find((id) => id !== meId);
    if (other === undefined) throw new Error("Demo relationship has no partner");
    return other;
  };

  return {
    relationship: {
      getMe: () => store.simulate(() => requireUser(store, store.read().meId)),
      getPartner: () => store.simulate(() => requireUser(store, partnerId())),
      getRelationship: () => store.simulate(() => store.read().relationship),
    },
    openWhen: {
      list: () =>
        store.simulate(() => {
          const { letters, meId } = store.read();
          return letters
            .map((l) => viewLetter(l, meId, now()))
            .filter((v) => v.kind !== "unavailable");
        }),
      get: (id) =>
        store.simulate(() => {
          const { letters, meId } = store.read();
          const letter = letters.find((l) => l.id === id);
          return letter === undefined
            ? { kind: "unavailable" as const, id }
            : viewLetter(letter, meId, now());
        }),
      open: (id) =>
        store.simulate(() => {
          const { letters, meId } = store.read();
          const letter = letters.find((l) => l.id === id);
          if (letter === undefined) return { ok: false as const, reason: "not-sealed" as const };
          const result = openLetter(letter, meId, now());
          if (!result.ok) return result;
          store.update((s) => ({
            ...s,
            letters: s.letters.map((l) => (l.id === id ? result.letter : l)),
          }));
          return { ok: true as const, view: viewLetter(result.letter, meId, now()) };
        }),
    },
  };
}
