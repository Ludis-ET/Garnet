import * as Haptics from "expo-haptics";
import { usePathname } from "expo-router";
import { TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

export const TABS = [
  { name: "home", href: "/home", label: "Home", icon: "home" },
  { name: "days", href: "/days", label: "Days", icon: "calendar" },
  { name: "us", href: "/us", label: "Us", icon: "heart" },
  { name: "moments", href: "/moments", label: "Moments", icon: "sparkle" },
  { name: "our-world", href: "/our-world", label: "World", icon: "globe" },
] as const satisfies readonly { name: string; href: string; label: string; icon: IconName }[];

/** Full-screen forms that hide the bar (it slides away and comes back on leaving). */
export const HIDES_TAB_BAR: readonly string[] = ["/days/new"];

/** Height of the floating bar; screens leave this much room at the bottom. */
export const TAB_BAR_HEIGHT = 64;

/** One tab; TabTrigger passes `isFocused`, `onPress` and the ref (React 19 ref-as-prop). */
function TabButton({
  isFocused = false,
  label,
  icon,
  onPress,
  ref,
  ...rest
}: TabTriggerSlotProps & { label: string; icon: IconName }) {
  const { colors } = useTheme();
  return (
    <Pressable
      ref={ref}
      {...rest}
      onPress={(e) => {
        if (!isFocused && Platform.OS !== "web") void Haptics.selectionAsync();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={styles.tab}
    >
      <Icon name={icon} size={22} color={isFocused ? colors.accent : colors.textSecondary} />
      <AppText
        variant="caption"
        weight={isFocused ? "600" : "500"}
        color={isFocused ? "accent" : "textSecondary"}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * The floating liquid-glass tab bar (HOME-01, P-53): five tabs in a glass capsule above the
 * safe area; a brighter glass thumb springs to the selected tab and stretches as it travels.
 * Used as `<TabList asChild><GlassTabBar>{triggers}</GlassTabBar></TabList>` so expo-router's
 * headless tabs can find the triggers; works the same on iOS, Android and web.
 */
export function GlassTabBar({ children, ...rest }: ViewProps) {
  const { radii, spacing, motion, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    TABS.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)),
  );
  const slot = width === 0 ? 0 : (width - 8) / TABS.length;
  const x = useSharedValue(index);
  const stretch = useSharedValue(1);
  useEffect(() => {
    x.set(reduceMotion ? index : withSpring(index, motion.spring.smooth));
    if (!reduceMotion)
      stretch.set(
        withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, motion.spring.bouncy)),
      );
  }, [index, reduceMotion, x, stretch, motion.spring.smooth, motion.spring.bouncy]);
  const hidden = HIDES_TAB_BAR.includes(pathname);
  const away = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    away.set(
      reduceMotion
        ? withTiming(hidden ? 1 : 0, { duration: 120 })
        : withSpring(hidden ? 1 : 0, motion.spring.smooth),
    );
  }, [hidden, reduceMotion, away, motion.spring.smooth]);
  const slide = useAnimatedStyle(() => ({
    opacity: 1 - away.get(),
    transform: [{ translateY: away.get() * (TAB_BAR_HEIGHT + 40) }],
  }));
  const thumb = useAnimatedStyle(() => ({
    width: slot,
    transform: [{ translateX: 4 + x.get() * slot }, { scaleX: stretch.get() }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "box-none"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      style={[styles.wrap, { bottom: insets.bottom + spacing.sm }, slide]}
    >
      <Glass radius={radii.pill} style={styles.bar}>
        <View
          onLayout={(e) => {
            setWidth(e.nativeEvent.layout.width);
          }}
        >
          {width === 0 ? null : (
            <Animated.View pointerEvents="none" style={[styles.thumb, thumb]}>
              <Glass
                radius={radii.pill}
                tint="garnet"
                shadow={false}
                contentStyle={styles.thumbFill}
              >
                <View />
              </Glass>
            </Animated.View>
          )}
          <View {...rest} style={styles.row} accessibilityRole="tablist">
            {children}
          </View>
        </View>
      </Glass>
    </Animated.View>
  );
}

/** The five triggers, for the tabs layout (TabTrigger must sit directly in TabList). */
export function tabTriggers() {
  return TABS.map((t) => (
    <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
      <TabButton label={t.label} icon={t.icon} />
    </TabTrigger>
  ));
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 16 },
  bar: { width: "100%", maxWidth: 420 },
  row: { flexDirection: "row", height: TAB_BAR_HEIGHT, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  thumb: { position: "absolute", top: 6, height: TAB_BAR_HEIGHT - 12 },
  thumbFill: { height: TAB_BAR_HEIGHT - 14 },
});
