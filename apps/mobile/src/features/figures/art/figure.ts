import type { FigureId } from "../types";

/**
 * Every character image is a portrait frame (2:3, e.g. 1024 × 1536) with the character standing
 * on the bottom edge (assets/characters/README.md). Width = height × FRAME_ASPECT.
 */
export const FRAME_ASPECT = 2 / 3;

/**
 * Standing height of each character relative to Garnet, so a group keeps true proportions:
 * Ruby and Sapphire are much shorter than Garnet.
 */
export const RELATIVE_HEIGHT: Record<FigureId, number> = { ruby: 0.62, sapphire: 0.66, garnet: 1 };
