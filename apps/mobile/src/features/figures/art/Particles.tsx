/**
 * Ambient particles (hearts, sparkles, snow…) as small SVG shapes animated on the UI thread.
 * Deterministic per seed, and frozen in place under reduced motion.
 */
import { StyleSheet } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { ParticleKind, ParticleSpec } from "../types";
import { heartPath, notePath, starPath, zPath } from "./shapes";

type Behaviour = "rise" | "fall" | "twinkle";

export interface ParticleSeed {
  kind: ParticleKind;
  behaviour: Behaviour;
  /** 0–1 across the stage. */
  x: number;
  /** 0–1 down the stage (twinkle only). */
  y: number;
  size: number;
  phase: number;
  speed: number;
  color: string;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const looks: Record<
  ParticleKind,
  { behaviour: Behaviour; colors: readonly string[]; size: [number, number] }
> = {
  hearts: { behaviour: "rise", colors: ["#FF4F7B", "#FF8FB8"], size: [12, 18] },
  sparkles: { behaviour: "twinkle", colors: ["#FFFFFF", "#FFE08A", "#C9B6FF"], size: [8, 14] },
  stars: { behaviour: "twinkle", colors: ["#FFE9A8", "#FFFFFF"], size: [9, 14] },
  confetti: {
    behaviour: "fall",
    colors: ["#FF5C9A", "#FFD45C", "#5B8CFF", "#9A7BFF", "#3FBF8F"],
    size: [8, 11],
  },
  snow: { behaviour: "fall", colors: ["#FFFFFF", "#E6F0FF"], size: [5, 9] },
  zzz: { behaviour: "rise", colors: ["#C9D4FF"], size: [12, 16] },
  notes: { behaviour: "rise", colors: ["#4FD8FF", "#FF7AD9"], size: [14, 18] },
  orbs: { behaviour: "rise", colors: ["#FFD9A8", "#C9B6FF", "#FF9AC6"], size: [8, 14] },
  petals: { behaviour: "fall", colors: ["#E0264A", "#FF6F91"], size: [8, 11] },
};

/** Deterministic particle seeds for a set of specs. */
export function seedParticles(specs: readonly ParticleSpec[], seed = 17): ParticleSeed[] {
  const out: ParticleSeed[] = [];
  specs.forEach((spec, si) => {
    const rand = mulberry32(seed + si * 101 + spec.count);
    const look = looks[spec.kind];
    for (let i = 0; i < spec.count; i++) {
      const [lo, hi] = look.size;
      out.push({
        kind: spec.kind,
        behaviour: look.behaviour,
        x: 0.04 + rand() * 0.92,
        y: 0.08 + rand() * 0.7,
        size: lo + rand() * (hi - lo),
        phase: rand(),
        speed: 0.06 + rand() * 0.07,
        color: look.colors[i % look.colors.length] ?? "#FFFFFF",
      });
    }
  });
  return out;
}

function Shape({ kind, size, color }: { kind: ParticleKind; size: number; color: string }) {
  const c = size / 2;
  switch (kind) {
    case "hearts":
    case "petals":
      return <Path d={heartPath(c, c, c * 0.85)} fill={color} />;
    case "sparkles":
      return <Path d={starPath(c, c, c, c * 0.28, 4)} fill={color} />;
    case "stars":
      return <Path d={starPath(c, c, c, c * 0.45)} fill={color} />;
    case "confetti":
      return <Rect x={0} y={c * 0.5} width={size} height={size * 0.5} rx={1} fill={color} />;
    case "snow":
    case "orbs":
      return <Circle cx={c} cy={c} r={c * 0.9} fill={color} opacity={kind === "orbs" ? 0.6 : 1} />;
    case "zzz":
      return (
        <Path
          d={zPath(c, c, c * 0.7)}
          stroke={color}
          strokeWidth={size * 0.16}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "notes":
      return (
        <>
          <Path d={notePath(c, c, c * 0.85)} stroke={color} strokeWidth={size * 0.12} fill="none" />
          <Circle cx={c * 0.9} cy={c * 1.45} r={c * 0.4} fill={color} />
        </>
      );
  }
}

function Particle({
  p,
  width,
  height,
  time,
  reduceMotion,
}: {
  p: ParticleSeed;
  width: number;
  height: number;
  time: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const t = reduceMotion ? 0 : time.get();
    const x0 = p.x * width;
    if (p.behaviour === "twinkle") {
      const pulse = reduceMotion
        ? 1
        : 0.5 + 0.5 * Math.sin(t * (1.5 + p.speed * 10) + p.phase * 6.3);
      return {
        opacity: 0.35 + 0.65 * pulse,
        transform: [
          { translateX: x0 },
          { translateY: p.y * height * 0.85 },
          { scale: 0.5 + 0.6 * pulse },
          { rotate: `${t * 40 * p.speed}deg` },
        ],
      };
    }
    const u = reduceMotion ? p.phase : (p.phase + t * p.speed) % 1;
    const y = p.behaviour === "rise" ? height * (0.9 - u * 0.8) : height * (0.05 + u * 0.85);
    const drift = reduceMotion ? 0 : Math.sin(t * 0.9 + p.phase * 6.3) * 10;
    return {
      opacity: reduceMotion ? 0.85 : Math.min(1, Math.sin(Math.PI * u) * 1.6),
      transform: [
        { translateX: x0 + drift },
        { translateY: y },
        { rotate: `${p.behaviour === "fall" && !reduceMotion ? t * 90 * p.speed * 6 : 0}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.particle, { width: p.size, height: p.size }, style]}>
      <Svg width={p.size} height={p.size}>
        <Shape kind={p.kind} size={p.size} color={p.color} />
      </Svg>
    </Animated.View>
  );
}

export function Particles({
  seeds,
  width,
  height,
  time,
  reduceMotion,
}: {
  seeds: readonly ParticleSeed[];
  width: number;
  height: number;
  time: SharedValue<number>;
  reduceMotion: boolean;
}) {
  return (
    <>
      {seeds.map((p, i) => (
        <Particle
          key={`${p.kind}-${i}`}
          p={p}
          width={width}
          height={height}
          time={time}
          reduceMotion={reduceMotion}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({ particle: { position: "absolute", left: 0, top: 0 } });
