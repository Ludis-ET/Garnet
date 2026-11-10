import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
// The keyboard library's window size ignores the keyboard on Android, so the orbs don't jump
// when it opens (production-fix-plan K6).
import { useKeyboardState, useWindowDimensions } from "react-native-keyboard-controller";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { useSvgId } from "./svgId";

interface OrbSpec {
  key: "rose" | "sky" | "lilac";
  /** Centre as a fraction of the screen. */
  x: number;
  y: number;
  /** Diameter as a fraction of the screen width. */
  size: number;
  /** Drift radius in points and a phase offset so the orbs never move in step. */
  drift: number;
  phase: number;
}

const ORBS: readonly OrbSpec[] = [
  { key: "rose", x: 0.08, y: 0.1, size: 1.25, drift: 14, phase: 0 },
  { key: "sky", x: 0.95, y: 0.2, size: 1.15, drift: 12, phase: 2.1 },
  { key: "lilac", x: 0.5, y: 0.82, size: 1.4, drift: 16, phase: 4.2 },
];

function Orb({ spec, color, t }: { spec: OrbSpec; color: string; t: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const d = width * spec.size;
  const gid = useSvgId(`aurora-${spec.key}`);
  const style = useAnimatedStyle(() => {
    // Whole cycles per loop, so the wrap from 1 back to 0 is seamless.
    const a = t.get() * 2 * Math.PI + spec.phase;
    return {
      transform: [
        { translateX: Math.sin(a) * spec.drift },
        { translateY: Math.sin(2 * a) * spec.drift * 0.6 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.orb,
        { width: d, height: d, left: spec.x * width - d / 2, top: spec.y * height - d / 2 },
        style,
      ]}
    >
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Daylight Glass canvas (P-48): the porcelain background with three very soft orbs (rose, sky,
 * lilac) drifting a few points over ~25 s. Opaque on purpose, so nothing behind a screen shows
 * through (AUTH-07). Still under reduced motion. Decorative: hidden from screen readers.
 */
export function Aurora() {
  const { colors, reduceMotion } = useTheme();
  // Held still while the keyboard is open, so typing never shares frames with the drift (K6).
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    if (keyboardOpen) {
      cancelAnimation(t);
      return;
    }
    // Carry on from where it stopped: whole cycles per unit of t, so from → from + 1 loops
    // seamlessly.
    const from = t.get() % 1;
    t.set(from);
    t.set(withRepeat(withTiming(from + 1, { duration: 26000, easing: Easing.linear }), -1, false));
  }, [reduceMotion, keyboardOpen, t]);
  const color = { rose: colors.auroraRose, sky: colors.auroraSky, lilac: colors.auroraLilac };
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: colors.background }]}
    >
      {ORBS.map((spec) => (
        <Orb key={spec.key} spec={spec} color={color[spec.key]} t={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  orb: { position: "absolute" },
});
