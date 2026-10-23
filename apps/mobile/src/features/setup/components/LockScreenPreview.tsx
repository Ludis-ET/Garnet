import { StyleSheet, View } from "react-native";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

/** The generic lock-screen text (P-17): identical for every signal, never the content. */
export const GENERIC_PREVIEW = "Something new for you 💜";

/**
 * SETUP-07: what a Garnet notification looks like on the lock screen — always the generic
 * preview (P-17), whoever sent it and whatever it says.
 */
export function LockScreenPreview() {
  const { colors, radii, spacing } = useTheme();
  return (
    <View accessible accessibilityLabel={`Lock-screen preview: Garnet, now, ${GENERIC_PREVIEW}`}>
      <Glass
        radius={radii.lg + 4}
        contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
      >
        <View style={[styles.icon, { backgroundColor: colors.surface }]}>
          <GarnetMark size={34} animated={false} />
        </View>
        <View style={styles.flex}>
          <View style={styles.row}>
            <AppText variant="footnote" weight="600" style={styles.flex}>
              Garnet
            </AppText>
            <AppText variant="caption" color="textTertiary">
              now
            </AppText>
          </View>
          <AppText variant="callout">{GENERIC_PREVIEW}</AppText>
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
