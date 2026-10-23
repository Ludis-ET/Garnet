import { StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

/** SYS-06: marks fake sends and emails so no reviewer mistakes them for real (rule 4). */
export function SimulatedBadge({ text = "Simulated — no email is sent" }: { text?: string }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Glass
      radius={radii.pill}
      shadow={false}
      style={styles.self}
      contentStyle={[styles.row, { paddingHorizontal: spacing.md, gap: spacing.xs }]}
    >
      <Icon name="sparkle" size={13} color={colors.accent} />
      <AppText variant="caption" color="textSecondary">
        {text}
      </AppText>
    </Glass>
  );
}

const styles = StyleSheet.create({
  self: { alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
});
