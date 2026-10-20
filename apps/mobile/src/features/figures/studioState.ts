/** Figure studio state as a pure reducer (testable without rendering). */
import { moods } from "./moods";
import { sceneById, type SceneDef } from "./scenes";
import { resolveSpeaker } from "./stageLayout";
import {
  castMembers,
  CASTS,
  isOneOf,
  MOODS,
  OCCASIONS,
  type Cast,
  type FigureId,
  type Mood,
  type Occasion,
} from "./types";

export interface StudioState {
  sceneId: string | null;
  cast: Cast;
  moods: Record<FigureId, Mood>;
  occasion: Occasion;
  speaker: FigureId;
  line: string;
  bubble: boolean;
  /** Bumps whenever a new line should be spoken. */
  lineKey: number;
  fusion: { kind: "fuse" | "unfuse"; key: number } | null;
}

export type StudioAction =
  | { type: "scene"; id: string }
  | { type: "cast"; cast: Cast }
  | { type: "mood"; mood: Mood }
  | { type: "occasion"; occasion: Occasion }
  | { type: "bubble"; on: boolean }
  | { type: "replay" }
  | { type: "fuse" }
  | { type: "unfuse" };

export const FUSE_LINE = "Ruby and Sapphire, together as Garnet.";
export const UNFUSE_LINE = "Two gems, side by side again.";

function fromScene(scene: SceneDef, prev: Pick<StudioState, "bubble" | "lineKey">): StudioState {
  return {
    sceneId: scene.id,
    cast: scene.cast,
    moods: {
      ruby: scene.moods.ruby ?? "calm",
      sapphire: scene.moods.sapphire ?? "calm",
      garnet: scene.moods.garnet ?? "calm",
    },
    occasion: scene.occasion,
    speaker: resolveSpeaker(scene.cast, scene.speaker),
    line: scene.line,
    bubble: prev.bubble,
    lineKey: prev.lineKey + 1,
    fusion: null,
  };
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "scene": {
      const scene = sceneById(action.id);
      return scene === undefined ? state : fromScene(scene, state);
    }
    case "cast": {
      const speaker = resolveSpeaker(action.cast, state.speaker);
      return {
        ...state,
        sceneId: null,
        cast: action.cast,
        speaker,
        line: moods[state.moods[speaker]].line,
        lineKey: state.lineKey + 1,
        fusion: null,
      };
    }
    case "mood": {
      const next = { ...state.moods };
      for (const id of castMembers(state.cast)) next[id] = action.mood;
      return {
        ...state,
        sceneId: null,
        moods: next,
        line: moods[action.mood].line,
        lineKey: state.lineKey + 1,
      };
    }
    case "occasion":
      return { ...state, sceneId: null, occasion: action.occasion };
    case "bubble":
      return {
        ...state,
        bubble: action.on,
        lineKey: action.on ? state.lineKey + 1 : state.lineKey,
      };
    case "replay":
      return { ...state, lineKey: state.lineKey + 1 };
    case "fuse":
      if (state.cast !== "duo") return state;
      return {
        ...state,
        sceneId: null,
        cast: "garnet",
        speaker: "garnet",
        moods: { ...state.moods, garnet: "joyful" },
        line: FUSE_LINE,
        lineKey: state.lineKey + 1,
        fusion: { kind: "fuse", key: (state.fusion?.key ?? 0) + 1 },
      };
    case "unfuse":
      if (state.cast !== "garnet") return state;
      return {
        ...state,
        sceneId: null,
        cast: "duo",
        speaker: "ruby",
        moods: { ...state.moods, ruby: "happy", sapphire: "happy" },
        line: UNFUSE_LINE,
        lineKey: state.lineKey + 1,
        fusion: { kind: "unfuse", key: (state.fusion?.key ?? 0) + 1 },
      };
  }
}

/** Initial state, optionally from deep-link params (`/?scene=birthday&mood=…`). */
export function initialStudioState(
  params: Partial<Record<string, string | string[]>> = {},
): StudioState {
  const one = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sceneId = one("scene");
  const scene = sceneById(sceneId ?? "home") ?? sceneById("home");
  if (scene === undefined) throw new Error("home scene missing");
  const base = fromScene(scene, { bubble: true, lineKey: 0 });
  let state = base;
  const cast = one("cast");
  if (isOneOf(CASTS, cast)) state = studioReducer(state, { type: "cast", cast });
  const mood = one("mood");
  if (isOneOf(MOODS, mood)) state = studioReducer(state, { type: "mood", mood });
  const occasion = one("occasion");
  if (isOneOf(OCCASIONS, occasion)) state = studioReducer(state, { type: "occasion", occasion });
  if (one("bubble") === "off") state = studioReducer(state, { type: "bubble", on: false });
  return state;
}
