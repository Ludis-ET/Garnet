import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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
import { GarnetMark } from "@/components/brand/GarnetMark";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { Glass } from "@/components/ui/Glass";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";

type Side = "ruby" | "sapphire";

const TILT: Record<Side, number> = { ruby: -7, sapphire: 7 };

function Window({
  side,
  width,
  height,
  delay,
}: {
  side: Side;
  width: number;
  height: number;
  delay: number;
}) {
  const { radii, motion, reduceMotion } = useTheme();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  // Ruby a little livelier, Sapphire calmer (master style motion).
  const spring = side === "ruby" ? motion.spring.ruby : motion.spring.sapphire;
  const period = side === "ruby" ? 5000 : 6000;

  useEffect(() => {
    if (reduceMotion) {
      enter.set(1);
      bob.set(0);
      return;
    }
    enter.set(withDelay(delay, withSpring(1, spring)));
    const ease = Easing.inOut(Easing.sin);
    bob.set(
      withRepeat(
        withSequence(
          withTiming(side === "ruby" ? 1 : -1, { duration: period / 2, easing: ease }),
          withTiming(side === "ruby" ? -1 : 1, { duration: period / 2, easing: ease }),
        ),
        -1,
        true,
      ),
    );
  }, [reduceMotion, enter, bob, delay, spring, period, side]);

  const paneStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.get() * 1.4),
    transform: [
      { translateY: (1 - enter.get()) * 40 + bob.get() * 4 },
      { rotate: `${TILT[side] * enter.get() + (1 - enter.get()) * TILT[side] * 2}deg` },
    ],
  }));
  const figureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hop.get() * 16 }],
  }));

  const onTap = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reduceMotion) return;
    hop.set(withSequence(withTiming(1, { duration: 140 }), withSpring(0, motion.spring.bouncy)));
  };

  const figureH = height * 0.92;
  return (
    <Animated.View style={paneStyle}>
      {/* Decorative: a tap makes the figure hop; screen readers skip it. */}
      <Pressable onPress={onTap} accessible={false} importantForAccessibility="no-hide-descendants">
        <Glass
          radius={radii.xl + 8}
          veil="soft"
          tint={side}
          contentStyle={[styles.window, { width, height }]}
        >
          <Animated.View style={figureStyle}>
            <CharacterSlot character={side} pose="wave" size={figureH} aspectRatio={FRAME_ASPECT} />
          </Animated.View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

/**
 * AUTH-01 hero (P-48): "two lives, seen through two windows of light, overlap into one space".
 * Ruby's rose-tinted pane and Sapphire's sky-tinted pane, tilted towards each other and
 * overlapping in the middle, where the Garnet crystal floats. Panes spring in, bob in
 * counter-phase, and a tap makes the figure hop. Everything holds still under reduced motion.
 * Characters come only through CharacterSlot (rule 5); with no image a gem placeholder shows.
 */
export function HeroWindows({ paneWidth }: { paneWidth: number }) {
  const { motion, reduceMotion } = useTheme();
  const paneHeight = Math.round(paneWidth * 1.4);
  const overlap = Math.round(paneWidth * 0.19);
  const crystal = Math.round(paneWidth * 0.38);
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    pop.set(reduceMotion ? 1 : withDelay(200, withSpring(1, motion.spring.bouncy)));
  }, [reduceMotion, pop, motion.spring.bouncy]);
  const crystalStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.get()),
    transform: [{ scale: 0.6 + pop.get() * 0.4 }],
  }));

  return (
    <View
      style={[styles.stage, { height: paneHeight + 48 }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.row, { marginRight: -overlap / 2 }]}>
        <Window side="ruby" width={paneWidth} height={paneHeight} delay={0} />
      </View>
      <View style={[styles.row, styles.front, { marginLeft: -overlap / 2 }]}>
        <Window side="sapphire" width={paneWidth} height={paneHeight} delay={80} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.crystal, { top: paneHeight * 0.06 }, crystalStyle]}
      >
        <GarnetMark size={Math.round(crystal * 1.25)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  row: { alignItems: "center" },
  front: { zIndex: 1 },
  window: { alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  crystal: { position: "absolute", alignSelf: "center", zIndex: 2 },
});
