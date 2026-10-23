import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { TAB_BAR_HEIGHT } from "@/features/tabs/GlassTabBar";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The floating "＋" (DAYS-02): a round lip button in the page's accent, above the tab bar
 * (or the bottom edge when there is none). Springs in; squishes on press.
 */
export function AddButton({
  onPress,
  label = "Log a moment",
  tabBar = true,
}: {
  onPress: () => void;
  label?: string;
  tabBar?: boolean;
}) {
  const { colors, spacing, motion, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.08 }] }));
  const set = (to: number) => {
    pressed.set(reduceMotion ? to : withSpring(to, motion.spring.press));
  };
  // The entrance and the press squish live on separate views (a layout animation owns the
  // transform of the view it runs on).
  return (
    <Animated.View
      {...(reduceMotion ? {} : { entering: ZoomIn.springify().damping(14) })}
      style={[
        styles.wrap,
        {
          right: spacing.gutter,
          bottom: insets.bottom + (tabBar ? TAB_BAR_HEIGHT + spacing.sm + spacing.lg : spacing.lg),
          shadowColor: colors.accent,
        },
      ]}
    >
      <Animated.View style={style}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            set(1);
          }}
          onPressOut={() => {
            set(0);
          }}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.lip, { backgroundColor: colors.accentLip }]}
        >
          <LinearGradient
            colors={[colors.accentStrong, colors.accentStrongEnd]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.face}
          >
            <Icon name="plus" size={26} color={colors.onAccent} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const SIZE = 60;

/** Room to leave under a page's last item so the floating button never covers it. */
export const ADD_BUTTON_SPACE = SIZE + 28;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  lip: { width: SIZE, height: SIZE + 4, borderRadius: SIZE / 2 },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
