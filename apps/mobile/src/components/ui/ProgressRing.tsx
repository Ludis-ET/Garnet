import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A thin circular progress ring (uploads, P-61). It glides between values instead of jumping;
 * with `progress` null it spins as "working". The centre holds whatever is passed in (a cancel
 * cross, a percentage). Decorative: the caller names the state for screen readers.
 */
export function ProgressRing({
  progress,
  size,
  stroke = 3,
  color,
  track,
  reduceMotion,
  children,
}: {
  /** 0–1, or null for an indeterminate spinner. */
  progress: number | null;
  size: number;
  stroke?: number;
  color: string;
  track: string;
  reduceMotion: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = useSharedValue(progress ?? 0.25);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (progress === null) {
      value.set(0.25);
      if (!reduceMotion)
        spin.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
      return;
    }
    value.set(reduceMotion ? progress : withTiming(progress, { duration: 220 }));
  }, [progress, reduceMotion, value, spin]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - value.get()) }));
  const rotate = useAnimatedStyle(() => ({
    transform: [{ rotate: `${String(-90 + spin.get() * 360)}deg` }],
  }));
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Animated.View style={[StyleSheet.absoluteFill, rotate]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={track}
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${String(c)} ${String(c)}`}
            fill="none"
            animatedProps={arc}
          />
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
