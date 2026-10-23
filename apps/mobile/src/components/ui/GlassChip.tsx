import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

/**
 * A liquid glass chip for pickers (Days and Us forms). Selection shows as fill, a thicker rim,
 * a check and a bolder label, never colour alone. `role` is "radio" for one-of, "checkbox" for
 * many-of. Springs a little when chosen.
 */
export function GlassChip({
  label,
  leading,
  selected,
  onPress,
  role = "radio",
  disabled = false,
}: {
  label: string;
  /** Decorative emoji; the label carries the meaning. */
  leading?: string;
  selected: boolean;
  onPress: () => void;
  role?: "radio" | "checkbox";
  disabled?: boolean;
}) {
  const { colors, radii, spacing, motion, reduceMotion } = useTheme();
  const pop = useAnimatedStyle(() => ({
    transform: [
      { scale: reduceMotion ? 1 : withSpring(selected ? 1.04 : 1, motion.spring.bouncy) },
    ],
  }));
  const vertical = Math.max(0, (touchTarget - 40) / 2);
  return (
    <Animated.View style={pop}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") void Haptics.selectionAsync();
          onPress();
        }}
        disabled={disabled}
        accessibilityRole={role}
        accessibilityLabel={label}
        accessibilityState={{ checked: selected, disabled }}
        hitSlop={{ top: vertical, bottom: vertical }}
        style={({ pressed }) => [
          styles.chip,
          {
            borderRadius: radii.pill,
            paddingHorizontal: spacing.md,
            gap: spacing.xs,
            backgroundColor: selected ? colors.accentSoft : colors.glassVeilSoft,
            borderColor: selected ? colors.accent : colors.glassRimEnd,
            borderWidth: selected ? 1.5 : 1,
            opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          },
        ]}
      >
        {leading === undefined ? null : (
          <AppText variant="callout" accessible={false} importantForAccessibility="no">
            {leading}
          </AppText>
        )}
        <AppText
          variant="callout"
          color={selected ? "textPrimary" : "textSecondary"}
          weight={selected ? "600" : "500"}
        >
          {label}
        </AppText>
        {selected ? <Icon name="check" size={15} color={colors.accent} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { height: 40, flexDirection: "row", alignItems: "center" },
});
