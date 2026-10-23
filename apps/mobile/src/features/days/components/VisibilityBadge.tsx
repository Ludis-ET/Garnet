import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { VISIBILITY_LABEL, type Visibility } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A quiet badge for the author's own moments: a lock for "Only you", a moon for "After our days
 * meet" (§4). Shared moments carry no badge. Icon plus words, never colour alone.
 */
export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const { colors } = useTheme();
  if (visibility === "shared") return null;
  const label = visibility === "private" ? VISIBILITY_LABEL.private : "After";
  return (
    <View
      accessible
      accessibilityLabel={VISIBILITY_LABEL[visibility]}
      style={[
        styles.badge,
        { backgroundColor: colors.glassVeilSoft, borderColor: colors.glassRimEnd },
      ]}
    >
      <Icon
        name={visibility === "private" ? "lock" : "moon"}
        size={12}
        color={colors.textSecondary}
      />
      <AppText variant="caption" color="textSecondary" weight="500">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
});
