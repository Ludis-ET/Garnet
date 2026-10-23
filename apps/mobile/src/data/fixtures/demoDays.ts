/**
 * Demo Days data (DAYS-01 to DAYS-11, HOME-01). Fictional and deterministic: each moment recurs
 * at a local time on "N days ago" in its author's zone, so the week always looks lived-in.
 * Covers every entry kind and visibility, an upload in progress and a failed one.
 */
import type { ActivityId, EntryKind, FeelingId, Visibility } from "@/domain/days";

export type DemoArt = "sunrise" | "sea" | "night" | "garden" | "city" | "coffee";

export type DemoMedia =
  | { type: "photo"; art: DemoArt }
  | { type: "video"; art: DemoArt; seconds: number }
  | { type: "voice"; seconds: number; wave: readonly number[] };

export interface DemoEntry {
  id: string;
  authorId: string;
  kind: EntryKind;
  text: string;
  emoji: string;
  /** Fixtures: days before the author's today, at `localTime` in the author's zone. */
  dayOffset: number;
  localTime: string | null;
  /** Entries logged in the prototype carry their instant instead. */
  at: string | null;
  visibility: Visibility;
  media?: DemoMedia;
  mood?: FeelingId;
  activity?: ActivityId;
  place?: string;
  /** Simulated upload states (DAYS-02). */
  upload?: "uploading" | "failed";
  deleted?: boolean;
}

/** Who finished each shared day ("ready" for the reveal), by days ago, then by date. */
export interface DemoReadiness {
  byOffset: Record<number, { me: boolean; partner: boolean }>;
  byDate: Record<string, { me: boolean; partner: boolean }>;
}

export interface DemoDaysState {
  entries: DemoEntry[];
  ready: DemoReadiness;
}

const wave = (seed: number): number[] =>
  Array.from({ length: 28 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin((i + 1) * seed)));

export function createDemoDays(meId: string, partnerId: string): DemoDaysState {
  const me = (e: Omit<DemoEntry, "authorId" | "at">): DemoEntry => ({
    ...e,
    authorId: meId,
    at: null,
  });
  const noah = (e: Omit<DemoEntry, "authorId" | "at">): DemoEntry => ({
    ...e,
    authorId: partnerId,
    at: null,
  });
  return {
    entries: [
      // Today (mine).
      me({
        id: "m-coffee",
        kind: "activity",
        activity: "coffee",
        text: "First coffee",
        emoji: "☕",
        dayOffset: 0,
        localTime: "08:12",
        visibility: "shared",
      }),
      me({
        id: "m-work",
        kind: "work",
        text: "Arrived at work",
        emoji: "💼",
        dayOffset: 0,
        localTime: "09:03",
        visibility: "shared",
      }),
      me({
        id: "m-sky",
        kind: "photo",
        text: "The sky over Bole this morning",
        emoji: "📸",
        dayOffset: 0,
        localTime: "10:40",
        visibility: "afterReveal",
        media: { type: "photo", art: "sunrise" },
      }),
      me({
        id: "m-meeting",
        kind: "feeling",
        mood: "stressed",
        text: "This meeting is taking forever",
        emoji: "😮‍💨",
        dayOffset: 0,
        localTime: "11:47",
        visibility: "shared",
      }),
      me({
        id: "m-lunch",
        kind: "food",
        text: "Lunch by the window",
        emoji: "🍝",
        dayOffset: 0,
        localTime: "13:15",
        visibility: "private",
      }),
      me({
        id: "m-voice",
        kind: "voice",
        text: "A little hello",
        emoji: "🎙️",
        dayOffset: 0,
        localTime: "15:42",
        visibility: "shared",
        media: { type: "voice", seconds: 14, wave: wave(1.7) },
      }),
      me({
        id: "m-walk",
        kind: "video",
        text: "Walk home",
        emoji: "🎬",
        dayOffset: 0,
        localTime: "18:06",
        visibility: "shared",
        media: { type: "video", art: "city", seconds: 23 },
        upload: "uploading",
      }),
      // Today (Noah): one shared, one waiting for the reveal, one private draft that never shows.
      noah({
        id: "n-run",
        kind: "activity",
        activity: "outside",
        text: "Morning run by the river",
        emoji: "🌳",
        dayOffset: 0,
        localTime: "07:05",
        visibility: "shared",
      }),
      noah({
        id: "n-desk",
        kind: "photo",
        text: "New plant on my desk",
        emoji: "📸",
        dayOffset: 0,
        localTime: "10:20",
        visibility: "afterReveal",
        media: { type: "photo", art: "garden" },
      }),
      noah({
        id: "n-draft",
        kind: "text",
        text: "Draft I'm not ready to share",
        emoji: "✏️",
        dayOffset: 0,
        localTime: "12:00",
        visibility: "private",
      }),
      // Yesterday: I finished, the days haven't met yet.
      me({
        id: "m-y1",
        kind: "food",
        text: "Injera with my sister",
        emoji: "🍽️",
        dayOffset: 1,
        localTime: "19:30",
        visibility: "afterReveal",
      }),
      me({
        id: "m-y2",
        kind: "place",
        place: "Entoto Park",
        text: "Up the hill at sunset",
        emoji: "📍",
        dayOffset: 1,
        localTime: "17:45",
        visibility: "afterReveal",
        media: { type: "photo", art: "sunrise" },
      }),
      me({
        id: "m-y3",
        kind: "photo",
        text: "Macchiato break",
        emoji: "📸",
        dayOffset: 1,
        localTime: "12:10",
        visibility: "shared",
        media: { type: "photo", art: "coffee" },
        upload: "failed",
      }),
      noah({
        id: "n-y1",
        kind: "work",
        text: "Long day at the studio",
        emoji: "💼",
        dayOffset: 1,
        localTime: "18:40",
        visibility: "afterReveal",
      }),
      noah({
        id: "n-y2",
        kind: "text",
        text: "Thinking about our trip",
        emoji: "✏️",
        dayOffset: 1,
        localTime: "21:10",
        visibility: "shared",
      }),
      // Two days ago: revealed.
      me({
        id: "m-2a",
        kind: "activity",
        activity: "gym",
        text: "Gym before work",
        emoji: "🏋️",
        dayOffset: 2,
        localTime: "06:50",
        visibility: "afterReveal",
      }),
      me({
        id: "m-2b",
        kind: "feeling",
        mood: "happy",
        text: "Good news from the team",
        emoji: "😊",
        dayOffset: 2,
        localTime: "14:05",
        visibility: "afterReveal",
      }),
      me({
        id: "m-2c",
        kind: "voice",
        text: "Singing along in the taxi",
        emoji: "🎙️",
        dayOffset: 2,
        localTime: "18:20",
        visibility: "afterReveal",
        media: { type: "voice", seconds: 21, wave: wave(2.3) },
      }),
      noah({
        id: "n-2a",
        kind: "photo",
        text: "Rain on the bus window",
        emoji: "📸",
        dayOffset: 2,
        localTime: "08:15",
        visibility: "afterReveal",
        media: { type: "photo", art: "sea" },
      }),
      noah({
        id: "n-2b",
        kind: "food",
        text: "Made your recipe, almost right",
        emoji: "🍲",
        dayOffset: 2,
        localTime: "19:45",
        visibility: "afterReveal",
      }),
      noah({
        id: "n-2c",
        kind: "feeling",
        mood: "loved",
        text: "Your voice note made my day",
        emoji: "🥰",
        dayOffset: 2,
        localTime: "20:30",
        visibility: "afterReveal",
      }),
      // Three days ago: revealed.
      me({
        id: "m-3a",
        kind: "activity",
        activity: "study",
        text: "Two chapters done",
        emoji: "📚",
        dayOffset: 3,
        localTime: "16:00",
        visibility: "afterReveal",
      }),
      me({
        id: "m-3b",
        kind: "photo",
        text: "Coffee ceremony at home",
        emoji: "📸",
        dayOffset: 3,
        localTime: "18:30",
        visibility: "shared",
        media: { type: "photo", art: "coffee" },
      }),
      noah({
        id: "n-3a",
        kind: "video",
        text: "Street musicians on the South Bank",
        emoji: "🎬",
        dayOffset: 3,
        localTime: "13:20",
        visibility: "shared",
        media: { type: "video", art: "city", seconds: 31 },
      }),
      noah({
        id: "n-3b",
        kind: "feeling",
        mood: "tired",
        text: "Early night",
        emoji: "😴",
        dayOffset: 3,
        localTime: "22:05",
        visibility: "afterReveal",
      }),
      // Four and five days ago: revealed.
      me({
        id: "m-4a",
        kind: "place",
        place: "Addis Merkato",
        text: "Market with Mum",
        emoji: "📍",
        dayOffset: 4,
        localTime: "11:00",
        visibility: "afterReveal",
      }),
      noah({
        id: "n-4a",
        kind: "activity",
        activity: "commute",
        text: "Train delayed again",
        emoji: "🚇",
        dayOffset: 4,
        localTime: "08:40",
        visibility: "shared",
      }),
      me({
        id: "m-5a",
        kind: "photo",
        text: "Night lights from the balcony",
        emoji: "📸",
        dayOffset: 5,
        localTime: "21:15",
        visibility: "afterReveal",
        media: { type: "photo", art: "night" },
      }),
      noah({
        id: "n-5a",
        kind: "voice",
        text: "Goodnight from London",
        emoji: "🎙️",
        dayOffset: 5,
        localTime: "23:00",
        visibility: "afterReveal",
        media: { type: "voice", seconds: 9, wave: wave(3.1) },
      }),
    ],
    ready: {
      byOffset: {
        1: { me: true, partner: false },
        2: { me: true, partner: true },
        3: { me: true, partner: true },
        4: { me: true, partner: true },
        5: { me: true, partner: true },
        6: { me: true, partner: true },
      },
      byDate: {},
    },
  };
}
