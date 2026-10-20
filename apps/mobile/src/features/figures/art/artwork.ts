/**
 * Which owner-supplied image (if any) to show for a figure, mood, occasion and talking frame
 * (P-44, P-45). Pure: takes the file map, so it is testable without bundling images.
 */
import type { FigureId, Mood, Occasion } from "../types";

/**
 * File names tried, most specific first:
 *   <id>-<mood>-<occasion>[-talk], <id>-<mood>[-talk], <id>-<occasion>, <id>-<mood>, <id>
 * Talking variants are tried only while the figure is speaking.
 */
export function artworkCandidates(
  id: FigureId,
  mood: Mood,
  occasion: Occasion,
  talking: boolean,
): string[] {
  const specific = `${id}-${mood}-${occasion}`;
  const plain = `${id}-${mood}`;
  // File keys are lower-cased when bundled (artworkFiles), so names match case-insensitively.
  return [
    ...(talking ? [`${specific}-talk`, `${plain}-talk`] : []),
    specific,
    `${id}-${occasion}`,
    plain,
    id,
  ].map((name) => name.toLowerCase());
}

/** The first image that exists, or undefined (the app shows a placeholder). */
export function findArtwork<T>(
  files: Readonly<Record<string, T>>,
  id: FigureId,
  mood: Mood,
  occasion: Occasion,
  talking: boolean,
): T | undefined {
  for (const key of artworkCandidates(id, mood, occasion, talking)) {
    const found = files[key];
    if (found !== undefined) return found;
  }
  return undefined;
}

/** The fusion and un-fusion animations (`fusion.gif`, `unfusion.gif`), when supplied. */
export function fusionArtwork<T>(
  files: Readonly<Record<string, T>>,
  kind: "fuse" | "unfuse",
): T | undefined {
  return files[kind === "fuse" ? "fusion" : "unfusion"];
}
