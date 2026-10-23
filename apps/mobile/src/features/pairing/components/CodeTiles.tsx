import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { usePop, useShake } from "@/components/ui/motion";
import { INVITE_CODE_LENGTH } from "@/domain/pairing";
import { useTheme } from "@/theme/ThemeProvider";

export type CodeTone = "normal" | "error" | "muted";

function Caret() {
  const { colors, reduceMotion } = useTheme();
  const blink = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    blink.set(
      withRepeat(
        withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })),
        -1,
      ),
    );
  }, [reduceMotion, blink]);
  const style = useAnimatedStyle(() => ({ opacity: blink.get() }));
  return <Animated.View style={[styles.caret, { backgroundColor: colors.accent }, style]} />;
}

function Tile({
  char,
  index,
  width,
  active,
  tone,
  rippleKey,
  checking,
}: {
  char: string;
  index: number;
  width: number;
  active: boolean;
  tone: CodeTone;
  rippleKey: unknown;
  checking: boolean;
}) {
  const { colors, motion, reduceMotion } = useTheme();
  const pop = usePop(char === "" ? null : char, 0.16);
  const ripple = useSharedValue(1);
  const shimmer = useSharedValue(1);

  useEffect(() => {
    if (rippleKey === undefined || reduceMotion) return;
    ripple.set(
      withDelay(
        index * 30,
        withSequence(withTiming(1.08, { duration: 120 }), withSpring(1, motion.spring.bouncy)),
      ),
    );
  }, [rippleKey, reduceMotion, ripple, index, motion.spring.bouncy]);

  useEffect(() => {
    if (!checking || reduceMotion) {
      shimmer.set(withTiming(1, { duration: 150 }));
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    shimmer.set(
      withDelay(
        index * 70,
        withRepeat(
          withSequence(
            withTiming(0.45, { duration: 380, easing: ease }),
            withTiming(1, { duration: 380, easing: ease }),
          ),
          -1,
        ),
      ),
    );
  }, [checking, reduceMotion, shimmer, index]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: ripple.get() }],
    opacity: shimmer.get(),
  }));
  const ring = tone === "error" ? colors.danger : active ? colors.accent : null;
  return (
    <Animated.View style={style}>
      <Animated.View style={pop}>
        {ring === null ? null : (
          <View
            pointerEvents="none"
            style={[styles.halo, { borderColor: ring, opacity: tone === "error" ? 0.3 : 0.22 }]}
          />
        )}
        <Glass
          radius={12}
          shadow={false}
          contentStyle={[styles.tile, { width, height: width * 1.3 }]}
        >
          {char === "" ? (
            active ? (
              <Caret />
            ) : null
          ) : (
            <AppText variant="code" color={tone === "muted" ? "textTertiary" : "textPrimary"}>
              {char}
            </AppText>
          )}
          {ring === null ? null : (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.ring, { borderColor: ring }]}
            />
          )}
        </Glass>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Eight glass tiles in two groups of four (PAIR-02, PAIR-03; P-49). Showing your own code, a new
 * `rippleKey` ripples the tiles left to right (copied). Entering a code, the active tile shows a
 * caret and halo and each new character pops in; a new `shakeKey` shakes the row once (not under
 * reduced motion); `checking` shimmers the tiles. Decorative: the caller labels the code.
 */
export function CodeTiles({
  code,
  activeIndex = -1,
  tone = "normal",
  rippleKey,
  shakeKey,
  checking = false,
}: {
  code: string;
  activeIndex?: number;
  tone?: CodeTone;
  rippleKey?: unknown;
  shakeKey?: unknown;
  checking?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const shake = useShake(shakeKey);
  const gap = 6;
  const dash = 14;
  // Fits inside a padded glass card on the narrowest phones (375 pt).
  const available = Math.min(width, 440) - spacing.gutter * 2 - spacing.xl * 2;
  const tileWidth = Math.floor(
    Math.min(42, (available - gap * 6 - dash - gap * 2) / INVITE_CODE_LENGTH),
  );
  const chars = Array.from({ length: INVITE_CODE_LENGTH }, (_, i) => code[i] ?? "");
  const tile = (i: number) => (
    <Tile
      key={i}
      char={chars[i] ?? ""}
      index={i}
      width={tileWidth}
      active={i === activeIndex}
      tone={tone}
      rippleKey={rippleKey}
      checking={checking}
    />
  );
  return (
    <Animated.View
      style={[styles.row, { gap }, shake]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1, 2, 3].map(tile)}
      <View style={[styles.dash, { width: dash, backgroundColor: colors.textTertiary }]} />
      {[4, 5, 6, 7].map(tile)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  tile: { alignItems: "center", justifyContent: "center" },
  ring: { borderRadius: 12, borderWidth: 1.5 },
  halo: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    borderWidth: 4,
  },
  caret: { width: 2, height: 26, borderRadius: 1 },
  dash: { height: 2, borderRadius: 1, opacity: 0.6 },
});
