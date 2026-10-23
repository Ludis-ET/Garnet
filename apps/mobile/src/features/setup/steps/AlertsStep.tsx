/**
 * SETUP-07 · Alerts. Each person controls only their own notifications (§5). Lock-screen
 * previews are generic (P-17). Quiet hours are on by default but the window is open (U-21), so
 * no hours are shown. The OS prompt is simulated (rule 4).
 */
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Toggle } from "@/components/ui/Toggle";
import type { NotificationPrefs } from "@/data/fixtures/demoProfile";
import { useTheme } from "@/theme/ThemeProvider";
import { LockScreenPreview } from "../components/LockScreenPreview";

type Category = "thoughts" | "support" | "days";

const ROWS: readonly { key: Category; icon: IconName; title: string }[] = [
  {
    key: "thoughts",
    icon: "sparkle",
    title: "Thoughts and Missing You",
  },
  {
    key: "support",
    icon: "info",
    title: "Support requests",
  },
  {
    key: "days",
    icon: "clock",
    title: "Days and letters",
  },
];

export function AlertsStep({
  prefs,
  onPrefs,
}: {
  prefs: NotificationPrefs;
  onPrefs: (p: NotificationPrefs) => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  return (
    <View style={{ gap: spacing.lg }}>
      <Glass radius={radii.xl}>
        {ROWS.map((row, i) => (
          <Fragment key={row.key}>
            {i === 0 ? null : (
              <View
                style={[styles.divider, { marginLeft: 68, backgroundColor: colors.glassHairline }]}
              />
            )}
            <View style={[styles.row, { paddingHorizontal: spacing.lg, gap: spacing.md }]}>
              <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                <Icon name={row.icon} size={18} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <AppText variant="callout" weight="600">
                  {row.title}
                </AppText>
              </View>
              <Toggle
                value={prefs[row.key]}
                onValueChange={(on) => {
                  onPrefs({ ...prefs, [row.key]: on });
                }}
                accessibilityLabel={row.title}
              />
            </View>
          </Fragment>
        ))}
      </Glass>

      <View style={[styles.quiet, { gap: spacing.sm }]}>
        <Icon name="clock" size={16} color={colors.textTertiary} />
        <AppText variant="footnote" color="textSecondary" style={styles.flex}>
          Quiet hours on · set the hours later
        </AppText>
      </View>

      <LockScreenPreview />

      {prefs.status === "on" ? (
        <Animated.View {...(reduceMotion ? {} : { entering: ZoomIn.springify().damping(12) })}>
          <Notice tone="success" icon="check" text="Notifications are on." />
        </Animated.View>
      ) : prefs.status === "denied" ? (
        <Notice icon="info" text="You can turn them on later in Settings." />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 60 },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
});
