import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

const LABELS = ["Name", "Side", "Photo", "Time", "Together", "Look", "Alerts"] as const;

function Capsule({ state }: { state: "done" | "current" | "next" }) {
  const { colors, motion, reduceMotion } = useTheme();
  const grow = useSharedValue(state === "current" ? 2.4 : 1);
  const fill = useSharedValue(state === "next" ? 0 : 1);
  useEffect(() => {
    const to = state === "current" ? 2.4 : 1;
    grow.set(reduceMotion ? to : withSpring(to, motion.spring.smooth));
    fill.set(withTiming(state === "next" ? 0 : 1, { duration: reduceMotion ? 0 : 260 }));
  }, [state, reduceMotion, grow, fill, motion.spring.smooth]);
  const style = useAnimatedStyle(() => ({ flexGrow: grow.get() }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.get() }));
  return (
    <Animated.View
      style={[
        styles.capsule,
        { backgroundColor: colors.glassVeilSoft, borderColor: colors.glassRimEnd },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          { backgroundColor: state === "current" ? colors.accent : colors.accentStrong },
          fillStyle,
        ]}
      />
    </Animated.View>
  );
}

/**
 * Setup progress (SETUP-01, P-51): six short liquid capsules. The current one stretches wider
 * with a spring and lights; finished ones fill with the side colour. Announced as
 * "Step 2 of 7, Side".
 */
export function StepCapsules({ index }: { index: number }) {
  const { spacing } = useTheme();
  const label = LABELS[index] ?? "";
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${LABELS.length}, ${label}`}
      accessibilityValue={{ min: 1, max: LABELS.length, now: index + 1 }}
      style={[styles.row, { gap: spacing.xs }]}
    >
      {LABELS.map((l, i) => (
        <Capsule key={l} state={i < index ? "done" : i === index ? "current" : "next"} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flex: 1 },
  capsule: {
    height: 8,
    flexBasis: 0,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  round: { borderRadius: 4 },
});
