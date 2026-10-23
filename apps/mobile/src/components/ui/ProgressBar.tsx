import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

/**
 * Step progress (P-48): a slim glass track filled with the Together gradient that springs to
 * each new step. Announced as "Step 2 of 3".
 */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const { colors, radii, motion, reduceMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const fraction = Math.min(1, Math.max(0, step / total));
  useEffect(() => {
    fill.set(
      reduceMotion
        ? withTiming(fraction, { duration: 120 })
        : withSpring(fraction, motion.spring.smooth),
    );
  }, [fraction, reduceMotion, fill, motion.spring.smooth]);
  const style = useAnimatedStyle(() => ({ width: Math.max(8, fill.get() * width) }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step, text: `Step ${step} of ${total}` }}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
      }}
      style={[
        styles.track,
        {
          borderRadius: radii.pill,
          backgroundColor: colors.glassVeilSoft,
          borderColor: colors.glassHairline,
        },
      ]}
    >
      <Animated.View style={[styles.fill, { borderRadius: radii.pill }, style]}>
        <LinearGradient
          colors={[palette.ruby400, palette.violet500, palette.sapphire400]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  fill: { height: "100%", overflow: "hidden" },
});
