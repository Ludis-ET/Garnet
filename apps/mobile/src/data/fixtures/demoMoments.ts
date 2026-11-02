/**
 * Demo Events, chapters and Memories (EVT-01 to EVT-09, MEM-01 to MEM-10). Fictional and
 * deterministic: one-off dates are "N days from today" and memories "N days ago", resolved when
 * read, so the prototype always looks current. Pictures are abstract gradient samples.
 */
import type { ChapterPromptId, EventKind, ReminderId, Repeat } from "@/domain/events";
import type { DemoArt, DemoMedia } from "./demoDays";

export interface DemoEventRecord {
  id: string;
  authorId: string;
  title: string;
  kind: EventKind;
  emoji: string;
  /** A fixed first date (ISO), or `inDays` from today for one-off fixtures. */
  date: string | null;
  inDays?: number;
  /** "HH:MM" in `zone`, for timed events. */
  time: string | null;
  zone: string | null;
  repeats: Repeat;
  /** Whose birthday: the user id. */
  whoseId: string | null;
  description: string;
  reminders: ReminderId[];
  art: DemoArt;
  deleted?: boolean;
}

export interface DemoChapterRecord {
  /** "YYYY-MM" */
  month: string;
  title: string;
  art: DemoArt;
}

export interface DemoReflection {
  authorId: string;
  text: string;
}

export interface DemoMemoryRecord {
  id: string;
  authorId: string;
  title: string;
  story: string;
  /** Days before today (fixtures) or a fixed ISO date (new memories). */
  daysAgo: number | null;
  date: string | null;
  place: string;
  media: DemoMedia | null;
  tags: string[];
  collectionIds: string[];
  deleted?: boolean;
}

export interface DemoCollectionRecord {
  id: string;
  title: string;
  description: string;
  art: DemoArt;
  deleted?: boolean;
}

export interface DemoMomentsState {
  events: DemoEventRecord[];
  chapters: DemoChapterRecord[];
  /** By month ("YYYY-MM"), then prompt. Optional, always skippable (EVT-07). */
  reflections: Record<string, Partial<Record<ChapterPromptId, DemoReflection[]>>>;
  memories: DemoMemoryRecord[];
  collections: DemoCollectionRecord[];
}

const wave = (seed: number): number[] =>
  Array.from({ length: 28 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin((i + 1) * seed)));

export function createDemoMoments(meId: string, partnerId: string): DemoMomentsState {
  return {
    events: [
      {
        id: "e-birthday",
        authorId: meId,
        title: "Noah's birthday",
        kind: "birthday",
        emoji: "🎂",
        date: "1996-11-02",
        time: null,
        zone: null,
        repeats: "yearly",
        whoseId: partnerId,
        description: "Breakfast call first thing his time.",
        reminders: ["weekBefore", "day"],
        art: "sea",
      },
      {
        id: "e-anniversary",
        authorId: partnerId,
        title: "Our anniversary",
        kind: "anniversary",
        emoji: "💜",
        date: "2024-11-14",
        time: "19:00",
        zone: "Europe/London",
        repeats: "yearly",
        whoseId: null,
        description: "Same restaurant, two cities, one call.",
        reminders: ["dayBefore", "day"],
        art: "sunrise",
      },
      {
        id: "e-visit",
        authorId: partnerId,
        title: "Noah lands in Addis",
        kind: "travel",
        emoji: "✈️",
        date: null,
        inDays: 53,
        time: "06:40",
        zone: "Africa/Addis_Ababa",
        repeats: "none",
        whoseId: null,
        description: "Ethiopian ET701. Bring the yellow scarf.",
        reminders: ["weekBefore", "dayBefore"],
        art: "city",
      },
      {
        id: "e-movie",
        authorId: meId,
        title: "Movie night on call",
        kind: "date",
        emoji: "🍿",
        date: null,
        inDays: 5,
        time: "20:00",
        zone: "Europe/London",
        repeats: "none",
        whoseId: null,
        description: "His pick this time.",
        reminders: ["day"],
        art: "night",
      },
      {
        id: "e-selam-bday",
        authorId: partnerId,
        title: "Selam's birthday",
        kind: "birthday",
        emoji: "🎂",
        date: "1997-03-21",
        time: null,
        zone: null,
        repeats: "yearly",
        whoseId: meId,
        description: "",
        reminders: ["weekBefore", "day"],
        art: "garden",
      },
    ],
    chapters: [
      { month: "2026-09", title: "London begins", art: "night" },
      { month: "2026-10", title: "Finding our rhythm", art: "sunrise" },
    ],
    reflections: {
      "2026-09": {
        moment: [
          { authorId: meId, text: "The first call where we both fell asleep." },
          { authorId: partnerId, text: "Your voice note from the airport." },
        ],
        learned: [
          { authorId: partnerId, text: "Mornings for you are evenings for me — and that's okay." },
        ],
      },
      "2026-10": {
        ahead: [{ authorId: meId, text: "December. The airport. You." }],
      },
    },
    collections: [
      {
        id: "c-apart",
        title: "First days apart",
        description: "The first weeks with a sea between us.",
        art: "night",
      },
      {
        id: "c-birthdays",
        title: "Birthdays",
        description: "Candles in two time zones.",
        art: "sunrise",
      },
      {
        id: "c-trips",
        title: "Trips",
        description: "Every time the distance got smaller.",
        art: "sea",
      },
      {
        id: "c-random",
        title: "Random moments",
        description: "The small, silly, perfect ones.",
        art: "coffee",
      },
    ],
    memories: [
      {
        id: "mem-airport",
        authorId: meId,
        title: "The airport goodbye",
        story: "You turned around three times. I counted.",
        daysAgo: 55,
        date: null,
        place: "Bole International",
        media: { type: "photo", art: "city" },
        tags: ["Us", "Firsts"],
        collectionIds: ["c-apart"],
      },
      {
        id: "mem-first-call",
        authorId: partnerId,
        title: "First call from London",
        story: "",
        daysAgo: 53,
        date: null,
        place: "",
        media: { type: "voice", seconds: 31, wave: wave(1.3) },
        tags: ["Calls", "Firsts"],
        collectionIds: ["c-apart"],
      },
      {
        id: "mem-quote",
        authorId: partnerId,
        title: "What you said",
        story: "“Distance is just a test to see how far love can travel.” — you, half asleep",
        daysAgo: 47,
        date: null,
        place: "",
        media: null,
        tags: ["Us"],
        collectionIds: ["c-apart", "c-random"],
      },
      {
        id: "mem-thames",
        authorId: partnerId,
        title: "Sunset on the Thames",
        story: "Sent you this before I even took my coat off.",
        daysAgo: 40,
        date: null,
        place: "South Bank, London",
        media: { type: "photo", art: "sunrise" },
        tags: ["Walks"],
        collectionIds: ["c-random"],
      },
      {
        id: "mem-coffee",
        authorId: meId,
        title: "Coffee ceremony for two",
        story: "I poured your cup anyway.",
        daysAgo: 33,
        date: null,
        place: "Home, Addis Ababa",
        media: { type: "video", art: "coffee", seconds: 18 },
        tags: ["Home", "Food"],
        collectionIds: ["c-random"],
      },
      {
        id: "mem-birthday-cake",
        authorId: meId,
        title: "Cake over video",
        story: "You blew out the candle on my screen.",
        daysAgo: 26,
        date: null,
        place: "",
        media: { type: "photo", art: "garden" },
        tags: ["Calls", "Silly"],
        collectionIds: ["c-birthdays"],
      },
      {
        id: "mem-rain",
        authorId: partnerId,
        title: "Rain on the bus window",
        story: "",
        daysAgo: 6,
        date: null,
        place: "Route 38",
        media: { type: "photo", art: "sea" },
        tags: ["Walks"],
        collectionIds: [],
      },
      {
        id: "mem-laugh",
        authorId: meId,
        title: "You laughing at my accent",
        story: "",
        daysAgo: 3,
        date: null,
        place: "",
        media: { type: "voice", seconds: 12, wave: wave(2.2) },
        tags: ["Silly", "Calls"],
        collectionIds: ["c-random"],
      },
      {
        id: "mem-stars",
        authorId: partnerId,
        title: "Same sky",
        story: "Checked: the moon looks the same from here.",
        daysAgo: 1,
        date: null,
        place: "",
        media: { type: "photo", art: "night" },
        tags: ["Us"],
        collectionIds: [],
      },
    ],
  };
}
