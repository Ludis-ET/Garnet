import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDecay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { useSvgId } from "@/components/brand/svgId";
import { AppText } from "@/components/ui/AppText";
import { CountBadge } from "@/components/ui/CountBadge";
import { Glass } from "@/components/ui/Glass";
import type { CompanionLook } from "@/domain/companion";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

/** A spark flying into the crystal: from the buttons below (you) or from the side (partner). */
export interface HeroPulse {
  key: number;
  from: "me" | "partner";
  color: string;
}

/** A shortcut riding the ring around Garnet (P-57). */
export interface HeroShortcut {
  id: string;
  emoji: string;
  label: string;
  onPress: () => void;
  /** This person's own count on the bead (unread messages, letters to open; P-66). */
  badge?: number;
}

const LIGHT = 30;
const CHIP = 50;
/** Radians per second the ring drifts on its own. */
const DRIFT = 0.16;

function OrbitLight({
  t,
  phase,
  size,
  left,
  color,
  id,
}: {
  t: SharedValue<number>;
  phase: number;
  size: number;
  left: number;
  color: string;
  id: string;
}) {
  const gid = useSvgId(`orbit-${id}`);
  const style = useAnimatedStyle(() => {
    const a = t.get() * 2 * Math.PI + phase;
    // A tilted ring: wide and shallow, nearer (bigger, brighter) in front.
    const depth = Math.sin(a);
    return {
      // Behind Garnet on the far side of the ring, in front of her on the near side.
      zIndex: depth > 0 ? 3 : 1,
      opacity: 0.55 + (depth + 1) * 0.225,
      transform: [
        { translateX: Math.cos(a) * size * 0.36 },
        { translateY: depth * size * 0.12 },
        { scale: 0.75 + (depth + 1) * 0.2 },
      ],
    };
  });
  const s = LIGHT * 2;
  return (
    <Animated.View
      style={[styles.light, { left: left + size / 2 - s / 2, top: size / 2 - s / 2 }, style]}
    >
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.white} stopOpacity={1} />
            <Stop offset="0.25" stopColor={color} stopOpacity={1} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={s / 2} cy={s / 2} r={s / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * One shortcut on the ring: a glass bead with an emoji, nearer (bigger, brighter, in front of
 * Garnet) at the bottom of the ellipse and smaller behind her at the top; its name shows when
 * it comes round to the front. Behind the orb it fades away completely (the glass is see-through,
 * so a bead "behind" it would otherwise still show) and can't be tapped there.
 */
function RingChip({
  item,
  index,
  count,
  drift,
  drag,
  cx,
  cy,
  rx,
  ry,
  orbY,
  orbR,
  still,
}: {
  item: HeroShortcut;
  index: number;
  count: number;
  drift: SharedValue<number>;
  drag: SharedValue<number>;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  orbY: number;
  orbR: number;
  /** Reduced motion: the ring holds still, so every bead stays in front and visible. */
  still: boolean;
}) {
  const { radii } = useTheme();
  const style = useAnimatedStyle(() => {
    const a = drift.get() + drag.get() + (index * 2 * Math.PI) / count;
    const depth = Math.sin(a);
    // How far the bead is from the orb's centre: on the far side and inside the disc, it's hidden.
    const dx = Math.cos(a) * rx;
    const dy = cy + depth * ry - orbY;
    const inside = Math.sqrt(dx * dx + dy * dy);
    const behind =
      depth < 0 && !still ? interpolate(inside, [orbR * 0.62, orbR * 1.02], [0, 1], "clamp") : 1;
    return {
      // Under the orb (zIndex 2) on the far side, so the glass covers it for touches too.
      zIndex: depth > 0 || still ? 4 : 1,
      opacity: (0.6 + (depth + 1) * 0.2) * behind,
      transform: [
        { translateX: cx + Math.cos(a) * rx - CHIP / 2 },
        { translateY: cy + depth * ry - CHIP / 2 },
        { scale: 0.7 + (depth + 1) * 0.17 },
      ],
    };
  });
  const label = useAnimatedStyle(() => {
    const depth = Math.sin(drift.get() + drag.get() + (index * 2 * Math.PI) / count);
    return { opacity: interpolate(depth, [0.35, 0.85], [0, 1], "clamp") };
  });
  return (
    <Animated.View style={[styles.chipWrap, style]}>
      <Pressable
        onPress={item.onPress}
        accessibilityRole="button"
        accessibilityLabel={
          (item.badge ?? 0) > 0 ? `${item.label}, ${String(item.badge)} new` : item.label
        }
        hitSlop={4}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
      >
        <Glass radius={CHIP / 2} contentStyle={styles.chip}>
          <AppText variant="title" accessible={false}>
            {item.emoji}
          </AppText>
        </Glass>
        <CountBadge count={item.badge ?? 0} style={styles.chipBadge} />
      </Pressable>
      <Animated.View pointerEvents="none" style={[styles.chipLabel, label]}>
        <Glass radius={radii.pill} shadow={false} contentStyle={styles.chipLabelInner}>
          <AppText variant="caption" weight="600" numberOfLines={1}>
            {item.label}
          </AppText>
        </Glass>
      </Animated.View>
    </Animated.View>
  );
}

function Spark({ pulse, size, left }: { pulse: HeroPulse; size: number; left: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(0);
    p.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [pulse.key, p]);
  const startX = pulse.from === "me" ? 0 : size * 0.6;
  const startY = pulse.from === "me" ? size * 0.62 : -size * 0.1;
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v < 0.85 ? 1 : (1 - v) / 0.15,
      transform: [
        { translateX: startX * (1 - v) },
        { translateY: startY * (1 - v) },
        { scale: 1 - v * 0.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        {
          left: left + size / 2 - 7,
          top: size / 2 - 7,
          backgroundColor: pulse.color,
          shadowColor: pulse.color,
        },
        style,
      ]}
    />
  );
}

/**
 * HOME-01 / HOME-02 hero (P-53, P-55, P-57): Garnet stands in a large liquid-glass orb, her
 * picture following the moment (time of day, a special date, how the two of you are). A ruby
 * and a sapphire light circle her, and a ring of shortcuts drifts around her: drag it sideways
 * to spin it, tap a bead to go there. When something happens a spark flies to her and she hops.
 * Everything holds still under reduced motion; the shortcuts stay reachable as buttons.
 */
export function HeroOrb({
  size,
  width,
  pulse,
  look,
  shortcuts = [],
}: {
  size: number;
  /** The full width available; the ring may reach past the orb. */
  width: number;
  pulse: HeroPulse | null;
  look: CompanionLook;
  shortcuts?: readonly HeroShortcut[];
}) {
  const { motion, reduceMotion } = useTheme();
  const t = useSharedValue(0);
  const pop = useSharedValue(1);
  const drift = useSharedValue(0);
  const drag = useSharedValue(0);
  const dragging = useSharedValue(false);
  const rx = width / 2 - CHIP / 2 - 4;
  const ry = size * 0.13;
  const cx = width / 2;
  const cy = size * 0.74;
  const left = (width - size) / 2;

  useEffect(() => {
    if (reduceMotion) {
      t.set(0.15);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: 12_000, easing: Easing.linear }), -1, false));
  }, [reduceMotion, t]);
  useEffect(() => {
    if (pulse === null || reduceMotion) return;
    pop.set(
      withSequence(
        withTiming(1, { duration: 560 }),
        withTiming(1.16, { duration: 110 }),
        withSpring(1, motion.spring.bouncy),
      ),
    );
  }, [pulse, reduceMotion, pop, motion.spring.bouncy]);
  // The ring drifts on its own, and pauses while a finger is on it.
  const frame = useFrameCallback((f) => {
    if (dragging.get()) return;
    drift.set(drift.get() + ((f.timeSincePreviousFrame ?? 16) / 1000) * DRIFT);
  }, false);
  useEffect(() => {
    frame.setActive(!reduceMotion && shortcuts.length > 0);
  }, [frame, reduceMotion, shortcuts.length]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragging.set(true);
    })
    .onChange((e) => {
      drag.set(drag.get() + e.changeX / Math.max(rx, 1));
    })
    .onFinalize((e) => {
      drag.set(withDecay({ velocity: e.velocityX / Math.max(rx, 1), deceleration: 0.994 }));
      dragging.set(false);
    });

  const figureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(pop.get() - 1) * size * 0.4 }],
  }));
  const figureH = Math.round(size * 0.96);

  return (
    <GestureDetector gesture={pan}>
      <View style={[{ width, height: size + CHIP * 0.6 }, styles.center]}>
        {/* The orb, Garnet, the lights and the ring share one layer to pass behind and in front. */}
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            onPress={() => {
              if (reduceMotion) return;
              pop.set(
                withSequence(
                  withTiming(1.1, { duration: 120 }),
                  withSpring(1, motion.spring.bouncy),
                ),
              );
            }}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[styles.orb, { left, width: size, height: size }]}
          >
            <Glass
              radius={size / 2}
              veil="soft"
              tint="garnet"
              contentStyle={{ width: size, height: size }}
            >
              <View />
            </Glass>
          </Pressable>
          <OrbitLight
            t={t}
            phase={Math.PI}
            size={size}
            left={left}
            color={palette.ruby400}
            id="ruby"
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.figure,
              { left, width: size, bottom: CHIP * 0.6 + size * 0.03 },
              figureStyle,
            ]}
          >
            <CharacterSlot
              character="garnet"
              look={look}
              size={figureH}
              aspectRatio={FRAME_ASPECT}
            />
          </Animated.View>
          <OrbitLight
            t={t}
            phase={0}
            size={size}
            left={left}
            color={palette.sapphire400}
            id="sapphire"
          />
          {shortcuts.map((item, i) => (
            <RingChip
              key={item.id}
              item={item}
              index={i}
              count={shortcuts.length}
              drift={drift}
              drag={drag}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              orbY={size / 2}
              orbR={size / 2}
              still={reduceMotion}
            />
          ))}
          {pulse === null || reduceMotion ? null : (
            <Spark key={pulse.key} pulse={pulse} size={size} left={left} />
          )}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  center: { alignSelf: "center" },
  orb: { position: "absolute", top: 0, zIndex: 2 },
  light: { position: "absolute" },
  figure: { position: "absolute", alignItems: "center", zIndex: 2 },
  chipWrap: { position: "absolute", left: 0, top: 0, width: CHIP, alignItems: "center" },
  chip: { width: CHIP, height: CHIP, alignItems: "center", justifyContent: "center" },
  chipLabel: {
    position: "absolute",
    top: CHIP + 2,
    left: (CHIP - 120) / 2,
    width: 120,
    alignItems: "center",
  },
  chipLabelInner: { paddingHorizontal: 9, paddingVertical: 3 },
  chipBadge: { position: "absolute", top: -4, right: -6 },
  spark: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 5,
  },
});
