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
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { useSvgId } from "@/components/brand/svgId";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

export type CapsuleSide = "ruby" | "sapphire" | "garnet";
export type CapsuleVisualState =
  "sealed" | "ready" | "opening" | "opened" | "draft" | "unavailable";

interface GemCapsuleProps {
  side?: CapsuleSide;
  state?: CapsuleVisualState;
  size?: "sm" | "md" | "lg" | "hero";
  /** 0 (sealed) to 1 (flap open, letter risen), for the opening storyboard (OPEN-06). */
  splitProgress?: number;
  accessibilityLabel?: string;
}

const SIZES = {
  sm: { w: 104, h: 74 },
  md: { w: 150, h: 106 },
  lg: { w: 196, h: 138 },
  hero: { w: 240, h: 170 },
};

/** Art direction for the seal and paper tint (raw colours are allowed in art, theme/tokens.ts). */
const GEMS: Record<
  CapsuleSide,
  { seal: readonly [string, string, string]; paper: string; glow: string }
> = {
  ruby: { seal: ["#FF8DA1", "#E11D48", "#7F1131"], paper: "#FFF1F4", glow: "#FB7185" },
  sapphire: { seal: ["#9CC8FF", "#2563EB", "#172F7A"], paper: "#EEF4FF", glow: "#60A5FA" },
  garnet: { seal: ["#C9B5FF", "#7C4DF0", "#3B1A86"], paper: "#F4F0FF", glow: "#A78BFA" },
};

/**
 * An Open When letter as a glass-paper envelope closed with a gem seal in its author's colour
 * (OPEN-01, OPEN-05; redesign P-59). Sealed: still; ready: the seal glows and the envelope floats;
 * opening: the flap lifts and the letter rises (driven by `splitProgress`); opened: flap up,
 * letter showing; draft: a dashed outline with a pencil; unavailable: a faint outline only.
 * Never shows any of the letter's words. Decorative; the screen names the letter.
 */
export function GemCapsule({
  side = "garnet",
  state = "sealed",
  size = "md",
  splitProgress = 0,
  accessibilityLabel = "Letter",
}: GemCapsuleProps) {
  const { colors, scheme, reduceMotion } = useTheme();
  const { w, h } = SIZES[size];
  const gem = GEMS[side];
  const flapId = useSvgId("flap");
  const pocketId = useSvgId("pocket");
  const float = useSharedValue(0);
  const glow = useSharedValue(0);
  const ready = state === "ready";

  useEffect(() => {
    if (reduceMotion || !ready) {
      float.set(0);
      glow.set(ready ? 1 : 0);
      return;
    }
    float.set(
      withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    glow.set(
      withRepeat(
        withSequence(withTiming(1, { duration: 1100 }), withTiming(0.35, { duration: 1100 })),
        -1,
        false,
      ),
    );
  }, [ready, reduceMotion, float, glow]);

  const open = state === "opened" ? 1 : state === "opening" ? splitProgress : 0;
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -float.get() * 5 }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.get() * 0.85,
    transform: [{ scale: 0.9 + glow.get() * 0.35 }],
  }));

  if (state === "draft" || state === "unavailable") {
    const faint = state === "unavailable";
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.outline,
          {
            width: w,
            height: h,
            borderRadius: h * 0.14,
            borderColor: faint ? colors.glassRimEnd : gem.glow,
            opacity: faint ? 0.55 : 1,
          },
        ]}
      >
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Path
            d={`M4 6 L${String(w / 2)} ${String(h * 0.56)} L${String(w - 4)} 6`}
            stroke={faint ? colors.glassRimEnd : gem.glow}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            fill="none"
          />
        </Svg>
        {faint ? null : <Icon name="edit" size={Math.round(h * 0.24)} color={gem.seal[1]} />}
      </View>
    );
  }

  const seal = Math.round(h * 0.3);
  const tipY = h * 0.56;
  const paper = scheme === "dark" ? "#2A2433" : gem.paper;
  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: w, height: h + (open > 0 ? h * 0.42 : 0) }, styles.center, floatStyle]}
    >
      <View style={[styles.body, { width: w, height: h, marginTop: open > 0 ? h * 0.42 : 0 }]}>
        {/* The letter inside, rising as the flap opens. */}
        {open > 0 ? (
          <View
            style={[
              styles.letter,
              {
                left: w * 0.1,
                right: w * 0.1,
                height: h * 0.9,
                top: -h * 0.42 * open + h * 0.08,
                borderRadius: h * 0.06,
                backgroundColor: scheme === "dark" ? "#3A3346" : "#FFFFFF",
              },
            ]}
          >
            {[0.28, 0.42, 0.56].map((y) => (
              <View
                key={y}
                style={[styles.line, { top: h * y, backgroundColor: gem.glow, opacity: 0.35 }]}
              />
            ))}
          </View>
        ) : null}
        {/* Paper body with a soft side tint (no outline, P-67). */}
        <LinearGradient
          colors={[paper, scheme === "dark" ? "#1E1A26" : "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: h * 0.14 }]}
        />
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id={pocketId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gem.glow} stopOpacity={0.08} />
              <Stop offset="1" stopColor={gem.glow} stopOpacity={0.22} />
            </SvgGradient>
            <SvgGradient id={flapId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={paper} stopOpacity={1} />
              <Stop offset="1" stopColor={gem.glow} stopOpacity={0.28} />
            </SvgGradient>
          </Defs>
          {/* Front pocket. */}
          <Path
            d={`M1 ${String(h - 1)} L${String(w / 2)} ${String(h * 0.5)} L${String(w - 1)} ${String(h - 1)} Z`}
            fill={`url(#${pocketId})`}
          />
          {/* The flap: closed points down to the seal; open folds up behind the letter. */}
          {open < 1 ? (
            <Path
              d={`M1 1 L${String(w / 2)} ${String(tipY * (1 - open) + 1 * open)} L${String(w - 1)} 1 Z`}
              fill={`url(#${flapId})`}
              stroke={colors.glassRimEnd}
              strokeWidth={0.75}
            />
          ) : null}
        </Svg>
        {open > 0.5 ? null : (
          <View style={[styles.sealWrap, { top: tipY - seal / 2, left: w / 2 - seal / 2 }]}>
            {ready ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.glow,
                  {
                    width: seal * 2,
                    height: seal * 2,
                    borderRadius: seal,
                    backgroundColor: gem.glow,
                  },
                  glowStyle,
                ]}
              />
            ) : null}
            <LinearGradient
              colors={gem.seal}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{
                width: seal,
                height: seal,
                borderRadius: seal / 2,
                transform: [{ rotate: "45deg" }],
              }}
            >
              <View
                style={[
                  styles.facet,
                  { width: seal * 0.38, height: seal * 0.38, borderRadius: seal * 0.1 },
                ]}
              />
            </LinearGradient>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "flex-end" },
  body: {
    shadowColor: "#2B1240",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  outline: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  letter: { position: "absolute", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6 },
  line: { position: "absolute", left: "14%", right: "14%", height: 3, borderRadius: 2 },
  sealWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  facet: {
    position: "absolute",
    top: "14%",
    left: "14%",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
