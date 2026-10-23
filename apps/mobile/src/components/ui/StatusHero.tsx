import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { AppText } from "@/components/ui/AppText";
import { Glass, type GlassTint } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A centred status moment (P-48): an icon in a tinted glass circle (or custom art), a title and
 * a calm line. `celebrate` adds a sparkle burst (success moments only; none under reduced motion).
 */
export function StatusHero({
  icon,
  art,
  tint = "garnet",
  tone = "accent",
  title,
  body,
  celebrate = false,
  children,
}: {
  icon?: IconName;
  art?: ReactNode;
  tint?: GlassTint;
  tone?: "accent" | "success" | "danger";
  title: string;
  body?: string;
  celebrate?: boolean;
  children?: ReactNode;
}) {
  const { colors, spacing, reduceMotion } = useTheme();
  const iconColor =
    tone === "success" ? colors.success : tone === "danger" ? colors.danger : colors.accent;
  return (
    <View style={[styles.fill, { gap: spacing.lg }]}>
      <Animated.View
        {...(reduceMotion ? {} : { entering: ZoomIn.springify().damping(12) })}
        style={styles.center}
      >
        {art ?? (
          <Glass radius={40} tint={tint} contentStyle={styles.circle}>
            {icon === undefined ? null : <Icon name={icon} size={34} color={iconColor} />}
          </Glass>
        )}
        <SparkleBurst play={celebrate} delay={120} />
      </Animated.View>
      <Animated.View
        {...(reduceMotion ? {} : { entering: FadeInDown.delay(120).springify().damping(18) })}
        style={{ gap: spacing.sm }}
      >
        <AppText variant="question" style={styles.centerText}>
          {title}
        </AppText>
        {body === undefined ? null : (
          <AppText variant="body" color="textSecondary" style={styles.centerText}>
            {body}
          </AppText>
        )}
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  circle: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  centerText: { textAlign: "center" },
});
