/**
 * Gentle whole-body motion for each mood, applied to the owner's character images (P-45), plus
 * one pure sampler so motion is testable without rendering.
 */
import type { Mood } from "./types";

export interface MotionSpec {
  /** Vertical float (fraction of the figure's height) and its frequency (Hz). */
  bob: number;
  bobHz: number;
  /** Side-to-side rock (degrees). */
  sway: number;
  swayHz: number;
  /** Little jumps (fraction of the figure's height). */
  hop: number;
  hopHz: number;
  /** Breathing scale amplitude. */
  breathe: number;
}

const still: MotionSpec = {
  bob: 0.004,
  bobHz: 0.35,
  sway: 0.8,
  swayHz: 0.2,
  hop: 0,
  hopHz: 0,
  breathe: 0.012,
};

export const moodMotion: Record<Mood, MotionSpec> = {
  calm: still,
  happy: { ...still, bob: 0.01, bobHz: 0.9, sway: 2, swayHz: 0.45 },
  joyful: { ...still, hop: 0.03, hopHz: 1.5, sway: 1.5, swayHz: 0.75 },
  loving: { ...still, bob: 0.008, bobHz: 0.5, sway: 2.5, swayHz: 0.35 },
  hello: { ...still, bob: 0.008, bobHz: 1, sway: 1.5, swayHz: 0.8 },
  hug: { ...still, sway: 2, swayHz: 0.3, breathe: 0.02 },
  thinking: { ...still, bob: 0.003, bobHz: 0.3 },
  listening: { ...still, bob: 0.004 },
  sleepy: { ...still, sway: 2, swayHz: 0.18, breathe: 0.026 },
  proud: { ...still, bob: 0.005, bobHz: 0.5 },
  celebrating: { ...still, hop: 0.04, hopHz: 1.8, sway: 2, swayHz: 0.9 },
  shy: { ...still, sway: 1.5, swayHz: 0.5 },
  surprised: { ...still, hop: 0.012, hopHz: 0.8 },
  dreamy: { ...still, bob: 0.01, bobHz: 0.3, sway: 2.5, swayHz: 0.25 },
  laughing: { ...still, hop: 0.012, hopHz: 2.4, sway: 2.5, swayHz: 1.2 },
  silly: { ...still, sway: 3, swayHz: 1.1, bob: 0.01, bobHz: 1.4 },
  dancing: { ...still, hop: 0.025, hopHz: 2, sway: 3, swayHz: 1 },
  sneaky: { ...still, sway: 1.2, swayHz: 0.6, bob: 0.004, bobHz: 0.6 },
};

export interface BodyMotion {
  /** Upward offset as a fraction of the figure's height (positive = higher). */
  lift: number;
  /** Rock in degrees. */
  sway: number;
  /** Breathing scale. */
  breathe: number;
}

const TAU = Math.PI * 2;

/**
 * Whole-body motion at time `t` (seconds). `phase` de-synchronises figures so a group never
 * moves like one machine. Under reduced motion the figure holds still (AGENTS.md: every
 * animation has a reduced-motion path): the result does not depend on time.
 */
export function sampleBody(
  motion: MotionSpec,
  t: number,
  reduceMotion: boolean,
  phase = 0,
): BodyMotion {
  "worklet";
  if (reduceMotion) return { lift: 0, sway: 0, breathe: 1 };
  const time = t + phase;
  const hop = motion.hop * Math.max(0, Math.sin(TAU * motion.hopHz * time));
  const bob = motion.bob * Math.sin(TAU * motion.bobHz * time);
  return {
    lift: hop + bob,
    sway: motion.sway * Math.sin(TAU * motion.swayHz * time),
    breathe: 1 + motion.breathe * Math.sin(TAU * 0.25 * time),
  };
}
