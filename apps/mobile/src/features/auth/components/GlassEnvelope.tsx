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
import Svg, { Path } from "react-native-svg";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

const W = 160;
const H = 116;
/** The arc the little sparkle travels along, above the envelope (quadratic Bézier). */
const ARC = { x0: 14, y0: 66, cx: 90, cy: -10, x1: 166, y1: 26 };
const ARC_H = 70;

/**
 * AUTH-04 art (P-48): a frosted glass envelope sealed with a small Garnet crystal, floating
 * gently, with a faint dashed arc of light and a sparkle travelling along it ("it's on its way").
 * Original motif. Holds still under reduced motion. Decorative.
 */
export function GlassEnvelope() {
  const { colors, radii, reduceMotion } = useTheme();
  const bob = useSharedValue(0);
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      bob.set(0);
      t.set(0.6);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    bob.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: ease }),
          withTiming(-1, { duration: 2600, easing: ease }),
        ),
        -1,
        true,
      ),
    );
    t.set(withRepeat(withTiming(1, { duration: 3000, easing: ease }), -1, false));
  }, [reduceMotion, bob, t]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() * 5 }] }));
  const sparkStyle = useAnimatedStyle(() => {
    const p = t.get();
    const q = 1 - p;
    const x = q * q * ARC.x0 + 2 * q * p * ARC.cx + p * p * ARC.x1;
    const y = q * q * ARC.y0 + 2 * q * p * ARC.cy + p * p * ARC.y1;
    return {
      opacity: Math.sin(p * Math.PI),
      transform: [{ translateX: x - 6 }, { translateY: y - 6 }],
    };
  });

  return (
    <View style={styles.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={W + 20} height={ARC_H} style={styles.arc}>
        <Path
          d={`M${ARC.x0} ${ARC.y0} Q${ARC.cx} ${ARC.cy} ${ARC.x1} ${ARC.y1}`}
          stroke={colors.accent}
          strokeOpacity={0.35}
          strokeWidth={1.5}
          strokeDasharray="3 6"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Animated.View style={[styles.spark, sparkStyle]}>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Path
            d="M12 0 14.5 9.5 24 12 14.5 14.5 12 24 9.5 14.5 0 12 9.5 9.5Z"
            fill={colors.accent}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={floatStyle}>
        <Glass radius={radii.xl} tint="garnet" contentStyle={{ width: W, height: H }}>
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            {/* Flap and the lower folds, as hairlines. */}
            <Path
              d={`M8 10 L${W / 2} ${H * 0.55} L${W - 8} 10`}
              stroke={colors.accent}
              strokeOpacity={0.45}
              strokeWidth={1.5}
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d={`M8 ${H - 10} L${W * 0.38} ${H * 0.48} M${W - 8} ${H - 10} L${W * 0.62} ${H * 0.48}`}
              stroke={colors.accent}
              strokeOpacity={0.2}
              strokeWidth={1.2}
              fill="none"
            />
          </Svg>
          <View style={[styles.seal, { top: H * 0.55 - 20 }]}>
            <GarnetMark size={34} animated={false} />
          </View>
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: W + 20, height: H + ARC_H, alignItems: "center", justifyContent: "flex-end" },
  arc: { position: "absolute", top: 0, left: 0 },
  spark: { position: "absolute", top: 0, left: 0 },
  seal: { position: "absolute", left: W / 2 - 17 },
});
