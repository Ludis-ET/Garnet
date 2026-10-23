import { Temporal } from "temporal-polyfill";
import type { DemoSignalEvent } from "@/data/fixtures/demoHome";
import type { SignalItem, UsRepository } from "@/data/repositories/types";
import { SIGNAL_LOOK } from "@/domain/us";
import type { MockStore } from "./MockStore";
import { signalInstant, viewerOf } from "./viewer";

/**
 * Mock adapter for UsRepository (US-01 to US-10). Signals are communication, not measurement:
 * nothing here counts, scores or claims the partner saw anything (§5). The partner's replies are
 * the only feedback ("I'm here"). Retention is open (U-09).
 */
export function createMockUs(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
): UsRepository {
  const item = (e: DemoSignalEvent, mine: boolean): SignalItem => ({
    id: e.id,
    signal: e.signal,
    mine,
    at: signalInstant(e, now()).toString(),
    payload: e.payload ?? {},
    responses: e.responses ?? [],
  });
  const all = (): SignalItem[] => {
    const s = store.read();
    return [
      ...s.home.sent.map((e) => item(e, true)),
      ...s.home.incoming.map((e) => item(e, false)),
    ].sort((a, b) =>
      Temporal.Instant.compare(Temporal.Instant.from(b.at), Temporal.Instant.from(a.at)),
    );
  };

  return {
    overview: () =>
      store.simulate(() => {
        const s = store.read();
        const v = viewerOf(s);
        const items = all();
        // The partner's latest support signal stays pinned until answered, or until the partner
        // says "I'm okay now" afterwards (US-05, US-09).
        const latestOkay = items.find((i) => !i.mine && i.signal === "okay-now");
        const openSupport =
          items.find(
            (i) =>
              !i.mine &&
              SIGNAL_LOOK[i.signal].support &&
              i.responses.length === 0 &&
              (latestOkay === undefined ||
                Temporal.Instant.compare(
                  Temporal.Instant.from(i.at),
                  Temporal.Instant.from(latestOkay.at),
                ) > 0),
          ) ?? null;
        return { me: v.me, partner: v.partner, openSupport, recent: items.slice(0, 3) };
      }),

    history: () => store.simulate(() => all()),

    send: (signal, payload) =>
      store.simulate(() => {
        const sentAt = now().toString();
        store.update((s) => ({
          ...s,
          home: { ...s.home, sent: [...s.home.sent, { id: newId(), signal, at: sentAt, payload }] },
        }));
        return { sentAt };
      }),

    respond: (id, response) =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          home: {
            ...s.home,
            incoming: s.home.incoming.map((e) =>
              e.id === id ? { ...e, responses: [...(e.responses ?? []), response] } : e,
            ),
            // Answering also clears it from Home's floating capsule on this phone.
            dismissed: s.home.dismissed.includes(id) ? s.home.dismissed : [...s.home.dismissed, id],
          },
        }));
      }),
  };
}
