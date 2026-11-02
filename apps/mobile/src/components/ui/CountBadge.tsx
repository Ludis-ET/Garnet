import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { EXIT, POP } from "@/theme/transitions";

/**
 * A small count in the accent (P-66): unread messages, notifications, letters to open. It pops
 * in when the number changes and hides at zero. Only ever this person's own counts, never a
 * measure of the partner (§5). Decorative: the control it sits on says the number in words.
 */
export function CountBadge({
  count,
  style,
  max = 99,
  dot = false,
}: {
  count: number;
  style?: StyleProp<ViewStyle>;
  max?: number;
  /** With no count, still show a small dot (something new that isn't counted, SYS-05). */
  dot?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  if (count <= 0 && dot)
    return (
      <Animated.View
        pointerEvents="none"
        accessible={false}
        {...(reduceMotion ? {} : { entering: POP, exiting: EXIT })}
        style={[
          styles.dot,
          { backgroundColor: colors.accent, borderColor: colors.background },
          style,
        ]}
      />
    );
  if (count <= 0) return null;
  const text = count > max ? `${String(max)}+` : String(count);
  return (
    <Animated.View
      key={text}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      {...(reduceMotion ? {} : { entering: POP, exiting: EXIT })}
      style={[styles.wrap, { borderColor: colors.background }, style]}
    >
      <LinearGradient
        colors={[colors.accentStrong, colors.accentStrongEnd]}
        style={[styles.pill, { minWidth: text.length > 1 ? 22 : 20 }]}
      >
        <AppText variant="caption" weight="600" style={styles.text}>
          {text}
        </AppText>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 2, overflow: "hidden" },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  pill: { height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  text: { color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
});
