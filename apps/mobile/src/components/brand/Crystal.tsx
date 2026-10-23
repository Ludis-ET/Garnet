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
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop, Circle } from "react-native-svg";
import { usePop } from "@/components/ui/motion";
import { useSvgId } from "./svgId";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

export interface CrystalProps {
  size: number;
  /** Brighter halo (e.g. "Email verified"). */
  bright?: boolean;
  /** Slow float and breathing glow; off under reduced motion. */
  animated?: boolean;
  /**
   * Progress gem (P-48): how many facet groups are lit, in order ruby, sapphire, violet core.
   * Unlit groups are pale glass. Omitted means fully lit. Each new facet pops with a spring.
   */
  lit?: 0 | 1 | 2 | 3;
}

/**
 * The original Garnet crystal (master style: the hero object). Ruby light enters from the left,
 * Sapphire from the right, meeting as violet in the centre. Decorative: hidden from screen readers.
 */
export function Crystal({ size, bright = false, animated = true, lit = 3 }: CrystalProps) {
  const { reduceMotion, colors } = useTheme();
  const pop = usePop(lit, 0.14);
  const uid = useSvgId("crystal");
  const ref = (name: string) => `url(#${uid}-${name})`;
  // Unlit facets: frosted glass that still reads as a gem shape.
  const pale = colors.glassVeil;
  const ruby = lit >= 1 ? ref("facetRuby") : pale;
  const sapphire = lit >= 2 ? ref("facetSapphire") : pale;
  const violet = lit >= 3 ? ref("facetViolet") : pale;
  // Pavilion halves take their side's colour first, then deepen to violet when complete.
  const leftPavilion = lit >= 3 ? ref("facetDeep") : lit >= 1 ? ref("facetRuby") : pale;
  const rightPavilion = lit >= 3 ? ref("facetDeep") : lit >= 2 ? ref("facetSapphire") : pale;
  const live = animated && !reduceMotion;
  const glow = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (!live) {
      glow.set(0.5);
      float.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    glow.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: ease }),
          withTiming(0, { duration: 2600, easing: ease }),
        ),
        -1,
      ),
    );
    float.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3400, easing: ease }),
          withTiming(-1, { duration: 3400, easing: ease }),
        ),
        -1,
        true,
      ),
    );
  }, [live, glow, float]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: ((bright ? 0.75 : 0.45) + glow.get() * 0.25) * (lit === 0 ? 0.3 : lit / 3),
    transform: [{ scale: (bright ? 1.15 : 1) + glow.get() * 0.06 }],
  }));
  const gemStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.get() * size * 0.04 }],
  }));

  const halo = size * 2.2;
  return (
    <View
      style={{ width: size, height: size * 1.2, alignItems: "center", justifyContent: "center" }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width: halo, height: halo, left: (size - halo) / 2, top: (size * 1.2 - halo) / 2 },
          haloStyle,
        ]}
      >
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id={`${uid}-crystalHalo`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.violet400} stopOpacity={0.55} />
              <Stop offset="0.45" stopColor={palette.violet500} stopOpacity={0.18} />
              <Stop offset="1" stopColor={palette.violet500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={ref("crystalHalo")} />
        </Svg>
      </Animated.View>
      <Animated.View style={[gemStyle, pop]}>
        <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
          <Defs>
            <LinearGradient id={`${uid}-facetRuby`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={palette.ruby200} />
              <Stop offset="1" stopColor={palette.ruby500} />
            </LinearGradient>
            <LinearGradient id={`${uid}-facetSapphire`} x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.cyanGlow} />
              <Stop offset="1" stopColor={palette.sapphire500} />
            </LinearGradient>
            <LinearGradient id={`${uid}-facetViolet`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.violet200} />
              <Stop offset="1" stopColor={palette.violet500} />
            </LinearGradient>
            <LinearGradient id={`${uid}-facetDeep`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.violet500} />
              <Stop offset="1" stopColor={palette.garnet800} />
            </LinearGradient>
          </Defs>
          {/* Crown */}
          <Path d="M10 44 30 20 50 44Z" fill={ruby} />
          <Path d="M30 20H70L50 44Z" fill={violet} />
          <Path d="M70 20 90 44H50Z" fill={sapphire} />
          {/* Pavilion */}
          <Path d="M10 44H50L50 114Z" fill={leftPavilion} opacity={0.95} />
          <Path d="M10 44 30 44 50 114Z" fill={ruby} opacity={0.55} />
          <Path d="M50 44H90L50 114Z" fill={rightPavilion} opacity={0.85} />
          <Path d="M70 44H90L50 114Z" fill={sapphire} opacity={0.5} />
          {/* Facet lines and a highlight */}
          <Path
            d="M10 44H90M30 20 50 44 70 20M30 44 50 114 70 44M50 44V114"
            stroke={lit === 3 ? palette.white : colors.textTertiary}
            strokeOpacity={lit === 3 ? 0.35 : 0.3}
            strokeWidth={0.8}
            fill="none"
          />
          <Path d="M34 24 44 24 38 34Z" fill={palette.white} opacity={0.7} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ halo: { position: "absolute" } });
