import type { Temporal } from "temporal-polyfill";
import type { CreateLetterInput, OpenWhenRepository } from "@/data/repositories/types";
import { openLetter, viewLetter, type OpenWhenView } from "@/domain/openWhen";
import type { OpenWhenLetter, UnlockRule } from "@/domain/models";
import type { MockStore } from "./MockStore";

/**
 * Mock adapter for Open When letters (spec §22, §61, A1, A2, A8, A9; prompts/09-open-when.md).
 * Enforces recipient-only visibility, draft privacy, and manual/date/event unlocking.
 */
export function createMockOpenWhen(
  store: MockStore,
  now: () => Temporal.Instant,
  localIdOf: () => string,
): OpenWhenRepository {
  const getMeAndPartner = () => {
    const { meId, relationship } = store.read();
    const partnerId = relationship.partnerIds.find((id) => id !== meId) ?? "demo-user-sapphire";
    return { meId, partnerId };
  };

  return {
    list: () =>
      store.simulate(() => {
        const { letters, meId } = store.read();
        return letters
          .map((l) => viewLetter(l, meId, now()))
          .filter(
            (v): v is Exclude<OpenWhenView, { kind: "unavailable" }> => v.kind !== "unavailable",
          );
      }),

    get: (id: string) =>
      store.simulate(() => {
        const { letters, meId } = store.read();
        const letter = letters.find((l) => l.id === id);
        return letter === undefined
          ? { kind: "unavailable" as const, id }
          : viewLetter(letter, meId, now());
      }),

    open: (id: string) =>
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

    createDraft: (input: CreateLetterInput) =>
      store.simulate(() => {
        const { meId, partnerId } = getMeAndPartner();
        const id = localIdOf();
        const newLetter: OpenWhenLetter = {
          id,
          authorId: meId,
          recipientId: partnerId,
          safePrompt: input.safePrompt,
          body: input.body,
          ...(input.paper === undefined ? {} : { paper: input.paper }),
          mediaRefs: input.mediaRefs ?? [],
          unlock: input.unlock ?? { type: "manual" },
          state: "draft",
          sealedAt: null,
          openedAt: null,
        };
        store.update((s) => ({
          ...s,
          letters: [newLetter, ...s.letters],
        }));
        return viewLetter(newLetter, meId, now());
      }),

    saveDraft: (id: string, patch: Partial<CreateLetterInput>) =>
      store.simulate(() => {
        const { meId } = getMeAndPartner();
        const existing = store.read().letters.find((l) => l.id === id);
        if (existing?.authorId !== meId || existing.state !== "draft") {
          return { kind: "unavailable" as const, id };
        }
        const updated: OpenWhenLetter = {
          ...existing,
          safePrompt: patch.safePrompt ?? existing.safePrompt,
          body: patch.body ?? existing.body,
          mediaRefs: patch.mediaRefs ?? existing.mediaRefs,
          unlock: patch.unlock ?? existing.unlock,
          ...(patch.paper === undefined ? {} : { paper: patch.paper }),
        };
        store.update((s) => ({
          ...s,
          letters: s.letters.map((l) => (l.id === id ? updated : l)),
        }));
        return viewLetter(updated, meId, now());
      }),

    seal: (id: string, unlock: UnlockRule) =>
      store.simulate(() => {
        const { meId } = getMeAndPartner();
        const existing = store.read().letters.find((l) => l.id === id);
        if (existing?.authorId !== meId || existing.state !== "draft") {
          return { kind: "unavailable" as const, id };
        }
        const sealed: OpenWhenLetter = {
          ...existing,
          unlock,
          state: "sealed",
          sealedAt: now().toString(),
        };
        store.update((s) => ({
          ...s,
          letters: s.letters.map((l) => (l.id === id ? sealed : l)),
        }));
        return viewLetter(sealed, meId, now());
      }),

    deleteLetter: (id: string) =>
      store.simulate(() => {
        const { meId } = getMeAndPartner();
        store.update((s) => ({
          ...s,
          letters: s.letters.filter(
            (l) => !(l.id === id && (l.authorId === meId || l.recipientId === meId)),
          ),
        }));
        return { ok: true };
      }),
  };
}
