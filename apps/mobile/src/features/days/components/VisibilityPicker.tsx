import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { canChangeVisibility, VISIBILITY_LABEL, type Visibility } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";

const OPTIONS: readonly { value: Visibility; icon: IconName }[] = [
  { value: "private", icon: "lock" },
  { value: "afterReveal", icon: "moon" },
  { value: "shared", icon: "heart" },
];

/**
 * Who sees this moment (§4): Only you (the default; day-log rule 2), after your days meet, or
 * shared now. Once shared it stays shared (P-20), so the other choices lock. A radio group; the
 * choice shows as fill, an accent icon and a check, never colour alone.
 */
export function VisibilityPicker({
  value,
  from,
  partnerName,
  onChange,
}: {
  value: Visibility;
  /** The saved visibility when editing (P-20 locks a shared moment). */
  from: Visibility | null;
  partnerName: string;
  onChange: (v: Visibility) => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const label = (v: Visibility) =>
    v === "shared" ? `Share with ${partnerName}` : VISIBILITY_LABEL[v];
  return (
    <Glass radius={radii.lg} shadow={false} contentStyle={{ padding: spacing.xs }}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Who sees this">
        {OPTIONS.map((o) => {
          const on = o.value === value;
          const locked = from !== null && !canChangeVisibility(from, o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                onChange(o.value);
              }}
              disabled={locked}
              accessibilityRole="radio"
              accessibilityLabel={label(o.value)}
              accessibilityState={{ checked: on, disabled: locked }}
              style={[
                styles.row,
                {
                  gap: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: on ? colors.accentSoft : "transparent",
                  opacity: locked ? 0.4 : 1,
                },
              ]}
            >
              <Icon name={o.icon} size={19} color={on ? colors.accent : colors.textSecondary} />
              <AppText
                variant="callout"
                weight={on ? "600" : "500"}
                color={on ? "textPrimary" : "textSecondary"}
                style={styles.flex}
              >
                {label(o.value)}
              </AppText>
              {on ? <Icon name="check" size={18} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 12 },
  flex: { flex: 1 },
});
