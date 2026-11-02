import { findArtwork } from "@/features/figures/art/artwork";
import type { FigureId, Mood, Occasion } from "@/features/figures/types";
import { widgetArtFiles } from "./widgetArtFiles";

/** The widget image for a character in a look, by the same lookup order as the app (P-45). */
export function widgetArt(
  id: FigureId,
  look: { mood: Mood; occasion: Occasion },
): number | undefined {
  return findArtwork(widgetArtFiles, id, look.mood, look.occasion, false);
}
