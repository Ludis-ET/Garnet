import type { ErrorBoundaryProps } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorsFor, radii, spacing, touchTarget, typography } from "@/theme/tokens";

/**
 * Last-resort screen (spec §40 error language). Rendered by Expo Router when a route throws,
 * possibly outside the providers, so it reads tokens directly instead of theme context.
 * Never shows the raw error (privacy): details stay in development tooling.
 */
export function AppErrorBoundary({ retry }: ErrorBoundaryProps) {
  const colors = colorsFor("dark", "garnet");
  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityRole="alert"
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>Something went wrong ❤️</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
        Your moment is still safe. Try again.
      </Text>
      <Pressable
        onPress={() => void retry()}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[typography.callout, { color: colors.onAccent }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.xl },
  button: {
    marginTop: spacing.xl,
    minHeight: touchTarget,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    alignSelf: "flex-start",
  },
});
