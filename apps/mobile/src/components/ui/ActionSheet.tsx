import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, SHEET } from "@/theme/transitions";

export interface ActionSheetProps {
  visible: boolean;
  title: string;
  body: string;
  icon?: IconName;
  /** A character (or other art) instead of the icon, e.g. the viewer's own gem (P-55). */
  art?: ReactNode;
  confirmLabel: string;
  /** Destructive actions (sign out, delete) read in ruby red. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  confirming?: boolean;
  /** Extra content under the body (the share preview's "Simulated" badge). */
  children?: ReactNode;
}

/**
 * iOS-style glass action sheet (P-48): springs up from the bottom over a soft scrim, with the
 * action in one pane and Cancel in its own pane below. Android back, tapping the scrim and
 * Cancel all close it; it is announced as a modal. Reduced motion: it fades in.
 */
export function ActionSheet({
  visible,
  title,
  body,
  icon,
  art,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
  confirming = false,
  children,
}: ActionSheetProps) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Animated.View entering={ENTER} style={[styles.fill, { backgroundColor: colors.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <Animated.View
          {...(reduceMotion ? {} : { entering: SHEET })}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { padding: spacing.md, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm },
          ]}
        >
          <Glass radius={radii.xl} contentStyle={{ padding: spacing.xl, gap: spacing.sm }}>
            <View style={[styles.grabber, { backgroundColor: colors.glassHairline }]} />
            {art !== undefined ? (
              <View style={styles.art}>{art}</View>
            ) : icon === undefined ? null : (
              <View style={[styles.badge, { backgroundColor: colors.tintRuby }]}>
                <Icon name={icon} size={22} color={destructive ? colors.danger : colors.accent} />
              </View>
            )}
            <AppText variant="headline" style={styles.center}>
              {title}
            </AppText>
            <AppText variant="callout" color="textSecondary" style={styles.center}>
              {body}
            </AppText>
            {children}
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={confirmLabel}
                variant={destructive ? "destructive" : "primary"}
                onPress={onConfirm}
                loading={confirming}
              />
            </View>
          </Glass>
          <Glass radius={radii.xl}>
            <Button label={cancelLabel} variant="text" onPress={onCancel} disabled={confirming} />
          </Glass>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 480, alignSelf: "center" },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 8 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  art: { alignItems: "center", marginTop: -8 },
});
