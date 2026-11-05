import { Haptics } from "@/components/ui/haptics";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { usePop } from "@/components/ui/motion";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * "I agree to the Terms of use and the Privacy notice" (P-79): an explicit tap, never a box
 * ticked in advance or agreement by carrying on. The server records which version and when.
 * Both documents open in the app. A checkbox for screen readers, with its state; an error
 * shows under it with an icon (never colour alone).
 */
export function TermsConsent({
  checked,
  onChange,
  error,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const pop = usePop(checked, 0.25);
  const toggle = () => {
    if (disabled) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    onChange(!checked);
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={[styles.row, { gap: spacing.md }]}>
        <Pressable
          onPress={toggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled }}
          accessibilityLabel="I agree to the Terms of use and the Privacy notice"
          hitSlop={12}
          testID="accept-terms"
        >
          <Animated.View
            style={[
              styles.box,
              {
                borderColor: checked ? colors.accent : colors.textTertiary,
                backgroundColor: checked ? colors.accent : "transparent",
              },
              pop,
            ]}
          >
            {checked ? <Icon name="check" size={15} color={colors.onAccent} /> : null}
          </Animated.View>
        </Pressable>
        <AppText variant="footnote" color="textSecondary" style={styles.flex}>
          I agree to the{" "}
          <AppText
            variant="footnote"
            weight="600"
            color="accent"
            accessibilityRole="link"
            onPress={() => {
              router.push("/terms");
            }}
          >
            Terms of use
          </AppText>{" "}
          and the{" "}
          <AppText
            variant="footnote"
            weight="600"
            color="accent"
            accessibilityRole="link"
            onPress={() => {
              router.push("/privacy");
            }}
          >
            Privacy notice
          </AppText>
          .
        </AppText>
      </View>
      {error === undefined ? null : (
        <View style={[styles.row, { gap: spacing.xs }]} accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} color={colors.danger} />
          <AppText variant="footnote" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
