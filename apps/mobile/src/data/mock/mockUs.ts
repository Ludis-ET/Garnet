import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import type { DemoSignalEvent } from "@/data/fixtures/demoHome";
import type { SignalItem, UsRepository } from "@/data/repositories/types";
import { distanceKm } from "@/domain/distance";
import { coarsen, zonePoint } from "@/domain/location";
import { withDefaults } from "@/domain/settings";
import { SIGNAL_LOOK } from "@/domain/us";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import type { MockStore } from "./MockStore";
import { signalInstant, viewerOf } from "./viewer";

/**
 * How far apart (P-66): rounded locations, or the time-zone city when there's none. Null when
 * this person turned distance off or isn't paired yet. Shared by Us and the widgets (P-73).
 */
export function distanceOf(s: DemoState): { km: number; approximate: boolean } | null {
  const v = viewerOf(s);
  const paired = (s.pairing.byUser[v.userId] ?? EMPTY_PAIRING).partnerName !== null;
  const sharing = withDefaults(s.settings.byUser[v.userId]).location.share;
  const mineAt = s.settings.locations[v.userId] ?? null;
  const theirsAt = s.settings.locations[v.partnerId] ?? null;
  const a = mineAt ?? zonePoint(v.me.zone);
  const b = theirsAt ?? zonePoint(v.partner.zone);
  return !sharing || !paired || a === null || b === null
    ? null
    : { km: distanceKm(a, b), approximate: mineAt === null || theirsAt === null };
}

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
        return {
          me: v.me,
          partner: v.partner,
          distance: distanceOf(s),
          openSupport,
          recent: items.slice(0, 3),
        };
      }),

    history: () => store.simulate(() => all()),

    saveLocation: (point) =>
      store.simulate(() => {
        const id = viewerOf(store.read()).userId;
        // Rounded again here, so nothing finer than about 11 km is ever kept (P-66).
        const kept =
          point === null ? null : { ...coarsen(point.lat, point.lon), at: now().toString() };
        store.update((s) => ({
          ...s,
          settings: { ...s.settings, locations: { ...s.settings.locations, [id]: kept } },
        }));
      }),

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
