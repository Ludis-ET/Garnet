import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  useReanimatedFocusedInput,
  useReanimatedKeyboardAnimation,
  useWindowDimensions,
} from "react-native-keyboard-controller";
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Aurora } from "@/components/brand/Aurora";
import { SideWash } from "@/components/brand/SideWash";
import { Header } from "@/components/ui/Header";
import { OfflineBanner } from "@/components/ui/Notice";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Room for the floating tab bar (64 pt plus breathing space) and Ruby and Sapphire peeking
 * over it (62 pt, P-57), so the last item can always scroll clear of them.
 */
export const TAB_BAR_SPACE = 150;

/** Space kept between the focused field (its helper or error line too) and the keyboard. */
const KEYBOARD_GAP = 96;

export interface GlassScreenProps {
  children: ReactNode;
  /** The action dock, pinned under the content; rises above the keyboard. */
  footer?: ReactNode;
  onBack?: () => void;
  /** Extra content in the header row next to Back (the create-account progress bar). */
  header?: ReactNode;
  /** A control at the right end of the header row (the account button during onboarding). */
  headerRight?: ReactNode;
  /**
   * A soft wash of a side's colour over the aurora (SETUP-03 "side flood", P-51). "none" keeps
   * the plain aurora even with the "rich" look (forms that sit on glass, P-63).
   */
  wash?: "ruby" | "sapphire" | "none" | null;
  /** Leaves room for the floating tab bar (tab screens). */
  tabBar?: boolean;
}

/**
 * Shared screen layout in Daylight Glass (P-48), used by account and onboarding screens: the
 * opaque aurora canvas (so
 * nothing from a previous screen shows through), safe areas, keyboard-safe scrolling, a centred
 * column no wider than 440 pt, an optional header with a glass Back button, the offline notice,
 * and the action dock. Forms keep taps inside the keyboard ("handled").
 */
export function GlassScreen({
  children,
  footer,
  onBack,
  header,
  headerRight,
  wash = null,
  tabBar = false,
}: GlassScreenProps) {
  const { spacing, scheme, side, intensity } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Keyboard handling (production-fix-plan K2), with nothing clipped: a real spacer as tall as
  // the keyboard ends the content, so everything can scroll above it, and the focused field is
  // brought into view once, in step with the keyboard. With the keyboard closed the spacer is
  // zero. (The library's KeyboardAwareScrollView clipped part of the page on Android.)
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // Where the page is scrolled to, kept from its own scroll events.
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });
  const keyboard = useReanimatedKeyboardAnimation();
  const { input } = useReanimatedFocusedInput();
  const startOffset = useSharedValue(0);
  const bottomInset = insets.bottom;
  const spacerStyle = useAnimatedStyle(() => ({
    height: Math.max(0, Math.abs(keyboard.height.value) - bottomInset),
  }));
  useAnimatedReaction(
    () => Math.abs(keyboard.height.value),
    (now, before) => {
      if (before === null || now <= before) return;
      if (before === 0) startOffset.value = offset.value;
      const layout = input.value?.layout;
      if (layout === undefined) return;
      const fieldBottom = layout.absoluteY + layout.height + KEYBOARD_GAP;
      const visibleBottom = windowHeight - now;
      if (fieldBottom > visibleBottom)
        scrollTo(scrollRef, 0, startOffset.value + (fieldBottom - visibleBottom), false);
    },
  );
  // A "rich" look (SETUP-06) washes personal pages in the person's own colour.
  const flood =
    wash === "none"
      ? null
      : (wash ?? (intensity === "rich" && (side === "ruby" || side === "sapphire") ? side : null));
  return (
    <View style={styles.fill}>
      <Aurora />
      <SideWash side="ruby" on={flood === "ruby"} />
      <SideWash side="sapphire" on={flood === "sapphire"} />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          testID="glass-screen-scroll"
          style={styles.fill}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: spacing.gutter,
              paddingBottom: tabBar ? TAB_BAR_SPACE : spacing.md,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          showsVerticalScrollIndicator={false}
        >
          <View
            testID="glass-screen-column"
            style={[styles.column, { gap: spacing.xl, paddingTop: spacing.sm }]}
          >
            {onBack !== undefined || header !== undefined || headerRight !== undefined ? (
              <Header
                {...(onBack === undefined ? {} : { onBack })}
                {...(headerRight === undefined ? {} : { right: headerRight })}
              >
                {header}
              </Header>
            ) : null}
            <OfflineBanner />
            <View testID="glass-screen-body" style={[styles.body, { gap: spacing.xl }]}>
              {children}
            </View>
            {footer === undefined ? null : <View style={{ gap: spacing.md }}>{footer}</View>}
          </View>
          <Animated.View style={spacerStyle} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Scrolling rule: inside a ScrollView, grow but never shrink. `flex: 1` means "start at zero
  // and shrink to fit", so on web the content squeezes into one screen and can't scroll.
  // `flexGrow: 1` fills short screens and grows past the fold on long ones (tested).
  scroll: { flexGrow: 1 },
  column: { flexGrow: 1, width: "100%", maxWidth: 440, alignSelf: "center" },
  body: { flexGrow: 1 },
});
