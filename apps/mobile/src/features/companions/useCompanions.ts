/**
 * The characters' looks right now (P-57): Ruby and Sapphire follow their own person's day,
 * Garnet follows both. Reads Home's companion data (the partner's only from what they shared).
 */
import { Temporal } from "temporal-polyfill";
import type { CompanionSource } from "@/data/repositories/types";
import {
  companionLook,
  dayMoment,
  garnetLook,
  type CompanionInput,
  type CompanionLook,
} from "@/domain/companion";
import type { GemSide } from "@/domain/identity";
import { useHomeToday } from "@/features/home/useHome";
import { useNow } from "@/features/setup/useNow";

export interface CompanionLooks {
  ruby: CompanionLook;
  sapphire: CompanionLook;
  garnet: CompanionLook;
  /** Which gem is the viewer (null before choosing). */
  mySide: GemSide | null;
  /** Both are using the app; until then only the viewer's own gem is shown (P-63). */
  partnerActive: boolean;
}

export function useCompanions(): CompanionLooks {
  const now = useNow();
  const today = useHomeToday().data;
  const c = today?.companions;
  const myZone = c?.me.zone ?? Temporal.Now.timeZoneId();
  const partnerZone = c?.partner.zone ?? myZone;
  const input = (zone: string, src: CompanionSource | undefined): CompanionInput => ({
    moment: dayMoment(now, zone),
    date: now.toZonedDateTimeISO(zone).toPlainDate(),
    feeling: src?.feeling ?? null,
    signal: src?.signal ?? null,
    special: c?.special ?? null,
  });
  const mine = input(myZone, c?.me);
  const theirs = input(partnerZone, c?.partner);
  const mySide = today?.me.side ?? null;
  const meLook = companionLook(mine);
  const partnerLook = companionLook(theirs);
  return {
    mySide,
    partnerActive: today?.partnerActive ?? false,
    ruby: mySide === "sapphire" ? partnerLook : meLook,
    sapphire: mySide === "sapphire" ? meLook : mySide === "ruby" ? partnerLook : meLook,
    garnet: garnetLook(mine, { feeling: theirs.feeling, signal: theirs.signal }),
  };
}
