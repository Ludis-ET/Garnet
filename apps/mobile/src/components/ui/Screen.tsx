import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/theme/ThemeProvider";

export interface ScreenProps {
  children: ReactNode;
  /** Scroll the content (forms, long pages). Long lists must use a virtualized list instead. */
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

/** Base for every route: safe areas, themed background, status bar, standard gutters. */
export function Screen({
  children,
  scroll = false,
  edges = ["top", "bottom"],
  contentStyle,
}: ScreenProps) {
  const { colors, spacing, scheme } = useTheme();
  const padding = { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg };
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
