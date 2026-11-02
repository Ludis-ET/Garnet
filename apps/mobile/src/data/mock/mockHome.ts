import { Temporal } from "temporal-polyfill";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import type { HomeRepository, HomeToday, MomentView } from "@/data/repositories/types";
import type { DemoEntry } from "@/data/fixtures/demoDays";
import type { DemoState } from "@/data/fixtures/demo";
import type { CompanionSource } from "@/data/repositories/types";
import type { SpecialDay } from "@/domain/companion";
import { nextDate } from "@/domain/events";
import { daysUntil, todayIn } from "@/domain/home";
import { viewLetter } from "@/domain/openWhen";
import type { MockStore } from "./MockStore";
import { memoryDate } from "./mockMemories";
import { entryInstant, viewerOf } from "./viewer";

/** Signals older than this no longer colour the characters. */
const SIGNAL_HOURS = 3;

/**
 * What the characters reflect (P-57). Own moments count whatever their visibility (they are the
 * viewer's own); the partner's count only when shared, so drafts and "after our days meet"
 * moments never show through a character (§4).
 */
export function companionsOf(
  s: DemoState,
  at: Temporal.Instant,
): { me: CompanionSource; partner: CompanionSource; special: SpecialDay | null } {
  const v = viewerOf(s);
  const feelingOf = (authorId: string, zone: string, mine: boolean) => {
    const today = todayIn(at, zone);
    const latest = s.days.entries
      .filter((e) => e.authorId === authorId && e.deleted !== true && e.mood !== undefined)
      .filter((e) => mine || e.visibility === "shared")
      .map((e) => ({ e, when: entryInstant(e, zone, at) }))
      .filter(({ when }) => Temporal.Instant.compare(when, at) <= 0)
      .filter(({ when }) => todayIn(when, zone).equals(today))
      .sort((a, b) => Temporal.Instant.compare(b.when, a.when))[0];
    return latest?.e.mood ?? null;
  };
  const recent = (events: DemoState["home"]["sent"]) => {
    const since = at.subtract({ hours: SIGNAL_HOURS });
    const latest = events
      .map((e) => ({
        e,
        when:
          e.at === null ? at.subtract({ minutes: e.minutesAgo ?? 0 }) : Temporal.Instant.from(e.at),
      }))
      .filter(({ when }) => Temporal.Instant.compare(when, since) >= 0)
      .sort((a, b) => Temporal.Instant.compare(b.when, a.when))[0];
    return latest?.e.signal ?? null;
  };
  const today = todayIn(at, v.me.zone);
  const special =
    s.moments.events
      .filter((e) => e.deleted !== true && (e.kind === "birthday" || e.kind === "anniversary"))
      .find((e) => {
        if (e.date === null) return false;
        return nextDate(Temporal.PlainDate.from(e.date), e.repeats, today)?.equals(today) === true;
      })?.kind ?? null;
  return {
    me: {
      zone: v.me.zone,
      feeling: feelingOf(v.userId, v.me.zone, true),
      signal: recent(s.home.sent),
    },
    partner: {
      zone: v.partner.zone,
      feeling: feelingOf(v.partnerId, v.partner.zone, false),
      signal: recent(s.home.incoming),
    },
    special: special === "birthday" || special === "anniversary" ? special : null,
  };
}

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

        // The next event from Events (EVT-01): one-offs resolve "N days from today".
        const upcoming = s.moments.events
          .filter((e) => e.deleted !== true)
          .map((e) => {
            const first =
              e.date === null
                ? today.add({ days: e.inDays ?? 0 })
                : Temporal.PlainDate.from(e.date);
            return { e, date: nextDate(first, e.repeats, today) };
          })
          .filter((x): x is { e: (typeof x)["e"]; date: Temporal.PlainDate } => x.date !== null)
          .sort((a, b) => Temporal.PlainDate.compare(a.date, b.date))[0];

        const waitingCount = s.letters.filter((l) => {
          const v = viewLetter(l, userId, at);
          return v.kind === "sealed" && v.viewerIsRecipient && v.eligible;
        }).length;
        const waiting = waitingCount > 0;
        // A different memory each day, from the ones you keep together.
        const kept = s.moments.memories.filter((m) => m.deleted !== true);
        const pick = kept[today.dayOfYear % Math.max(1, kept.length)];
        const memory =
          pick === undefined
            ? null
            : {
                id: pick.id,
                title: pick.title,
                art: pick.media === null || pick.media.type === "voice" ? null : pick.media.art,
                date: memoryDate(pick, today).toString(),
              };

        const latest = [...s.home.incoming].reverse().find((i) => !s.home.dismissed.includes(i.id));

        return {
          me: viewerOf(s).me,
          partner: { ...viewerOf(s).partner, name: partnerName },
          partnerActive:
            (s.pairing.byUser[userId] ?? EMPTY_PAIRING).partnerName !== null &&
            s.profiles.partner.ready,
          moments,
          waitingCount,
          memory,
          event:
            upcoming === undefined
              ? null
              : {
                  id: upcoming.e.id,
                  kind: upcoming.e.kind,
                  title: upcoming.e.title,
                  emoji: upcoming.e.emoji,
                  date: upcoming.date.toString(),
                  daysAway: daysUntil(today, upcoming.date),
                },
          waiting,
          incoming: latest === undefined ? null : { id: latest.id, signal: latest.signal },
          companions: companionsOf(s, at),
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
