import { Temporal } from "temporal-polyfill";
import type { DemoState } from "@/data/fixtures/demo";
import { DEMO_PARTNER_ID } from "@/data/fixtures/demo";
import type { DemoEntry } from "@/data/fixtures/demoDays";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import type { HomePerson } from "@/data/repositories/types";
import { atLocalTime, todayIn } from "@/domain/home";
import { otherSide } from "@/domain/identity";

/**
 * Who is looking, for the Home, Days and Us mocks: the signed-in person and their partner (the
 * fictional Noah), with names, sides and zones. Throws when nobody is signed in.
 */
export function viewerOf(s: DemoState): {
  userId: string;
  me: HomePerson;
  partner: HomePerson;
  partnerId: string;
} {
  if (s.auth.status.kind !== "signedIn") throw new Error("Not signed in");
  const { userId } = s.auth.status;
  const account = s.auth.accounts.find((a) => a.userId === userId);
  const profile = s.profiles.byUser[userId] ?? newProfile(account?.displayName ?? "");
  const pairing = s.pairing.byUser[userId] ?? EMPTY_PAIRING;
  return {
    userId,
    partnerId: DEMO_PARTNER_ID,
    me: {
      name: profile.nickname.trim() || profile.displayName,
      side: profile.side,
      zone: profile.timeZone ?? "UTC",
      avatar: profile.avatar,
    },
    partner: {
      name: pairing.partnerName ?? s.profiles.partner.name,
      // P-51: the two sides never match, so once this person has chosen, the partner is the
      // other gem even before their own setup finishes (P-57).
      side: s.profiles.partner.side ?? (profile.side === null ? null : otherSide(profile.side)),
      zone: s.profiles.partner.timeZone,
      avatar: { kind: "initials", swatch: 1 },
    },
  };
}

/** When an entry happened: its own instant, or its recurring local time "N days ago". */
export function entryInstant(
  entry: DemoEntry,
  authorZone: string,
  now: Temporal.Instant,
): Temporal.Instant {
  if (entry.at !== null) return Temporal.Instant.from(entry.at);
  const day = todayIn(now, authorZone).subtract({ days: entry.dayOffset });
  return entry.localTime === null ? now : atLocalTime(day, entry.localTime, authorZone);
}

/** When a seeded signal happened ("N minutes ago") or its own instant. */
export function signalInstant(
  e: { at: string | null; minutesAgo?: number },
  now: Temporal.Instant,
): Temporal.Instant {
  return e.at !== null ? Temporal.Instant.from(e.at) : now.subtract({ minutes: e.minutesAgo ?? 0 });
}
