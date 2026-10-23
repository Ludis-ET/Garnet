import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useSvgId } from "@/components/brand/svgId";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

/** A spark flying into the crystal: from the buttons below (you) or from the side (partner). */
export interface HeroPulse {
  key: number;
  from: "me" | "partner";
  color: string;
}

const LIGHT = 30;

function OrbitLight({
  t,
  phase,
  size,
  color,
  id,
}: {
  t: SharedValue<number>;
  phase: number;
  size: number;
  color: string;
  id: string;
}) {
  const gid = useSvgId(`orbit-${id}`);
  const style = useAnimatedStyle(() => {
    const a = t.get() * 2 * Math.PI + phase;
    // A tilted ring: wide and shallow, nearer (bigger, brighter) in front.
    const depth = Math.sin(a);
    return {
      // Behind Garnet on the far side of the ring, in front of her on the near side.
      zIndex: depth > 0 ? 3 : 1,
      opacity: 0.55 + (depth + 1) * 0.225,
      transform: [
        { translateX: Math.cos(a) * size * 0.36 },
        { translateY: depth * size * 0.12 },
        { scale: 0.75 + (depth + 1) * 0.2 },
      ],
    };
  });
  const s = LIGHT * 2;
  return (
    <Animated.View style={[styles.light, { left: size / 2 - s / 2, top: size / 2 - s / 2 }, style]}>
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.white} stopOpacity={1} />
            <Stop offset="0.25" stopColor={color} stopOpacity={1} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={s / 2} cy={s / 2} r={s / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

function Spark({ pulse, size }: { pulse: HeroPulse; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(0);
    p.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [pulse.key, p]);
  const startX = pulse.from === "me" ? 0 : size * 0.6;
  const startY = pulse.from === "me" ? size * 0.62 : -size * 0.1;
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v < 0.85 ? 1 : (1 - v) / 0.15,
      transform: [
        { translateX: startX * (1 - v) },
        { translateY: startY * (1 - v) },
        { scale: 1 - v * 0.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        {
          left: size / 2 - 7,
          top: size / 2 - 7,
          backgroundColor: pulse.color,
          shadowColor: pulse.color,
        },
        style,
      ]}
    />
  );
}

/**
 * HOME-01 / HOME-02 hero (P-53, P-55): Garnet stands in a large liquid-glass orb; a ruby and a
 * sapphire light circle her on a tilted ring, passing behind and in front of her. When
 * something happens a spark flies to her and she hops; tapping the orb does the same. Owner
 * image only, via CharacterSlot (rule 5). Lights hold still under reduced motion. Decorative.
 */
export function HeroOrb({ size, pulse }: { size: number; pulse: HeroPulse | null }) {
  const { motion, reduceMotion } = useTheme();
  const t = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      t.set(0.15);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: 12_000, easing: Easing.linear }), -1, false));
  }, [reduceMotion, t]);
  useEffect(() => {
    if (pulse === null || reduceMotion) return;
    pop.set(
      withSequence(
        withTiming(1, { duration: 560 }),
        withTiming(1.16, { duration: 110 }),
        withSpring(1, motion.spring.bouncy),
      ),
    );
  }, [pulse, reduceMotion, pop, motion.spring.bouncy]);
  const figureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(pop.get() - 1) * size * 0.4 }],
  }));
  const figureH = Math.round(size * 0.96);

  return (
    <Pressable
      onPress={() => {
        if (reduceMotion) return;
        pop.set(
          withSequence(withTiming(1.1, { duration: 120 }), withSpring(1, motion.spring.bouncy)),
        );
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.center}
    >
      <View style={{ width: size, height: size }}>
        <Glass
          radius={size / 2}
          veil="soft"
          tint="garnet"
          contentStyle={{ width: size, height: size }}
        >
          <View />
        </Glass>
        {/* Garnet and the lights sit over the glass, so she is never clipped by it. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <OrbitLight t={t} phase={Math.PI} size={size} color={palette.ruby400} id="ruby" />
          <Animated.View style={[styles.figure, { bottom: size * 0.03 }, figureStyle]}>
            <CharacterSlot
              character="garnet"
              pose="happy"
              size={figureH}
              aspectRatio={FRAME_ASPECT}
            />
          </Animated.View>
          <OrbitLight t={t} phase={0} size={size} color={palette.sapphire400} id="sapphire" />
          {pulse === null || reduceMotion ? null : (
            <Spark key={pulse.key} pulse={pulse} size={size} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  light: { position: "absolute" },
  figure: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 2 },
  spark: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 4,
  },
});
