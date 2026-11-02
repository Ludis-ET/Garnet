import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import type { CompanionLook } from "@/domain/companion";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { TAB_BAR_HEIGHT } from "@/features/tabs/GlassTabBar";
import { useTheme } from "@/theme/ThemeProvider";
import { useSettings } from "@/features/settings/useSettings";
import { useCompanions } from "./useCompanions";
import { ENTER } from "@/theme/transitions";

/** Rendered height of each watcher; the lower part tucks behind the tab bar. */
export const WATCHER_HEIGHT = 104;
/** How much of a watcher shows above the tab bar (screens leave this much extra room). */
export const WATCHER_PEEK = 62;

function Watcher({
  character,
  look,
  side,
  delay,
}: {
  character: "ruby" | "sapphire";
  look: CompanionLook;
  side: "left" | "right";
  delay: number;
}) {
  const { reduceMotion } = useTheme();
  const bob = useSharedValue(0);
  const peek = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    // A slow breath, and every so often a little rise to look over the bar.
    bob.set(
      withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );
    peek.set(
      withDelay(
        delay * 3 + 4000,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 520, easing: Easing.out(Easing.back(2)) }),
            withTiming(1, { duration: 1400 }),
            withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 7000 }),
          ),
          -1,
          false,
        ),
      ),
    );
  }, [reduceMotion, bob, peek, delay]);
  const tilt = side === "left" ? 1 : -1;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -bob.get() * 3 - peek.get() * 12 },
      // Leaning in towards the page, as if watching.
      { rotate: `${String(tilt * (2 + peek.get() * 4))}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.watcher, side === "left" ? styles.left : styles.right, style]}>
      <CharacterSlot
        character={character}
        look={look}
        size={WATCHER_HEIGHT}
        aspectRatio={FRAME_ASPECT}
      />
    </Animated.View>
  );
}

/**
 * Ruby and Sapphire peeking over the tab bar on every tab page, as if watching over the two of
 * you (owner direction P-57). Both show only once both people use the app; until the partner has
 * joined and finished setup, only the viewer's own gem watches (P-63). Each one's picture follows its own person's day (time, date,
 * shared feelings and recent signals); a hard day shows a hug, never sadness. Decorative: no
 * touches, hidden from screen readers, still under reduced motion. Hidden on full-screen pages.
 */
export function Watchers({ hidden }: { hidden: boolean }) {
  const insets = useSafeAreaInsets();
  const { spacing, reduceMotion } = useTheme();
  const looks = useCompanions();
  // Each person can put them away (Settings › Home, P-66).
  const shown = useSettings().data?.settings.home.watchers ?? true;
  if (hidden || !shown || looks.mySide === null) return null;
  const both = looks.partnerActive;
  const showSapphire = both || looks.mySide === "sapphire";
  const showRuby = both || looks.mySide === "ruby";
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      {...(reduceMotion ? {} : { entering: ENTER })}
      style={[
        styles.row,
        {
          bottom: insets.bottom + spacing.sm + TAB_BAR_HEIGHT - (WATCHER_HEIGHT - WATCHER_PEEK),
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          !both && { justifyContent: looks.mySide === "ruby" ? "flex-end" : "flex-start" },
        ]}
      >
        {showSapphire ? (
          <Watcher character="sapphire" look={looks.sapphire} side="left" delay={0} />
        ) : null}
        {showRuby ? <Watcher character="ruby" look={looks.ruby} side="right" delay={700} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  inner: {
    width: "100%",
    maxWidth: 452,
    height: WATCHER_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
  },
  watcher: { height: WATCHER_HEIGHT },
  left: { transformOrigin: "bottom center" },
  right: { transformOrigin: "bottom center" },
});
