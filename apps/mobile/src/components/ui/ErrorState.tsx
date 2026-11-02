import { StyleSheet } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * SYS-04 · When something couldn't load: calm, no blame, no details that could leak anything,
 * and a way to try again. What the person typed is always kept elsewhere (forgiving UX, §5).
 */
export function ErrorState({
  onRetry,
  title = "Something went wrong ❤️",
  body = "Your moments are still safe. Try again.",
}: {
  onRetry: () => void;
  title?: string;
  body?: string;
}) {
  const { radii, spacing } = useTheme();
  return (
    <Glass radius={radii.xl} contentStyle={[styles.box, { gap: spacing.sm, padding: spacing.xl }]}>
      <AppText variant="headline" style={styles.center} accessibilityRole="alert">
        {title}
      </AppText>
      <AppText variant="callout" color="textSecondary" style={styles.center}>
        {body}
      </AppText>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </Glass>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "stretch" },
  center: { textAlign: "center" },
});
