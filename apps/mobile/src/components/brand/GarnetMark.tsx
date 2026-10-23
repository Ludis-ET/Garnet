import { Image } from "expo-image";
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
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Crystal } from "@/components/brand/Crystal";
import { useSvgId } from "@/components/brand/svgId";
import { usePop } from "@/components/ui/motion";
import { artworkFiles } from "@/features/figures/art/artworkFiles";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

/** Garnet's face, cropped from the owner's image by scripts/make-garnet-brand.py (P-55). */
const FACE = artworkFiles["garnet-face"];

/** An arc of the ring, from `a0` to `a1` degrees (0 = top, clockwise). */
function arc(cx: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${cx + r * Math.cos(t)} ${cx + r * Math.sin(t)}`;
  };
  return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
}

/**
 * The Garnet mark (owner direction P-55): Garnet's face inside a glass disc, ringed with Ruby →
 * violet → Sapphire light. `progress` (0–3) lights the ring one third at a time (ruby, sapphire,
 * then the violet that joins them) for step-by-step flows; omitted, the ring is whole and
 * breathes softly. Without the owner's image the original crystal stands in (P-31 safeguard).
 * Decorative: screens name what it means.
 */
export function GarnetMark({
  size,
  progress,
  animated = true,
  dim = false,
}: {
  size: number;
  progress?: 0 | 1 | 2 | 3;
  animated?: boolean;
  /** Softer, for "not yet" moments (pairing before the partner joins). */
  dim?: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  const gid = useSvgId("mark-ring");
  const pop = usePop(progress ?? -1, 0.1);
  const breathe = useSharedValue(0);
  const live = animated && !reduceMotion && progress === undefined;
  useEffect(() => {
    if (!live) {
      breathe.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    breathe.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: ease }),
          withTiming(0, { duration: 2400, easing: ease }),
        ),
        -1,
      ),
    );
  }, [live, breathe]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + breathe.get() * 0.35,
    transform: [{ scale: 1 + breathe.get() * 0.06 }],
  }));

  const ring = Math.max(2, size * 0.055);
  const r = size / 2 - ring / 2;
  const inner = size - ring * 2 - Math.max(2, size * 0.03);
  const lit = progress ?? 3;
  const seg = (i: number, color: string) => (
    <Path
      key={i}
      d={arc(size / 2, r, i * 120 + 6, i * 120 + 114)}
      stroke={lit > i ? color : colors.glassRimEnd}
      strokeWidth={ring}
      strokeLinecap="round"
      fill="none"
    />
  );

  return (
    <Animated.View
      style={[{ width: size, height: size, opacity: dim ? 0.55 : 1 }, pop]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 1.5,
            height: size * 1.5,
            left: -size * 0.25,
            top: -size * 0.25,
            borderRadius: size,
          },
          { backgroundColor: colors.tintGarnet },
          glowStyle,
        ]}
      />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.ruby400} />
            <Stop offset="0.5" stopColor={palette.violet400} />
            <Stop offset="1" stopColor={palette.sapphire400} />
          </LinearGradient>
        </Defs>
        {progress === undefined ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${gid})`}
            strokeWidth={ring}
            fill="none"
          />
        ) : (
          [seg(0, palette.ruby400), seg(1, palette.sapphire400), seg(2, palette.violet400)]
        )}
      </Svg>
      <View
        style={[
          styles.disc,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            left: (size - inner) / 2,
            top: (size - inner) / 2,
            backgroundColor: colors.glassVeil,
            borderColor: colors.glassRimStart,
          },
        ]}
      >
        {FACE === undefined ? (
          <Crystal size={Math.round(inner * 0.6)} animated={false} />
        ) : (
          <Image
            source={FACE}
            contentFit="cover"
            contentPosition="top"
            style={{ width: inner * 1.06, height: inner * 1.06, marginTop: inner * 0.06 }}
            transition={reduceMotion ? 0 : 200}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute" },
  disc: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
