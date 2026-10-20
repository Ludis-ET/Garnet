/**
 * Labels, particles and copy for each mood (the look itself comes from the owner's images, P-45). Lines are original app-voice copy (voice-and-copy.md), never
 * quotes from the show. Draft for review.
 */
import type { Mood, ParticleSpec } from "./types";

export interface MoodDef {
  label: string;
  emoji: string;
  particles: ParticleSpec[];
  line: string;
}

export const moods: Record<Mood, MoodDef> = {
  calm: {
    label: "Calm",
    emoji: "🌙",
    particles: [],
    line: "Just here, keeping you company.",
  },
  happy: {
    label: "Happy",
    emoji: "😊",
    particles: [{ kind: "sparkles", count: 6 }],
    line: "Today feels brighter with you in it.",
  },
  joyful: {
    label: "Joyful",
    emoji: "🤩",
    particles: [{ kind: "sparkles", count: 14 }],
    line: "Okay, this is the best news all week!",
  },
  loving: {
    label: "Loving",
    emoji: "🥰",
    particles: [{ kind: "hearts", count: 10 }],
    line: "Sending you all the love this little gem can hold.",
  },
  hello: {
    label: "Hello",
    emoji: "👋",
    particles: [],
    line: "Hi, gem! Come tell me about your day.",
  },
  hug: {
    label: "Hug",
    emoji: "🤗",
    particles: [{ kind: "orbs", count: 8 }],
    line: "Sending a hug across the miles.",
  },
  thinking: {
    label: "Thinking",
    emoji: "🤔",
    particles: [],
    line: "Hmm. What made you smile today?",
  },
  listening: {
    label: "Listening",
    emoji: "👂",
    particles: [],
    line: "Take your time. I'm listening.",
  },
  sleepy: {
    label: "Sleepy",
    emoji: "😴",
    particles: [{ kind: "zzz", count: 4 }],
    line: "Sleep well. Today's moments are safe here.",
  },
  proud: {
    label: "Proud",
    emoji: "✨",
    particles: [{ kind: "stars", count: 6 }],
    line: "Look how far you two have come.",
  },
  celebrating: {
    label: "Celebrating",
    emoji: "🎉",
    particles: [{ kind: "confetti", count: 18 }],
    line: "This calls for a tiny gem dance party!",
  },
  shy: {
    label: "Shy",
    emoji: "☺️",
    particles: [{ kind: "hearts", count: 3 }],
    line: "Oh! You made me blush a little.",
  },
  surprised: {
    label: "Surprised",
    emoji: "😮",
    particles: [{ kind: "sparkles", count: 8 }],
    line: "Wait, is that for me?",
  },
  dreamy: {
    label: "Dreamy",
    emoji: "💭",
    particles: [
      { kind: "hearts", count: 4 },
      { kind: "orbs", count: 6 },
    ],
    line: "Somewhere, two gems are thinking about each other.",
  },
  laughing: {
    label: "Laughing",
    emoji: "😂",
    particles: [{ kind: "sparkles", count: 10 }],
    line: "Stop, stop, I can't breathe. That was too good.",
  },
  silly: {
    label: "Silly",
    emoji: "🤪",
    particles: [{ kind: "confetti", count: 8 }],
    line: "Official announcement: today is a goofy day.",
  },
  dancing: {
    label: "Dancing",
    emoji: "💃",
    particles: [{ kind: "notes", count: 10 }],
    line: "One more song. Okay, two. Okay, the whole album.",
  },
  sneaky: {
    label: "Sneaky",
    emoji: "🤫",
    particles: [{ kind: "sparkles", count: 5 }],
    line: "I may or may not be planning a surprise.",
  },
};
