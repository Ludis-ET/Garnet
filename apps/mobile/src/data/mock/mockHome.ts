import { Temporal } from "temporal-polyfill";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import type { HomeRepository, HomeToday, MomentView } from "@/data/repositories/types";
import type { DemoEntry } from "@/data/fixtures/demoDays";
import { daysUntil, nextOccurrence, todayIn } from "@/domain/home";
import { viewLetter } from "@/domain/openWhen";
import type { MockStore } from "./MockStore";
import { entryInstant } from "./viewer";

/**
 * Mock adapter for HomeRepository (HOME-01 to HOME-05). Only the viewer's own moments are
 * returned (the partner's day waits for the reveal, U-02/U-06); private drafts never leave this
 * person (day-log rule 4); a waiting letter is a flag with no content (A9); signals record
 * "sent" and nothing about delivery or reading (§5).
 */
export function createMockHome(
  store: MockStore,
  now: () => Temporal.Instant,
  newId: () => string,
): HomeRepository {
  const who = () => {
    const s = store.read();
    if (s.auth.status.kind !== "signedIn") throw new Error("Not signed in");
    const { userId } = s.auth.status;
    const account = s.auth.accounts.find((a) => a.userId === userId);
    const profile = s.profiles.byUser[userId] ?? newProfile(account?.displayName ?? "");
    const pairing = s.pairing.byUser[userId] ?? EMPTY_PAIRING;
    return { userId, profile, partnerName: pairing.partnerName ?? s.profiles.partner.name };
  };

  return {
    today: () =>
      store.simulate((): HomeToday => {
        const s = store.read();
        const { userId, profile, partnerName } = who();
        const zone = profile.timeZone ?? "UTC";
        const at = now();
        const today = todayIn(at, zone);
        // The same moments the Days timeline shows: this person's own, never deleted ones.
        const moments: MomentView[] = s.days.entries
          .filter((m) => m.authorId === userId && m.deleted !== true)
          .map((m) => ({
            id: m.id,
            text: m.text,
            emoji: m.emoji,
            visibility: m.visibility,
            at: entryInstant(m, zone, at).toString(),
          }))
          // Today in the viewer's zone, and nothing "later today" that hasn't happened yet.
          .filter((m) => {
            const when = Temporal.Instant.from(m.at);
            return todayIn(when, zone).equals(today) && Temporal.Instant.compare(when, at) <= 0;
          })
          .sort((a, b) =>
            Temporal.Instant.compare(Temporal.Instant.from(b.at), Temporal.Instant.from(a.at)),
          );

        const upcoming = s.home.events
          .map((e) => ({ e, date: nextOccurrence(e.monthDay, today) }))
          .sort((a, b) => Temporal.PlainDate.compare(a.date, b.date))[0];

        const waiting = s.letters.some((l) => {
          const v = viewLetter(l, userId, at);
          return v.kind === "sealed" && v.viewerIsRecipient && v.eligible;
        });

        const latest = [...s.home.incoming].reverse().find((i) => !s.home.dismissed.includes(i.id));

        return {
          me: { name: profile.nickname.trim() || profile.displayName, side: profile.side, zone },
          partner: {
            name: partnerName,
            side: s.profiles.partner.side,
            zone: s.profiles.partner.timeZone,
          },
          moments,
          event:
            upcoming === undefined
              ? null
              : {
                  title: upcoming.e.title,
                  emoji: upcoming.e.emoji,
                  date: upcoming.date.toString(),
                  daysAway: daysUntil(today, upcoming.date),
                },
          waiting,
          incoming: latest === undefined ? null : { id: latest.id, signal: latest.signal },
        };
      }),

    logMoment: ({ text, emoji, share }) =>
      store.simulate(() => {
        const { userId } = who();
        const moment: DemoEntry = {
          id: newId(),
          authorId: userId,
          kind: "text",
          text: text.trim(),
          emoji,
          dayOffset: 0,
          localTime: null,
          at: now().toString(),
          visibility: share ? "shared" : "private",
        };
        store.update((s) => ({ ...s, days: { ...s.days, entries: [...s.days.entries, moment] } }));
        return {
          id: moment.id,
          text: moment.text,
          emoji,
          at: now().toString(),
          visibility: moment.visibility,
        };
      }),

    sendSignal: (signal) =>
      store.simulate(() => {
        const sentAt = now().toString();
        store.update((s) => ({
          ...s,
          home: { ...s.home, sent: [...s.home.sent, { id: newId(), signal, at: sentAt }] },
        }));
        return { sentAt };
      }),

    dismissIncoming: (id) =>
      store.simulate(() => {
        store.update((s) => ({ ...s, home: { ...s.home, dismissed: [...s.home.dismissed, id] } }));
      }),
  };
}
