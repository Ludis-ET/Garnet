import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A liquid glass bento tile (US-01 redesign, P-60): a big floating emoji over a soft glow in
 * the tile's colour, a title and an optional hint. Squishes on press; the emoji drifts gently.
 * Still under reduced motion.
 */
export function BentoTile({
  emoji,
  title,
  hint,
  glow,
  big = false,
  onPress,
  style,
  delay = 0,
  height,
}: {
  emoji: string;
  title: string;
  hint?: string;
  glow: string;
  big?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  /** The tile's full height (glass panes size to their content, so it's given explicitly). */
  height: number;
}) {
  const { radii, spacing, motion, reduceMotion } = useTheme();
  const float = useSharedValue(0);
  const press = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );
  }, [reduceMotion, float, delay]);
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -float.get() * (big ? 6 : 3) },
      { rotate: `${String(float.get() * 4 - 2)}deg` },
    ],
  }));
  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.05 }] }));
  const set = (to: number) => {
    press.set(reduceMotion ? to : withSpring(to, motion.spring.press));
  };
  return (
    <Animated.View style={[style, tileStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          set(1);
        }}
        onPressOut={() => {
          set(0);
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        {...(hint === undefined ? {} : { accessibilityHint: hint })}
      >
        <Glass radius={radii.xl + 2} contentStyle={{ height: height - 2, padding: spacing.lg }}>
          <LinearGradient
            colors={[`${glow}55`, `${glow}00`]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.orb,
              big ? styles.orbBig : styles.orbSmall,
              { backgroundColor: `${glow}40`, shadowColor: glow },
            ]}
          />
          <Animated.View style={[styles.emoji, emojiStyle]}>
            <AppText variant={big ? "hero" : "title"} accessible={false}>
              {emoji}
            </AppText>
          </Animated.View>
          <View style={styles.flex} />
          <AppText variant={big ? "title" : "callout"} weight="600" serif={big} numberOfLines={2}>
            {title}
          </AppText>
          {hint === undefined ? null : (
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {hint}
            </AppText>
          )}
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

/** A round glass button with an emoji and a short word under it (the "heavy" row). */
export function OrbButton({
  emoji,
  label,
  title,
  glow,
  onPress,
}: {
  emoji: string;
  label: string;
  title: string;
  glow: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.orbBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
    >
      <Glass radius={28} contentStyle={styles.orbInner}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${glow}22` }]} />
        <AppText variant="title" accessible={false}>
          {emoji}
        </AppText>
      </Glass>
      <AppText variant="caption" weight="500" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  emoji: { alignSelf: "flex-start" },
  orb: {
    position: "absolute",
    borderRadius: 999,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  orbBig: { width: 130, height: 130, top: -20, right: -20 },
  orbSmall: { width: 70, height: 70, top: -14, right: -14 },
  orbBtn: { alignItems: "center", gap: 6, width: 62 },
  orbInner: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
});
