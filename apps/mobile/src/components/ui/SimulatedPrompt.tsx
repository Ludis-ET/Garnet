import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A stand-in for an OS permission prompt (SETUP-04, SETUP-07). Styled like an iOS alert but
 * clearly badged "Simulated system prompt" (rule 4), because Phase 2 never asks the real OS.
 * Announced as an alert; Android back counts as "Don't Allow".
 */
export function SimulatedPrompt({
  visible,
  title,
  body,
  onAllow,
  onDeny,
}: {
  visible: boolean;
  title: string;
  body: string;
  onAllow: () => void;
  onDeny: () => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDeny}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        style={[styles.fill, { backgroundColor: colors.scrim, padding: spacing.xxl }]}
      >
        <Animated.View
          {...(reduceMotion ? {} : { entering: ZoomIn.springify().damping(16).stiffness(240) })}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={styles.card}
        >
          <Glass radius={radii.xl}>
            <View style={{ padding: spacing.xl, gap: spacing.sm }}>
              <AppText variant="headline" style={styles.center}>
                {title}
              </AppText>
              <AppText variant="footnote" color="textSecondary" style={styles.center}>
                {body}
              </AppText>
              <SimulatedBadge text="Simulated system prompt" />
            </View>
            {(["Allow", "Don't Allow"] as const).map((label) => (
              <Pressable
                key={label}
                onPress={label === "Allow" ? onAllow : onDeny}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.action,
                  { borderTopColor: colors.glassHairline, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <AppText variant="body" weight={label === "Allow" ? "600" : "400"} color="accent">
                  {label}
                </AppText>
              </Pressable>
            ))}
          </Glass>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { width: "100%", maxWidth: 300 },
  center: { textAlign: "center" },
  action: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
