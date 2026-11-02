import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

/** One soft block that breathes while content loads (static under reduced motion). */
function Bone({ w, h, r = 10 }: { w: number | `${number}%`; h: number; r?: number }) {
  const { colors, reduceMotion } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + t.get() * 0.35 }));
  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius: r, backgroundColor: colors.glassVeilSoft },
        style,
      ]}
    />
  );
}

/**
 * SYS-03 · Skeletons while something loads: a timeline, a grid or a detail page in soft glass,
 * breathing gently (still under reduced motion). After 3 seconds it says "Still working on it…".
 * Announced once as "Loading".
 */
export function Skeleton({ kind = "timeline" }: { kind?: "timeline" | "grid" | "detail" }) {
  const { radii, spacing } = useTheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setSlow(true);
    }, 3000);
    return () => {
      clearTimeout(t);
    };
  }, []);
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={{ gap: spacing.md }}
    >
      {kind === "detail" ? (
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <Bone w="100%" h={180} r={radii.lg} />
          <Bone w="70%" h={22} />
          <Bone w="90%" h={14} />
          <Bone w="60%" h={14} />
        </Glass>
      ) : kind === "grid" ? (
        <View style={[styles.grid, { rowGap: spacing.md }]}>
          {[0, 1, 2, 3].map((i) => (
            <Glass
              key={i}
              radius={radii.xl}
              style={styles.half}
              contentStyle={{ padding: spacing.md, gap: spacing.sm }}
            >
              <Bone w="100%" h={110} r={radii.lg} />
              <Bone w="80%" h={14} />
              <Bone w="50%" h={12} />
            </Glass>
          ))}
        </View>
      ) : (
        [0, 1, 2].map((i) => (
          <Glass
            key={i}
            radius={radii.xl}
            contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
          >
            <Bone w={44} h={44} r={22} />
            <View style={[styles.flex, { gap: spacing.xs }]}>
              <Bone w="70%" h={16} />
              <Bone w="45%" h={12} />
            </View>
          </Glass>
        ))
      )}
      {slow ? (
        <Animated.View entering={ENTER}>
          <AppText
            variant="footnote"
            color="textSecondary"
            style={styles.center}
            accessibilityLiveRegion="polite"
          >
            Still working on it…
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  half: { width: "48%" },
  center: { textAlign: "center" },
});
