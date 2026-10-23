import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

/**
 * Compact header (P-48): a round glass Back button (labelled "Back"), then either a centred
 * title or custom content filling the row (the create-account progress bar).
 */
export function Header({
  title,
  onBack,
  right,
  children,
}: {
  title?: string;
  onBack?: () => void;
  /** A control at the right end (account button). */
  right?: ReactNode;
  children?: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.lg }]}>
      {onBack === undefined ? (
        <View style={styles.side} />
      ) : (
        <IconButton icon="chevron-left" label="Back" onPress={onBack} />
      )}
      {children !== undefined ? (
        <View style={styles.flex}>{children}</View>
      ) : title === undefined ? (
        <View style={styles.flex} />
      ) : (
        <AppText variant="headline" numberOfLines={1} style={[styles.flex, styles.title]}>
          {title}
        </AppText>
      )}
      {right !== undefined ? right : children === undefined ? <View style={styles.side} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: touchTarget },
  side: { width: 44, height: 44 },
  flex: { flex: 1 },
  title: { textAlign: "center" },
});
