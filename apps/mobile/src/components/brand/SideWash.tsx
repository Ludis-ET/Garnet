import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The "side flood" (SETUP-03, P-51): a soft wash of Ruby's or Sapphire's colour that spreads
 * over the aurora when that side is chosen and settles gently. Decorative; instant under
 * reduced motion.
 */
export function SideWash({ side, on }: { side: "ruby" | "sapphire"; on: boolean }) {
  const { colors, reduceMotion } = useTheme();
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.set(reduceMotion ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 600 }));
  }, [on, reduceMotion, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  const tint = side === "ruby" ? colors.tintRuby : colors.tintSapphire;
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, style]}
    >
      <LinearGradient
        colors={[tint, "transparent"]}
        start={{ x: side === "ruby" ? 0 : 1, y: 0.2 }}
        end={{ x: side === "ruby" ? 1 : 0, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
