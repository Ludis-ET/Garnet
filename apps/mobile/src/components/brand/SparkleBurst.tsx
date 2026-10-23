import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

const COLORS = [palette.ruby400, palette.violet400, palette.sapphire400, palette.violet200];
const COUNT = 12;

function Spark({ i, t }: { i: number; t: SharedValue<number> }) {
  // Deterministic spread: evenly around the circle, alternating distance and size.
  const angle = (i / COUNT) * 2 * Math.PI + (i % 2 === 0 ? 0.15 : -0.1);
  const distance = i % 3 === 0 ? 70 : i % 3 === 1 ? 52 : 40;
  const size = i % 2 === 0 ? 12 : 8;
  const color = COLORS[i % COLORS.length] ?? palette.violet400;
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: 0.4 + p * 0.8 },
        { rotate: `${p * 90}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.spark, { marginLeft: -size / 2, marginTop: -size / 2 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0 14.5 9.5 24 12 14.5 14.5 12 24 9.5 14.5 0 12 9.5 9.5Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * A small celebration (P-48): a dozen soft four-point sparkles in rose, violet and sky pop out
 * from the centre of their parent and fade within ~0.8 s. Plays when `play` turns true.
 * Nothing at all under reduced motion. Decorative.
 */
export function SparkleBurst({ play, delay = 0 }: { play: boolean; delay?: number }) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play || reduceMotion) return;
    t.set(0);
    t.set(withDelay(delay, withTiming(1, { duration: 820, easing: Easing.out(Easing.cubic) })));
  }, [play, reduceMotion, delay, t]);
  if (reduceMotion || !play) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}
    >
      {Array.from({ length: COUNT }, (_, i) => (
        <Spark key={i} i={i} t={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  spark: { position: "absolute", left: "50%", top: "50%" },
});
