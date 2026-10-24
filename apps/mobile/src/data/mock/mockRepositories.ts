import { Temporal } from "temporal-polyfill";
import { openLetter, viewLetter } from "@/domain/openWhen";
import type { DemoUser } from "@/domain/models";
import type { Repositories } from "@/data/repositories/types";
import type { MockStore } from "./MockStore";
import { createMockAuth } from "./mockAuth";
import { createMockPairing } from "./mockPairing";
import { createMockDays } from "./mockDays";
import { createMockHome } from "./mockHome";
import { createMockUs } from "./mockUs";
import { PROVISIONAL_DAY_POLICY } from "@/domain/days";
import { createMockSetup } from "./mockSetup";
import { INVITE_POLICY_P18 } from "@/domain/pairing";
import { createMockChat } from "./mockChat";

function requireUser(store: MockStore, id: string): DemoUser {
  const user = store.read().users[id];
  if (user === undefined) throw new Error(`Unknown demo user ${id}`);
  return user;
}

/**
 * Mock adapters. `now` and `random` are injectable so tests and reviews are deterministic.
 * Invitations use P-18 (proposed) explicitly.
 */
export function createMockRepositories(
  store: MockStore,
  now: () => Temporal.Instant = () => Temporal.Now.instant(),
  random: () => number = Math.random,
): Repositories {
  let localId = 0;
  // Prototype ids; the real client generates UUIDv7 (ADR-0003).
  const localIdOf = () => {
    localId += 1;
    return `local-${now().epochMilliseconds}-${localId}`;
  };
  const partnerId = () => {
    const { meId, relationship } = store.read();
    const other = relationship.partnerIds.find((id) => id !== meId);
    if (other === undefined) throw new Error("Demo relationship has no partner");
    return other;
  };

  return {
    auth: createMockAuth(store, now),
    pairing: createMockPairing(store, now, random, INVITE_POLICY_P18),
    setup: createMockSetup(store),
    home: createMockHome(store, now, localIdOf),
    // The shared-day cutoff (U-02) and recap timing (U-06) are open: a provisional policy,
    // passed explicitly and labelled as provisional on screen (DAYS-10).
    days: createMockDays(store, now, localIdOf, PROVISIONAL_DAY_POLICY),
    us: createMockUs(store, now, localIdOf),
    chat: createMockChat(store, now, localIdOf),
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
