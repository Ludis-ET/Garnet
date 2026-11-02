import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
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
import type { CharacterId } from "@/components/character/characterAssets";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import type { CompanionLook } from "@/domain/companion";
import type { GemSide } from "@/domain/identity";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";
import { EXIT, POP } from "@/theme/transitions";

/** A person's character: their gem, or Garnet before they choose. */
export function gemOf(side: GemSide | null): CharacterId {
  return side ?? "garnet";
}

/** Three soft dots that rise and fall in turn ("Noah is typing"). Still under reduced motion. */
export function TypingDots({ color }: { color: string }) {
  const { reduceMotion } = useTheme();
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} i={i} color={color} still={reduceMotion} />
      ))}
    </View>
  );
}

function Dot({ i, color, still }: { i: number; color: string; still: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    y.set(
      withDelay(
        i * 140,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 260 }),
          ),
          -1,
          false,
        ),
      ),
    );
  }, [i, still, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -y.get() * 5 }],
    opacity: 0.45 + y.get() * 0.55,
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/**
 * A character popping up from behind the composer, like a little avatar joining in (P-58):
 * springs up, sways while it stays, drops back down when it leaves. Decorative; the words next
 * to it (or the screen) carry the meaning.
 */
export function PeekCharacter({
  character,
  look,
  size,
  side,
  bubble,
}: {
  character: CharacterId;
  look: CompanionLook;
  size: number;
  side: "left" | "right";
  /** A small glass bubble next to the head (typing dots, a wave). */
  bubble?: ReactNode;
}) {
  const { reduceMotion, motion } = useTheme();
  const sway = useSharedValue(0);
  const hop = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    hop.set(withSequence(withTiming(1, { duration: 160 }), withSpring(0, motion.spring.bouncy)));
    sway.set(
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [reduceMotion, sway, hop, motion.spring.bouncy, look.mood]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -hop.get() * 10 },
      { rotate: `${String((side === "left" ? 1 : -1) * (sway.get() * 4 - 1))}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      {...(reduceMotion ? {} : { entering: POP, exiting: EXIT })}
      style={[styles.peek, side === "left" ? styles.peekLeft : styles.peekRight]}
    >
      {side === "right" && bubble !== undefined ? (
        <View style={styles.bubbleLeft}>{bubble}</View>
      ) : null}
      <Animated.View style={[styles.figure, style]}>
        <CharacterSlot character={character} look={look} size={size} aspectRatio={FRAME_ASPECT} />
      </Animated.View>
      {side === "left" && bubble !== undefined ? (
        <View style={styles.bubbleRight}>{bubble}</View>
      ) : null}
    </Animated.View>
  );
}

/** The glass bubble a peeking character "says" (dots or a short word). */
export function PeekBubble({ children }: { children: ReactNode }) {
  const { radii } = useTheme();
  return (
    <Glass radius={radii.pill} contentStyle={styles.bubble}>
      {typeof children === "string" ? (
        <AppText variant="callout" weight="600">
          {children}
        </AppText>
      ) : (
        children
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", alignItems: "center", gap: 5, height: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  peek: { position: "absolute", bottom: 0, flexDirection: "row", alignItems: "flex-end" },
  peekLeft: { left: 10 },
  peekRight: { right: 10 },
  figure: { transformOrigin: "bottom center" },
  bubbleRight: { marginLeft: -6, marginBottom: 44 },
  bubbleLeft: { marginRight: -6, marginBottom: 44 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, minHeight: 36, justifyContent: "center" },
});
