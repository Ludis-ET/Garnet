import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

export type GiftState = "locked" | "ready" | "opened" | "withdrawn";

const SIZES = { sm: 76, md: 112, lg: 156 } as const;

/**
 * The surprise capsule (SUR-01, original motif): a glass gift box with a violet ribbon of
 * light and a little gem knot. Locked shows a soft lock; ready glows and bobs gently; opened
 * has its lid lifted; withdrawn is faded. `open` (0–1) drives the unwrap in SUR-06. Decorative:
 * the screen says what it means. Still under reduced motion.
 */
export function GiftCapsule({
  state,
  size = "md",
  open,
  tint = palette.violet500,
}: {
  state: GiftState;
  size?: keyof typeof SIZES;
  /** 0 closed → 1 unwrapped (the reveal); omitted follows the state. */
  open?: { get: () => number };
  tint?: string;
}) {
  const { reduceMotion } = useTheme();
  const s = SIZES[size];
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || state !== "ready") {
      glow.set(0);
      return;
    }
    glow.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, state, glow]);
  const lifted = state === "opened" ? 1 : 0;
  const box = useAnimatedStyle(() => ({
    transform: [{ translateY: -glow.get() * 4 }],
    shadowOpacity: 0.18 + glow.get() * 0.25,
  }));
  const lid = useAnimatedStyle(() => {
    const p = open?.get() ?? lifted;
    return {
      transform: [{ translateY: -p * s * 0.16 }, { rotate: `${String(-p * 10)}deg` }],
      opacity: 1 - p * 0.15,
    };
  });
  const ribbon = useAnimatedStyle(() => ({ opacity: 1 - (open?.get() ?? lifted) }));
  const faded = state === "withdrawn";
  const lidH = s * 0.26;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        // Room above for the lid to lift into when it opens.
        {
          width: s,
          height: s * 1.05,
          marginTop: s * 0.16,
          opacity: faded ? 0.45 : 1,
          shadowColor: tint,
        },
        box,
      ]}
    >
      {/* The box. */}
      <View style={[styles.body, { top: lidH * 0.8, borderRadius: s * 0.16 }]}>
        <LinearGradient
          colors={["#FFFFFF", `${tint}55`, `${tint}AA`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[styles.vRibbon, { left: s / 2 - s * 0.07, width: s * 0.14 }, ribbon]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.95)", tint, "rgba(255,255,255,0.9)"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {state === "locked" ? (
          <View
            style={[styles.lock, { width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13 }]}
          >
            <Icon name="lock" size={Math.round(s * 0.15)} color={tint} />
          </View>
        ) : null}
      </View>
      {/* The lid, with its bow and gem. */}
      <Animated.View style={[styles.lid, { height: lidH, borderRadius: s * 0.12 }, lid]}>
        <LinearGradient
          colors={["#FFFFFF", `${tint}66`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[styles.vRibbon, { left: s / 2 - s * 0.07, width: s * 0.14 }, ribbon]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.95)", tint]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View
          style={[
            styles.gem,
            {
              width: s * 0.18,
              height: s * 0.18,
              left: s / 2 - s * 0.09,
              top: -s * 0.09,
              backgroundColor: tint,
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  body: { position: "absolute", left: "6%", right: "6%", bottom: 0, overflow: "hidden" },
  lid: { position: "absolute", left: 0, right: 0, top: 0, overflow: "visible" },
  vRibbon: { position: "absolute", top: 0, bottom: 0, overflow: "hidden" },
  lock: {
    position: "absolute",
    right: "8%",
    bottom: "8%",
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  gem: { position: "absolute", transform: [{ rotate: "45deg" }], borderRadius: 4 },
});
