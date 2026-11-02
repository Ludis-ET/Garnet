/**
 * Which image each character shows, from the time of day, the date and the person's own day
 * (owner direction P-57). Pure: no React, no I/O.
 *
 * - Characters only ever look warm: there are no sad, angry or abandoned moods (AGENTS.md §5,
 *   voice-and-copy "the worst a character does is nap"). A low or stressed day shows a hug.
 * - A partner's character only reflects what that partner already shared (a shared moment or a
 *   signal); private drafts never reach this function (§4).
 * - Moods and occasions match the owner's image names (assets/characters/README.md); a missing
 *   file falls back to the plain mood, then the character (artworkCandidates).
 */
import type { SignalId } from "@garnet/domain";
import type { Temporal } from "temporal-polyfill";
import type { Mood, Occasion } from "@/features/figures/types";
import type { FeelingId } from "./days";

export type DayMoment = "morning" | "day" | "evening" | "night";

/** 05–11 morning, 11–17 day, 17–21 evening, 21–05 night, in that person's own zone. */
export function dayMoment(now: Temporal.Instant, zone: string): DayMoment {
  const h = now.toZonedDateTimeISO(zone).hour;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export type SpecialDay = "birthday" | "anniversary";

export interface CompanionInput {
  moment: DayMoment;
  /** Today's date in that person's zone (gives each day its own everyday look). */
  date: Temporal.PlainDate;
  /** Their latest feeling today, from a moment they logged (own) or shared (partner). */
  feeling: FeelingId | null;
  /** Their latest signal in the last few hours. */
  signal: SignalId | null;
  /** A birthday or anniversary today. */
  special: SpecialDay | null;
}

export interface CompanionLook {
  mood: Mood;
  occasion: Occasion;
}

const FEELING_MOOD: Record<FeelingId, Mood> = {
  calm: "calm",
  happy: "happy",
  excited: "dancing",
  loved: "loving",
  tired: "sleepy",
  busy: "thinking",
  // Never sad: a hard day shows the character offering a hug.
  stressed: "hug",
  low: "hug",
};

const SIGNAL_MOOD: Record<SignalId, Mood> = {
  "thought-of-you": "loving",
  "missing-you": "hug",
  "need-you": "hug",
  "need-to-talk": "listening",
  "just-listen": "listening",
  "check-on-me": "shy",
  "cant-talk-yet": "calm",
  "okay-now": "happy",
};

/** Everyday daytime looks, one per day of the week, so the pictures change from day to day. */
const EVERYDAY: readonly Mood[] = [
  "happy",
  "joyful",
  "proud",
  "laughing",
  "silly",
  "dreamy",
  "surprised",
];

const MOMENT_LOOK: Record<Exclude<DayMoment, "day">, CompanionLook> = {
  morning: { mood: "hello", occasion: "morning" },
  evening: { mood: "calm", occasion: "cozy" },
  night: { mood: "sleepy", occasion: "goodnight" },
};

/**
 * The look, most meaningful first: a special day, then a recent signal, then today's feeling,
 * then the time of day (with a different everyday mood for each day of the week).
 */
export function companionLook(input: CompanionInput): CompanionLook {
  if (input.special === "birthday") return { mood: "celebrating", occasion: "birthday" };
  if (input.special === "anniversary") return { mood: "loving", occasion: "anniversary" };
  if (input.signal !== null) return { mood: SIGNAL_MOOD[input.signal], occasion: "everyday" };
  if (input.feeling !== null) return { mood: FEELING_MOOD[input.feeling], occasion: "everyday" };
  if (input.moment !== "day") return MOMENT_LOOK[input.moment];
  // Weekends get the playful looks (Saturday "silly", Sunday "dreamy").
  const mood = EVERYDAY[(input.date.dayOfWeek - 1) % EVERYDAY.length] ?? "happy";
  return { mood, occasion: "everyday" };
}

/** Garnet is both of them: a special day, a hug if either needs one, else the shared moment. */
export function garnetLook(
  me: CompanionInput,
  partner: Pick<CompanionInput, "feeling" | "signal">,
): CompanionLook {
  if (me.special !== null) return companionLook(me);
  const support: readonly SignalId[] = ["need-you", "missing-you", "check-on-me"];
  const hugs = [me.signal, partner.signal].some((s) => s !== null && support.includes(s));
  const low = [me.feeling, partner.feeling].some((f) => f === "low" || f === "stressed");
  if (hugs || low) return { mood: "hug", occasion: "together" };
  if (me.signal === "thought-of-you" || partner.signal === "thought-of-you")
    return { mood: "loving", occasion: "together" };
  return companionLook({ ...me, feeling: null, signal: null });
}
