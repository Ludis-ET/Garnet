import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

export interface InfoItem {
  icon: IconName;
  text: string;
}

/**
 * A glass grouped list of facts (PAIR-04, P-49): each row is an icon in a soft tinted circle and
 * one line of text, separated by inset hairlines. Read as a list.
 */
export function InfoList({ items }: { items: readonly InfoItem[] }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Glass radius={radii.xl} contentStyle={{ paddingVertical: spacing.xs }}>
      <View accessibilityRole="list">
        {items.map((item, i) => (
          <Fragment key={item.text}>
            {i === 0 ? null : (
              <View
                style={[
                  styles.divider,
                  {
                    marginLeft: spacing.lg + 36 + spacing.md,
                    backgroundColor: colors.glassHairline,
                  },
                ]}
              />
            )}
            <View
              style={[styles.row, { paddingHorizontal: spacing.lg, gap: spacing.md }]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={item.text}
            >
              <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                <Icon name={item.icon} size={18} color={colors.accent} />
              </View>
              <AppText variant="callout" style={styles.flex}>
                {item.text}
              </AppText>
            </View>
          </Fragment>
        ))}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
});
