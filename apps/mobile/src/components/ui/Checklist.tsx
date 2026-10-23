import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { usePop } from "@/components/ui/motion";
import { useTheme } from "@/theme/ThemeProvider";

export interface ChecklistItem {
  label: string;
  met: boolean;
}

function Row({ label, met }: ChecklistItem) {
  const { colors, spacing } = useTheme();
  const pop = usePop(met, 0.25);
  return (
    <View
      style={[styles.row, { gap: spacing.sm }]}
      accessible
      accessibilityLabel={`${label}, ${met ? "met" : "not met yet"}`}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            borderColor: met ? colors.success : colors.textTertiary,
            backgroundColor: met ? colors.success : "transparent",
          },
          pop,
        ]}
      >
        {met ? <Icon name="check" size={14} color={colors.onAccent} /> : null}
      </Animated.View>
      <AppText variant="footnote" weight="500" color={met ? "success" : "textSecondary"}>
        {label}
      </AppText>
    </View>
  );
}

/**
 * Live requirements (P-48), e.g. "At least 12 characters". Each item shows its state by an icon
 * and by text colour, and announces "met" / "not met yet" (never colour alone). Items spring
 * into a check as they are met.
 */
export function Checklist({ items }: { items: readonly ChecklistItem[] }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item) => (
        <Row key={item.label} {...item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
