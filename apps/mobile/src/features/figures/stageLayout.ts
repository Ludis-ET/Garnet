/** Where each figure stands and how big it is drawn, per cast. Pure, so it is testable. */
import { RELATIVE_HEIGHT } from "./art/figure";
import { castMembers, type Cast, type FigureId } from "./types";

export interface StageLayout {
  /** Horizontal centre of each visible figure, as a fraction of the stage width. */
  positions: Partial<Record<FigureId, number>>;
  /** The tallest figure on stage fills this fraction of the stage height. */
  fill: number;
}

/** Ground line, as a fraction of the stage height from the top. */
export const GROUND = 0.96;

export function layoutFor(cast: Cast): StageLayout {
  switch (cast) {
    case "trio":
      return { positions: { sapphire: 0.2, garnet: 0.5, ruby: 0.8 }, fill: 0.84 };
    case "duo":
      return { positions: { sapphire: 0.3, ruby: 0.7 }, fill: 0.8 };
    case "ruby":
      return { positions: { ruby: 0.5 }, fill: 0.82 };
    case "sapphire":
      return { positions: { sapphire: 0.5 }, fill: 0.82 };
    case "garnet":
      return { positions: { garnet: 0.5 }, fill: 0.86 };
  }
}

/** Image frame height in points for a figure on a stage of `stageHeight` points. */
export function figureHeight(cast: Cast, id: FigureId, stageHeight: number): number {
  const layout = layoutFor(cast);
  const members = castMembers(cast);
  const tallest = Math.max(...members.map((m) => RELATIVE_HEIGHT[m]), RELATIVE_HEIGHT[id]);
  return stageHeight * layout.fill * (RELATIVE_HEIGHT[id] / tallest);
}

/** Horizontal position (0–1 of the stage width) of a figure, for the speech bubble. */
export function speakerAnchor(cast: Cast, speaker: FigureId): number {
  return layoutFor(cast).positions[speaker] ?? 0.5;
}

/** Who talks when the requested speaker is not on stage. */
export function resolveSpeaker(cast: Cast, wanted: FigureId): FigureId {
  const members = castMembers(cast);
  return members.includes(wanted) ? wanted : (members[0] ?? "garnet");
}
