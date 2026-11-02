import { Pressable, StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

export interface ChipProps {
  label: string;
  /** Optional leading emoji or glyph (decorative; the label carries the meaning). */
  leading?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}

/** Single-choice chip. Selection is shown by fill and weight, never colour alone; no outline (P-67). */
export function Chip({ label, leading, selected, onPress, accessibilityHint }: ChipProps) {
  const { colors, radii, spacing } = useTheme();
  const vertical = Math.max(0, (touchTarget - 40) / 2);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      hitSlop={{ top: vertical, bottom: vertical }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radii.pill,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          opacity: pressed ? 0.75 : 1,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { height: 40, flexDirection: "row", alignItems: "center" },
});
