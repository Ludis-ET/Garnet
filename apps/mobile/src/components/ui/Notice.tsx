import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useSimulation } from "@/data/RepositoryProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

export type NoticeTone = "info" | "error" | "success";

/**
 * A glass notice pill (P-48): a form-level error ("Those details don't match"), a calm
 * explanation, or the offline banner. Icon in a tinted circle plus text, never colour alone.
 * Springs in; announced politely (errors as alerts).
 */
export function Notice({
  text,
  tone = "info",
  icon,
}: {
  text: string;
  tone?: NoticeTone;
  icon?: IconName;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const tint =
    tone === "error" ? colors.danger : tone === "success" ? colors.success : colors.accent;
  const fallback: IconName = tone === "error" ? "alert" : tone === "success" ? "check" : "sparkle";
  return (
    <Animated.View
      {...(reduceMotion ? {} : { entering: ENTER })}
      accessibilityRole={tone === "error" ? "alert" : "text"}
      accessibilityLiveRegion="polite"
    >
      <Glass
        radius={radii.lg}
        shadow={false}
        contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
      >
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Icon name={icon ?? fallback} size={16} color={tint} />
        </View>
        <AppText variant="callout" style={styles.flex}>
          {text}
        </AppText>
      </Glass>
    </Animated.View>
  );
}

/** SYS-02 offline banner, shown while the prototype simulates being offline. */
export function OfflineBanner() {
  const { offline } = useSimulation();
  if (!offline) return null;
  return (
    <Notice text="You're offline. What you write waits safely on this phone." icon="wifi-off" />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
