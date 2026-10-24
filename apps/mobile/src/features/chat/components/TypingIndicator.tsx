import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

function Dot({
  delay,
  color,
  reduceMotion,
}: {
  delay: number;
  color: string;
  reduceMotion: boolean;
}) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (reduceMotion) return;
    y.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 280 }),
            withTiming(2, { duration: 280 }),
            withTiming(0, { duration: 180 }),
          ),
          -1,
          true,
        ),
      ),
    );
    opacity.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(1, { duration: 280 }), withTiming(0.4, { duration: 280 })),
          -1,
          true,
        ),
      ),
    );
  }, [delay, reduceMotion, y, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
    opacity: opacity.get(),
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, reduceMotion ? null : animStyle]}
    />
  );
}

export function TypingIndicator({ partnerName }: { partnerName: string }) {
  const { colors, spacing, radii, reduceMotion } = useTheme();

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${partnerName} is typing`}
      {...(reduceMotion
        ? {}
        : {
            entering: FadeInDown.springify().damping(15),
            exiting: FadeOutDown.duration(120),
          })}
      style={[styles.row, { paddingHorizontal: spacing.gutter, marginBottom: spacing.xs }]}
    >
      <Glass
        radius={radii.pill}
        tint="sapphire"
        shadow={false}
        contentStyle={[styles.glassContent, { paddingHorizontal: spacing.md, paddingVertical: 6 }]}
      >
        <View style={styles.dotsRow}>
          <Dot delay={0} color={colors.sapphire} reduceMotion={reduceMotion} />
          <Dot delay={140} color={colors.sapphire} reduceMotion={reduceMotion} />
          <Dot delay={280} color={colors.sapphire} reduceMotion={reduceMotion} />
        </View>
        <AppText variant="caption" color="textSecondary" weight="500">
          {partnerName} is typing…
        </AppText>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  glassContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
