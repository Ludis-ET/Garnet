import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import type { GemSide } from "@/domain/identity";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

const COPY: Record<GemSide, { name: string; emoji: string; line: string }> = {
  ruby: { name: "Ruby", emoji: "❤️", line: "Warm, expressive, alive." },
  sapphire: { name: "Sapphire", emoji: "💙", line: "Calm, dreamy, spacious." },
};

/**
 * A side choice (SETUP-03, P-51): a tall liquid-glass card with the character, its name and one
 * line. Selected: lifts to 1.04 with a bright rim in its colour, a check badge and a little hop;
 * when the other card is chosen this one recedes. A side the partner holds is frosted and
 * locked ("Noah is Sapphire"). A radio button for screen readers.
 */
export function SideCard({
  side,
  state,
  partnerName,
  width,
  onPress,
}: {
  side: GemSide;
  state: "idle" | "selected" | "receded" | "taken";
  partnerName: string;
  width: number;
  onPress: () => void;
}) {
  const { colors, radii, spacing, motion, reduceMotion } = useTheme();
  const lift = useSharedValue(1);
  const hop = useSharedValue(0);
  const copy = COPY[side];
  const rim = side === "ruby" ? palette.ruby400 : palette.sapphire400;
  const height = Math.round(width * 1.75);

  useEffect(() => {
    const to = state === "selected" ? 1.04 : state === "receded" ? 0.96 : 1;
    lift.set(reduceMotion ? to : withSpring(to, motion.spring.smooth));
    if (state === "selected" && !reduceMotion) {
      hop.set(withSequence(withTiming(1, { duration: 150 }), withSpring(0, motion.spring.bouncy)));
    }
  }, [state, reduceMotion, lift, hop, motion.spring.smooth, motion.spring.bouncy]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.get() }] }));
  const figureStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -hop.get() * 14 }] }));
  const taken = state === "taken";

  return (
    <Pressable
      onPress={() => {
        if (taken) return;
        if (Platform.OS !== "web") void Haptics.selectionAsync();
        onPress();
      }}
      disabled={taken}
      accessibilityRole="radio"
      accessibilityLabel={
        taken ? `${copy.name}, taken by ${partnerName}` : `${copy.name}, ${copy.line}`
      }
      accessibilityState={{ checked: state === "selected", disabled: taken }}
    >
      <Animated.View style={[cardStyle, { opacity: state === "receded" ? 0.72 : taken ? 0.6 : 1 }]}>
        {state === "selected" ? (
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              { borderRadius: radii.xl + 14, borderColor: rim, shadowColor: rim },
            ]}
          />
        ) : null}
        <Glass
          radius={radii.xl + 8}
          veil="soft"
          tint={side}
          contentStyle={[styles.card, { width, height, padding: spacing.md }]}
        >
          <Animated.View style={[styles.figure, figureStyle]}>
            <CharacterSlot
              character={side}
              pose="idle"
              size={height * 0.62}
              aspectRatio={FRAME_ASPECT}
            />
          </Animated.View>
          <View style={{ gap: 2, alignItems: "center" }}>
            <AppText variant="headline">
              {copy.name} {copy.emoji}
            </AppText>
            <AppText variant="footnote" color="textSecondary" style={styles.center}>
              {copy.line}
            </AppText>
          </View>
          {state === "selected" ? (
            <View style={[styles.badge, { backgroundColor: rim }]}>
              <Icon name="check" size={16} color={colors.onAccent} />
            </View>
          ) : null}
          {taken ? (
            <View style={[StyleSheet.absoluteFill, styles.lock]}>
              <Glass radius={radii.pill} contentStyle={[styles.lockPill, { gap: spacing.xs }]}>
                <Icon name="lock" size={14} color={colors.textSecondary} />
                <AppText variant="caption" color="textSecondary">
                  {partnerName} is {copy.name}
                </AppText>
              </Glass>
            </View>
          ) : null}
        </Glass>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", justifyContent: "flex-end" },
  figure: { flex: 1, justifyContent: "flex-end" },
  center: { textAlign: "center" },
  glow: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderWidth: 2,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  lock: { alignItems: "center", justifyContent: "center" },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
