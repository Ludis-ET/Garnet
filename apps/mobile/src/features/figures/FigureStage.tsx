/**
 * The figure stage: Ruby, Sapphire and Garnet from the owner's images (P-45), with mood motion,
 * occasion particles, an aura and soft shadow, talking variants, tap-to-hop and the Ruby +
 * Sapphire fusion. Missing images show a neutral gem placeholder. Body motion runs on the UI
 * thread (Reanimated); reduced motion holds every figure still and swaps instantly.
 */
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { AppText } from "@/components/ui/AppText";
import { findArtwork, fusionArtwork } from "./art/artwork";
import { artworkFiles } from "./art/artworkFiles";
import { FRAME_ASPECT } from "./art/figure";
import { Particles, seedParticles } from "./art/Particles";
import { moods as moodDefs } from "./moods";
import { occasions } from "./occasions";
import { moodMotion, sampleBody } from "./poses";
import { figureHeight, GROUND, layoutFor } from "./stageLayout";
import {
  castMembers,
  FIGURES,
  figureNames,
  type Cast,
  type FigureId,
  type Mood,
  type Occasion,
  type ParticleSpec,
} from "./types";
import { useSvgId } from "@/components/brand/svgId";

export interface FusionCue {
  kind: "fuse" | "unfuse";
  key: number;
}

export interface FigureStageProps {
  cast: Cast;
  moods: Record<FigureId, Mood>;
  occasion: Occasion;
  /** Figure that uses its talking image variant after a new line. */
  speaker: FigureId;
  /** Changes when a new line is spoken; null while the speech bubble is off. */
  talkKey: number | null;
  fusion: FusionCue | null;
  reduceMotion: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

const PHASE: Record<FigureId, number> = { sapphire: 0.37, garnet: 0, ruby: 0.71 };
const GEM: Record<FigureId, readonly [string, string]> = {
  ruby: ["#FF6F8E", "#C0123A"],
  sapphire: ["#8FB0FF", "#2F5BEA"],
  garnet: ["#C9B6FF", "#7B55F0"],
};
/** UI frame tick for talking variants. */
const TICK_MS = 150;
/** How many ticks a figure "talks" after a new line. */
const TALK_TICKS = 13;
/** How many points a tap lifts the figures. */
const HOP = 16;
/** How long a supplied fusion animation stays on screen. */
const FUSION_MS = 2600;

function useTicker(ms: number, enabled: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setN((v) => v + 1);
    }, ms);
    return () => {
      clearInterval(id);
    };
  }, [ms, enabled]);
  return n;
}

/** Pauses animation while the app is in the background (battery). */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
    });
    return () => {
      sub.remove();
    };
  }, []);
  return active;
}

/** Shown until the owner adds that character's image: a faceted gem and the name. */
function FigurePlaceholder({ id, width, height }: { id: FigureId; width: number; height: number }) {
  const [light, deep] = GEM[id];
  const s = Math.min(width * 0.7, height * 0.42);
  const gemId = useSvgId(`gem-${id}`);
  return (
    <View style={[styles.placeholder, { width, height }]}>
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gemId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="1" stopColor={deep} />
          </LinearGradient>
        </Defs>
        <Path d="M50,4 L88,34 L72,92 H28 L12,34Z" fill={`url(#${gemId})`} />
        <Path
          d="M12,34 H88 M50,4 L34,34 L50,92 L66,34Z M28,92 L34,34 M72,92 L66,34"
          stroke="#FFFFFF"
          strokeOpacity={0.45}
          strokeWidth={1.6}
          fill="none"
        />
      </Svg>
      <AppText variant="caption" color="textSecondary" style={styles.placeholderName}>
        {figureNames[id]}
      </AppText>
    </View>
  );
}

interface SlotProps {
  id: FigureId;
  cast: Cast;
  mood: Mood;
  occasion: Occasion;
  talking: boolean;
  width: number;
  height: number;
  time: SharedValue<number>;
  hop: SharedValue<number>;
  fusion: FusionCue | null;
  reduceMotion: boolean;
}

function FigureSlot(props: SlotProps) {
  const { id, cast, mood, width: W, height: H, time, hop, fusion, reduceMotion } = props;
  const fraction = layoutFor(cast).positions[id];
  const onStage = fraction !== undefined;
  // Keep a figure at its last on-stage size while it leaves.
  const [shownCast, setShownCast] = useState(cast);
  if (onStage && shownCast !== cast) setShownCast(cast);
  const drawCast = onStage ? cast : shownCast;
  const figureH = figureHeight(drawCast, id, H);
  const figureW = figureH * FRAME_ASPECT;
  const artwork = findArtwork(artworkFiles, id, mood, props.occasion, props.talking);
  const def = occasions[props.occasion];

  const x = useSharedValue(onStage ? fraction * W : W / 2);
  const presence = useSharedValue(onStage ? 1 : 0);
  const spin = useSharedValue(0);
  const lastFusion = useRef<number | null>(null);

  useEffect(() => {
    if (W === 0) return;
    const target = fraction === undefined ? W / 2 : fraction * W;
    const fresh = fusion !== null && fusion.key !== lastFusion.current;
    lastFusion.current = fusion?.key ?? null;
    if (reduceMotion) {
      x.set(target);
      presence.set(onStage ? 1 : 0);
      spin.set(0);
      return;
    }
    const ease = { easing: Easing.inOut(Easing.cubic) };
    if (fresh && fusion.kind === "fuse") {
      if (id === "garnet") {
        x.set(W / 2);
        presence.set(0);
        spin.set(-360);
        presence.set(withDelay(780, withSpring(1, { damping: 10, stiffness: 140 })));
        spin.set(withDelay(780, withTiming(0, { duration: 650, ...ease })));
      } else {
        x.set(withTiming(W / 2, { duration: 850, ...ease }));
        spin.set(withSequence(withTiming(720, { duration: 900 }), withTiming(0, { duration: 0 })));
        presence.set(withDelay(600, withTiming(0, { duration: 260 })));
      }
      return;
    }
    if (fresh && fusion.kind === "unfuse") {
      if (id === "garnet") {
        spin.set(withSequence(withTiming(540, { duration: 420 }), withTiming(0, { duration: 0 })));
        presence.set(withTiming(0, { duration: 420 }));
      } else {
        x.set(W / 2);
        presence.set(0);
        spin.set(-360);
        presence.set(withDelay(380, withSpring(1, { damping: 11, stiffness: 150 })));
        x.set(withDelay(380, withTiming(target, { duration: 650, ...ease })));
        spin.set(withDelay(380, withTiming(0, { duration: 600, ...ease })));
      }
      return;
    }
    presence.set(withTiming(onStage ? 1 : 0, { duration: 260 }));
    if (onStage) x.set(withSpring(target, { damping: 18, stiffness: 120 }));
  }, [W, fraction, onStage, fusion, reduceMotion, id, x, presence, spin]);

  const motion = moodMotion[mood];
  const phase = PHASE[id];
  const groundY = H * GROUND;
  const auraId = useSvgId(`aura-${id}`);
  const shadowId = useSvgId(`shadow-${id}`);

  const figureStyle = useAnimatedStyle(() => {
    const body = sampleBody(motion, time.get(), reduceMotion, phase);
    return {
      opacity: Math.min(1, presence.get() * 1.5),
      transform: [
        { translateX: x.get() - figureW / 2 },
        { translateY: groundY - figureH - body.lift * figureH - hop.get() * HOP },
        { rotate: `${body.sway + spin.get()}deg` },
        { scale: Math.max(0.001, presence.get()) },
        { scaleY: body.breathe },
      ],
    };
  });

  const shadowW = figureW * 0.8;
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: presence.get(),
    transform: [
      { translateX: x.get() - shadowW / 2 },
      { translateY: groundY - 14 },
      { scale: Math.max(0.001, presence.get()) * (1 - hop.get() * 0.15) },
    ],
  }));
  const auraSize = Math.max(figureW, figureH * 0.62) * 1.2;
  const auraStyle = useAnimatedStyle(() => ({
    opacity: presence.get(),
    transform: [
      { translateX: x.get() - auraSize / 2 },
      { translateY: groundY - figureH * 0.5 - auraSize / 2 },
      { scale: Math.max(0.001, presence.get()) },
    ],
  }));

  return (
    <>
      {/* Soft aura in the occasion's glow colour, behind the figure */}
      <Animated.View pointerEvents="none" style={[styles.abs, auraStyle]}>
        <Svg width={auraSize} height={auraSize}>
          <Defs>
            <RadialGradient id={auraId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={def.baseGlow} stopOpacity={0.42} />
              <Stop offset="0.55" stopColor={def.baseGlow} stopOpacity={0.12} />
              <Stop offset="1" stopColor={def.baseGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={auraSize / 2} cy={auraSize / 2} r={auraSize / 2} fill={`url(#${auraId})`} />
        </Svg>
      </Animated.View>
      {/* Soft contact shadow and a rim of light on the ground */}
      <Animated.View pointerEvents="none" style={[styles.abs, shadowStyle]}>
        <Svg width={shadowW} height={28}>
          <Defs>
            <RadialGradient id={shadowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={shadowW / 2}
            cy={14}
            rx={shadowW / 2}
            ry={12}
            fill={def.baseGlow}
            opacity={0.18}
          />
          <Ellipse cx={shadowW / 2} cy={14} rx={shadowW * 0.36} ry={8} fill={`url(#${shadowId})`} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.abs, styles.bottomOrigin, figureStyle]}>
        {artwork === undefined ? (
          <FigurePlaceholder id={id} width={figureW} height={figureH} />
        ) : (
          // Owner-supplied image (P-45): shown exactly as provided, standing on the ground line.
          <Image
            source={artwork}
            contentFit="contain"
            contentPosition="bottom"
            transition={0}
            autoplay={!reduceMotion}
            style={{ width: figureW, height: figureH }}
            accessible={false}
          />
        )}
      </Animated.View>
    </>
  );
}

export function FigureStage(props: FigureStageProps) {
  const { cast, moods, occasion, reduceMotion, fusion } = props;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const active = useAppActive();
  const animate = active && !reduceMotion;
  const tick = useTicker(TICK_MS, animate);

  // Talking: remember the tick a new line started (derived state, no effect needed).
  const [talk, setTalk] = useState({ key: props.talkKey, from: tick });
  if (talk.key !== props.talkKey) setTalk({ key: props.talkKey, from: tick });
  const talking = props.talkKey !== null && animate && tick - talk.from < TALK_TICKS;
  // Talking variants alternate with the normal image every other tick.
  const mouthOpen = talking && Math.floor(tick / 2) % 2 === 0;

  const time = useSharedValue(0);
  const clock = useFrameCallback((frame) => {
    time.set(frame.timeSinceFirstFrame / 1000);
  }, false);
  useEffect(() => {
    clock.setActive(animate);
  }, [animate, clock]);

  // A supplied fusion animation plays over the stage for a moment (keyed so it restarts).
  const fusionImage =
    fusion === null || reduceMotion ? undefined : fusionArtwork(artworkFiles, fusion.kind);
  const [overlayKey, setOverlayKey] = useState<number | null>(null);
  const [lastCue, setLastCue] = useState<number | null>(null);
  if (fusion !== null && fusion.key !== lastCue) {
    setLastCue(fusion.key);
    setOverlayKey(fusionImage === undefined ? null : fusion.key);
  }
  useEffect(() => {
    if (overlayKey === null) return;
    const id = setTimeout(() => {
      setOverlayKey(null);
    }, FUSION_MS);
    return () => {
      clearTimeout(id);
    };
  }, [overlayKey]);

  const hop = useSharedValue(0);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (fusion === null || reduceMotion) return;
    const peak = fusion.kind === "fuse" ? 620 : 300;
    flash.set(
      withDelay(
        peak,
        withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 480 })),
      ),
    );
  }, [fusion, reduceMotion, flash]);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.get() * 0.9,
    transform: [{ scale: 0.4 + flash.get() * 1.4 }],
  }));

  const seeds = useMemo(() => {
    const merged = new Map<ParticleSpec["kind"], number>();
    const add = (p: ParticleSpec) => merged.set(p.kind, Math.max(merged.get(p.kind) ?? 0, p.count));
    occasions[occasion].particles.forEach(add);
    for (const id of castMembers(cast)) moodDefs[moods[id]].particles.forEach(add);
    return seedParticles(
      [...merged].map(([kind, count]) => ({ kind, count: Math.min(count, 30) })),
    );
  }, [occasion, cast, moods]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const poke = () => {
    if (reduceMotion) return;
    hop.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 260 })));
  };

  return (
    <Pressable
      onPress={poke}
      onLayout={onLayout}
      style={[styles.fill, props.style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityHint="Tap to make them hop"
    >
      {size.width > 0 ? (
        <>
          <Particles
            seeds={seeds}
            width={size.width}
            height={size.height}
            time={time}
            reduceMotion={reduceMotion}
          />
          {FIGURES.map((id) => (
            <FigureSlot
              key={id}
              id={id}
              cast={cast}
              mood={moods[id]}
              occasion={occasion}
              talking={mouthOpen && props.speaker === id}
              width={size.width}
              height={size.height}
              time={time}
              hop={hop}
              fusion={fusion}
              reduceMotion={reduceMotion}
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flash,
              { left: size.width / 2 - 90, top: size.height * 0.45 - 90 },
              flashStyle,
            ]}
          />
          {overlayKey !== null && fusionImage !== undefined ? (
            <Image
              key={overlayKey}
              source={fusionImage}
              contentFit="contain"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              accessible={false}
            />
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  abs: { position: "absolute", left: 0, top: 0 },
  bottomOrigin: { transformOrigin: "50% 100%" },
  placeholder: { alignItems: "center", justifyContent: "flex-end", paddingBottom: 6 },
  placeholderName: { marginTop: 6 },
  flash: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFE6F4",
  },
});
