import { Temporal } from "temporal-polyfill";
import type { SurprisesRepository } from "@/data/repositories/types";
import {
  cleanTitle,
  viewSurprise,
  type SurpriseRecord,
  type SurpriseView,
} from "@/domain/surprises";
import type { MockStore } from "./MockStore";
import { viewerOf } from "./viewer";

const newestFirst = (a: SurpriseRecord, b: SurpriseRecord) =>
  Temporal.Instant.compare(Temporal.Instant.from(b.createdAt), Temporal.Instant.from(a.createdAt));

/**
 * SUR-01 to SUR-07 on the demo store. Every read goes through viewSurprise, so the recipient
 * never receives a surprise's content before opening it, and a scheduling failure is the
 * sender's alone. Cancelling and retitling are provisional sender options (P-68).
 */
export function createMockSurprises(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
): SurprisesRepository {
  const me = () => viewerOf(store.read());
  const find = (id: string) => store.read().surprises.find((s) => s.id === id);
  const patch = (id: string, f: (s: SurpriseRecord) => SurpriseRecord) => {
    store.update((s) => ({ ...s, surprises: s.surprises.map((x) => (x.id === id ? f(x) : x)) }));
  };
  const view = (id: string): SurpriseView => {
    const s = find(id);
    return s === undefined ? { kind: "unavailable", id } : viewSurprise(s, me().userId, now());
  };
  return {
    list: () =>
      store.simulate(() => {
        const v = me();
        const items = [...store.read().surprises]
          .sort(newestFirst)
          .map((s) => viewSurprise(s, v.userId, now()))
          .filter((x) => x.kind !== "unavailable");
        return { partnerName: v.partner.name, items };
      }),
    get: (id) => store.simulate(() => view(id)),
    create: (input) =>
      store.simulate(() => {
        const v = me();
        const id = newId();
        const record: SurpriseRecord = {
          id,
          authorId: v.userId,
          recipientId: v.partnerId,
          content: input.content,
          safeTitle: cleanTitle(input.safeTitle),
          reveal: input.reveal,
          state: "scheduled",
          createdAt: now().toString(),
          openedAt: null,
        };
        store.update((s) => ({ ...s, surprises: [record, ...s.surprises] }));
        return { id };
      }),
    open: (id) =>
      store.simulate(() => {
        const current = view(id);
        // Only the recipient, and only once its time has come.
        if (current.kind !== "locked" || current.fromMe || !current.ready)
          throw new Error("This surprise can't be opened yet.");
        patch(id, (s) => ({ ...s, state: "opened", openedAt: now().toString() }));
        return view(id);
      }),
    cancel: (id) =>
      store.simulate(() => {
        const current = view(id);
        if (current.kind !== "locked" || !current.fromMe) throw new Error("Not yours to cancel.");
        patch(id, (s) => ({ ...s, state: "cancelled" }));
      }),
    retitle: (id, title) =>
      store.simulate(() => {
        const current = view(id);
        if (current.kind !== "locked" || !current.fromMe) throw new Error("Not yours to edit.");
        patch(id, (s) => ({ ...s, safeTitle: cleanTitle(title) }));
      }),
    retry: (id) =>
      store.simulate(() => {
        const current = view(id);
        if (current.kind !== "failed") throw new Error("Nothing to retry.");
        patch(id, (s) => ({ ...s, state: "scheduled" }));
      }),
  };
}
