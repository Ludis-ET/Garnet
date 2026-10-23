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
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { useSvgId } from "@/components/brand/svgId";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

export type LightPathState = "waiting" | "found" | "connected";

const H = 120;
const LIGHT = 30;

/** A point on the quadratic arc from an end light down to the crystal (t: 0 at the light). */
function arcPoint(t: number, fromX: number, midX: number) {
  "worklet";
  const y0 = H * 0.42;
  const yc = H * 0.95;
  const y1 = H * 0.62;
  const cx = (fromX + midX) / 2;
  const q = 1 - t;
  return {
    x: q * q * fromX + 2 * q * t * cx + t * t * midX,
    y: q * q * y0 + 2 * q * t * yc + t * t * y1,
  };
}

function Spark({
  t,
  offset,
  fromX,
  midX,
  color,
}: {
  t: SharedValue<number>;
  offset: number;
  fromX: number;
  midX: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = (t.get() + offset) % 1;
    const { x, y } = arcPoint(p, fromX, midX);
    return {
      opacity: Math.sin(p * Math.PI),
      transform: [{ translateX: x - 3 }, { translateY: y - 3 }],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: color }, style]} />;
}

function GemLight({
  id,
  color,
  lit,
  x,
}: {
  id: "ruby" | "sapphire";
  color: string;
  lit: boolean;
  x: number;
}) {
  const { reduceMotion } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!lit || reduceMotion) {
      pulse.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: ease }),
          withTiming(0, { duration: 1800, easing: ease }),
        ),
        -1,
      ),
    );
  }, [lit, reduceMotion, pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: lit ? 0.85 + pulse.get() * 0.15 : 0.35,
    transform: [{ scale: lit ? 1 + pulse.get() * 0.12 : 0.85 }],
  }));
  const size = LIGHT * 2.4;
  const gid = useSvgId(`light-${id}`);
  return (
    <Animated.View style={[styles.light, { left: x - size / 2, top: H * 0.42 - size / 2 }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.white} stopOpacity={1} />
            <Stop offset="0.22" stopColor={color} stopOpacity={1} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * PAIR motif (P-49): "two lights find each other". A ruby light (left) and a sapphire light
 * (right), joined by a dotted arc that dips through the Garnet mark (P-55), with sparks flowing
 * toward the centre. waiting: only ruby lit; found: both lit; connected: the mark's ring is whole
 * and bright. Sparks stop under reduced motion. Decorative.
 */
export function LightPath({ state, width }: { state: LightPathState; width: number }) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(0);
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    draw.set(reduceMotion ? 1 : withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    if (reduceMotion) {
      t.set(0);
      return;
    }
    t.set(withDelay(500, withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1)));
  }, [reduceMotion, t, draw]);
  const drawStyle = useAnimatedStyle(() => ({ opacity: draw.get() }));

  const left = width * 0.12;
  const right = width * 0.88;
  const mid = width / 2;
  const both = state !== "waiting";
  const path = (fromX: number) => {
    const a = arcPoint(0, fromX, mid);
    const c = { x: (fromX + mid) / 2, y: H * 0.95 };
    const b = arcPoint(1, fromX, mid);
    return `M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`;
  };
  const lit = state === "waiting" ? 1 : state === "found" ? 2 : 3;

  return (
    <View
      style={{ width, height: H }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFill, drawStyle]}>
        <Svg width={width} height={H}>
          {[left, right].map((x) => (
            <Path
              key={x}
              d={path(x)}
              stroke={x === left ? palette.ruby400 : palette.sapphire400}
              strokeOpacity={x === left || both ? 0.55 : 0.18}
              strokeWidth={2}
              strokeDasharray="1 7"
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </Svg>
        {reduceMotion ? null : (
          <>
            {[0, 0.33, 0.66].map((o) => (
              <Spark
                key={`r${o}`}
                t={t}
                offset={o}
                fromX={left}
                midX={mid}
                color={palette.ruby400}
              />
            ))}
            {both
              ? [0.16, 0.5, 0.83].map((o) => (
                  <Spark
                    key={`s${o}`}
                    t={t}
                    offset={o}
                    fromX={right}
                    midX={mid}
                    color={palette.sapphire400}
                  />
                ))
              : null}
          </>
        )}
      </Animated.View>
      <GemLight id="ruby" color={palette.ruby400} lit x={left} />
      <GemLight id="sapphire" color={palette.sapphire400} lit={both} x={right} />
      <View style={[styles.crystal, { left: mid - 24, top: H * 0.62 - 24 }]}>
        <GarnetMark size={48} progress={lit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { position: "absolute", top: 0, left: 0, width: 6, height: 6, borderRadius: 3 },
  light: { position: "absolute" },
  crystal: { position: "absolute" },
});
