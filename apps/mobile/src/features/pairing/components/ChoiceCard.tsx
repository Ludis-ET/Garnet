import * as Haptics from "expo-haptics";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass, type GlassTint } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A large tappable glass card (PAIR-01, P-49): an icon in a tinted glass circle, a title, one
 * line of explanation and a chevron. Squishes on press with a spring and a light haptic, like a
 * Duolingo choice. The whole card is one button whose name is the title.
 */
export function ChoiceCard({
  icon,
  tint,
  title,
  subtitle,
  onPress,
  loading = false,
  disabled = false,
}: {
  icon: IconName;
  tint: GlassTint;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors, radii, spacing, motion, reduceMotion } = useTheme();
  const pressed = useSharedValue(0);
  const inactive = disabled || loading;
  const set = (to: number) => {
    pressed.set(
      reduceMotion ? withTiming(to, { duration: 80 }) : withSpring(to, motion.spring.press),
    );
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.03 }] }));
  const iconColor =
    tint === "ruby" ? colors.ruby : tint === "sapphire" ? colors.sapphire : colors.accent;
  return (
    <Pressable
      onPress={() => {
        if (inactive) return;
        if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => {
        if (!inactive) set(1);
      }}
      onPressOut={() => {
        set(0);
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      <Animated.View style={[style, { opacity: disabled ? 0.5 : 1 }]}>
        <Glass
          radius={radii.xl}
          contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.lg }]}
        >
          <Glass radius={24} tint={tint} shadow={false} contentStyle={styles.badge}>
            <Icon name={icon} size={22} color={iconColor} />
          </Glass>
          <View style={[styles.flex, { gap: spacing.xxs }]}>
            <AppText variant="body" weight="600">
              {title}
            </AppText>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accent} accessibilityElementsHidden />
          ) : (
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          )}
        </Glass>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 76 },
  badge: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
