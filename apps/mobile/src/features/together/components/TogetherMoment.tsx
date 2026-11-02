import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { ENTER } from "@/theme/transitions";

/**
 * WORLD-03 · The together moment (prompt 13): a ruby light from the left and a sapphire light
 * from the right meet in the middle and become Garnet's mark, with Garnet softly behind and a
 * line under it. About 1.2 s, original motion, tap anywhere to skip; a still frame under
 * reduced motion. Garnet is shown only from the owner's images (P-44); without them, the mark.
 */
export function TogetherMoment({
  line,
  sub,
  onDone,
}: {
  line: string;
  sub?: string;
  onDone: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  const show = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    p.set(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
    show.set(withDelay(700, withTiming(1, { duration: 500 })));
  }, [reduceMotion, p, show]);
  const left = useAnimatedStyle(() => ({
    transform: [{ translateX: -140 * (1 - p.get()) }, { scale: 1 - p.get() * 0.4 }],
    opacity: 1 - show.get(),
  }));
  const right = useAnimatedStyle(() => ({
    transform: [{ translateX: 140 * (1 - p.get()) }, { scale: 1 - p.get() * 0.4 }],
    opacity: 1 - show.get(),
  }));
  const center = useAnimatedStyle(() => ({
    opacity: show.get(),
    transform: [{ scale: 0.7 + show.get() * 0.3 }],
  }));
  return (
    <Modal visible transparent animationType="none" onRequestClose={onDone} statusBarTranslucent>
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={`${line} Continue`}
        style={[styles.fill, { backgroundColor: colors.scrim }]}
      >
        <Animated.View entering={ENTER} style={[styles.fill, styles.center]}>
          <View style={styles.stage}>
            <Animated.View style={[styles.figure, center]} pointerEvents="none">
              <CharacterSlot
                character="garnet"
                look={{ mood: "celebrating", occasion: "everyday" }}
                size={220}
                aspectRatio={FRAME_ASPECT}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.light,
                { backgroundColor: palette.ruby400, shadowColor: palette.ruby400 },
                left,
              ]}
            />
            <Animated.View
              style={[
                styles.light,
                { backgroundColor: palette.sapphire400, shadowColor: palette.sapphire400 },
                right,
              ]}
            />
            <Animated.View style={center}>
              <GarnetMark size={96} />
            </Animated.View>
            {reduceMotion ? null : <SparkleBurst play delay={700} />}
          </View>
          <Animated.View style={[styles.words, center]}>
            <AppText variant="title" serif style={[styles.textCenter, styles.white]}>
              {line}
            </AppText>
            {sub === undefined ? null : (
              <AppText variant="callout" style={[styles.textCenter, styles.whiteSoft]}>
                {sub}
              </AppText>
            )}
            <AppText variant="caption" style={[styles.textCenter, styles.whiteSoft]}>
              Tap to continue
            </AppText>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  stage: { width: 300, height: 300, alignItems: "center", justifyContent: "center" },
  figure: { position: "absolute", bottom: 40, opacity: 0.9 },
  light: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  words: { gap: 8, paddingHorizontal: 32 },
  textCenter: { textAlign: "center" },
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.85)" },
});
