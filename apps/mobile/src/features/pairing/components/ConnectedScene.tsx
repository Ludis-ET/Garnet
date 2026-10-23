import * as Haptics from "expo-haptics";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { Glass } from "@/components/ui/Glass";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";

/** 0 gliding · 1 ruby facet · 2 sapphire facet · 3 violet core · 4 bloom (final frame). */
export type ConnectPhase = 0 | 1 | 2 | 3 | 4;

/** When each phase starts, in ms after the glide begins (about 1.2 s in all). */
const TIMELINE: readonly [ConnectPhase, number][] = [
  [1, 620],
  [2, 740],
  [3, 860],
  [4, 1000],
];

function Pane({
  side,
  glide,
  paneWidth,
  travel,
}: {
  side: "ruby" | "sapphire";
  glide: SharedValue<number>;
  paneWidth: number;
  travel: number;
}) {
  const { radii } = useTheme();
  const dir = side === "ruby" ? -1 : 1;
  const style = useAnimatedStyle(() => {
    const g = glide.get();
    return {
      opacity: Math.min(1, 0.2 + g * 1.2),
      transform: [
        { translateX: (1 - g) * travel * dir },
        { rotate: `${dir * (4 + (1 - g) * 8)}deg` },
      ],
    };
  });
  const height = Math.round(paneWidth * 1.4);
  return (
    <Animated.View style={[side === "sapphire" && styles.front, style]}>
      <Glass
        radius={radii.xl + 8}
        veil="soft"
        tint={side}
        contentStyle={[styles.pane, { width: paneWidth, height }]}
      >
        <CharacterSlot
          character={side}
          pose="happy"
          size={height * 0.92}
          aspectRatio={FRAME_ASPECT}
        />
      </Glass>
    </Animated.View>
  );
}

/**
 * PAIR-05 celebration (P-49): Ruby's and Sapphire's glass windows glide in from the screen edges
 * and overlap; the Garnet crystal lights facet by facet (ruby, sapphire, violet core), then
 * blooms with sparkles and a success haptic. About 1.2 s; a tap anywhere jumps to the final
 * frame, and reduced motion starts there. `onSettled` fires once the final frame is reached.
 */
export function ConnectedScene({ onSettled }: { onSettled?: () => void }) {
  const { motion, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const paneWidth = Math.round(Math.min(150, width * 0.36));
  const travel = width * 0.6;
  const glide = useSharedValue(reduceMotion ? 1 : 0);
  const [phase, setPhase] = useState<ConnectPhase>(reduceMotion ? 4 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settled = useRef(false);

  const settle = () => {
    if (settled.current) return;
    settled.current = true;
    if (Platform.OS !== "web")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSettled?.();
  };

  const settleFromEffect = useEffectEvent(settle);
  useEffect(() => {
    if (reduceMotion) {
      settleFromEffect();
      return;
    }
    glide.set(withSpring(1, motion.spring.smooth));
    const ids = TIMELINE.map(([p, at]) =>
      setTimeout(() => {
        setPhase(p);
        if (p === 4) settleFromEffect();
      }, at),
    );
    timers.current = ids;
    return () => {
      ids.forEach(clearTimeout);
    };
  }, [reduceMotion, glide, motion.spring.smooth]);

  const skip = () => {
    if (phase === 4) return;
    timers.current.forEach(clearTimeout);
    glide.set(1);
    setPhase(4);
    settle();
  };

  const lit = phase === 4 ? 3 : phase;
  return (
    <Pressable
      onPress={skip}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.stage}
    >
      <View style={[styles.row, { marginRight: -paneWidth * 0.1 }]}>
        <Pane side="ruby" glide={glide} paneWidth={paneWidth} travel={travel} />
      </View>
      <View style={[styles.row, styles.front, { marginLeft: -paneWidth * 0.1 }]}>
        <Pane side="sapphire" glide={glide} paneWidth={paneWidth} travel={travel} />
      </View>
      <View pointerEvents="none" style={styles.crystal}>
        <GarnetMark size={Math.round(paneWidth * 0.5)} progress={lit} />
        <SparkleBurst play={phase === 4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  row: { alignItems: "center" },
  front: { zIndex: 1 },
  pane: { alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  crystal: { position: "absolute", top: 0, alignSelf: "center", alignItems: "center", zIndex: 2 },
});
