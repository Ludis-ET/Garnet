/**
 * Occasion scenes: sky, props and particles. Colours here are art direction for the figure
 * stage (the palette comment in theme/tokens.ts allows raw colours in art), not UI tokens.
 */
import type { Occasion, ParticleSpec } from "./types";

export interface OccasionDef {
  label: string;
  emoji: string;
  /** Background gradient, top → middle → bottom. */
  sky: readonly [string, string, string];
  /** Aura and ground-glow colour around each figure. */
  baseGlow: string;
  particles: ParticleSpec[];
}

export const occasions: Record<Occasion, OccasionDef> = {
  everyday: {
    label: "Everyday",
    emoji: "💜",
    sky: ["#2A1B4A", "#1A1230", "#0D0B12"],
    baseGlow: "#9A7BFF",
    particles: [{ kind: "sparkles", count: 10 }],
  },
  together: {
    label: "Together",
    emoji: "💞",
    sky: ["#4A1F5C", "#2B1240", "#120A1C"],
    baseGlow: "#FF7AB8",
    particles: [
      { kind: "hearts", count: 8 },
      { kind: "sparkles", count: 8 },
    ],
  },
  morning: {
    label: "Morning",
    emoji: "☀️",
    sky: ["#9CC2FF", "#F9B9C4", "#FFD9B8"],
    baseGlow: "#FFC48A",
    particles: [{ kind: "orbs", count: 10 }],
  },
  goodnight: {
    label: "Goodnight",
    emoji: "🌙",
    sky: ["#060512", "#121040", "#1B1B5A"],
    baseGlow: "#7FA0FF",
    particles: [{ kind: "stars", count: 26 }],
  },
  cozy: {
    label: "Cozy",
    emoji: "🕯️",
    sky: ["#3A2116", "#22130E", "#120A08"],
    baseGlow: "#FFB25C",
    particles: [{ kind: "orbs", count: 12 }],
  },
  birthday: {
    label: "Birthday",
    emoji: "🎂",
    sky: ["#2F66F5", "#7B55F0", "#3D0E2A"],
    baseGlow: "#FFD45C",
    particles: [{ kind: "confetti", count: 30 }],
  },
  anniversary: {
    label: "Anniversary",
    emoji: "🌹",
    sky: ["#8E1F4F", "#4A0A1C", "#1B0A14"],
    baseGlow: "#FF5C7A",
    particles: [
      { kind: "petals", count: 18 },
      { kind: "hearts", count: 6 },
    ],
  },
  openWhen: {
    label: "Open When",
    emoji: "💌",
    sky: ["#5A4A9E", "#2A2250", "#15112A"],
    baseGlow: "#C9B6FF",
    particles: [{ kind: "orbs", count: 14 }],
  },
  memory: {
    label: "Memory",
    emoji: "📸",
    sky: ["#7A4A5A", "#3A2230", "#1C1218"],
    baseGlow: "#FFB8A0",
    particles: [{ kind: "sparkles", count: 12 }],
  },
  surprise: {
    label: "Surprise",
    emoji: "🎁",
    sky: ["#E8536F", "#6A2A8E", "#2A1660"],
    baseGlow: "#FF8FD0",
    particles: [
      { kind: "sparkles", count: 16 },
      { kind: "confetti", count: 10 },
    ],
  },
  reunion: {
    label: "Reunion",
    emoji: "✈️",
    sky: ["#3D2A7A", "#E8536F", "#FFB38A"],
    baseGlow: "#FFB38A",
    particles: [
      { kind: "hearts", count: 6 },
      { kind: "stars", count: 8 },
    ],
  },
  celebration: {
    label: "Celebration",
    emoji: "🎉",
    sky: ["#9A7BFF", "#3A1A60", "#1A1030"],
    baseGlow: "#FFD45C",
    particles: [
      { kind: "confetti", count: 24 },
      { kind: "stars", count: 8 },
    ],
  },
  spark: {
    label: "Spark",
    emoji: "🔥",
    sky: ["#B33A2E", "#4A0F1C", "#1A0814"],
    baseGlow: "#FF9A3C",
    particles: [{ kind: "sparkles", count: 26 }],
  },
  music: {
    label: "Music",
    emoji: "🎧",
    sky: ["#3A2A7A", "#14213D", "#0E0B1F"],
    baseGlow: "#4FD8FF",
    particles: [{ kind: "notes", count: 12 }],
  },
  winter: {
    label: "Winter",
    emoji: "❄️",
    sky: ["#7F9FE0", "#3A4F8E", "#1A2448"],
    baseGlow: "#CFE3FF",
    particles: [{ kind: "snow", count: 40 }],
  },
};
