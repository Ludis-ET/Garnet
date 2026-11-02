import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import type { Temporal } from "temporal-polyfill";
import { useSvgId } from "@/components/brand/svgId";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { useCountUp } from "@/components/ui/useCountUp";
import type { HomePerson } from "@/data/repositories/types";
import type { CompanionLook } from "@/domain/companion";
import { flightHint, formatKm } from "@/domain/distance";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { gemOf } from "@/features/chat/components/Presence";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";
import { EXIT, POP } from "@/theme/transitions";

const H = 268;
const FIG = 150;

/** A point on the quadratic arc from (x0,y0) via (cx,cy) to (x1,y1). Runs on the UI thread. */
function onArc(p: number, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
  "worklet";
  const q = 1 - p;
  return {
    x: q * q * x0 + 2 * q * p * cx + p * p * x1,
    y: q * q * y0 + 2 * q * p * cy + p * p * y1,
  };
}

/**
 * US-01 hero, redesigned (P-60): the two of you on a liquid-glass bridge. Your gem stands on
 * one side and your partner's on the other, each in their own day's look (P-57), with a bow of
 * light between you and each person's local time. A soft light drifts along the bow; when you
 * send a signal a bright spark crosses from you to them, then "Sent" floats up (never "seen",
 * §5). At the top of the bow, the kilometres between you count up (P-66): from your phones'
 * rounded locations, or "≈" from your time zones. Still under reduced motion.
 */
export function UsHero({
  me,
  partner,
  meLook,
  partnerLook,
  now,
  sent,
  distance,
}: {
  me: HomePerson;
  partner: HomePerson;
  meLook: CompanionLook;
  partnerLook: CompanionLook;
  now: Temporal.Instant;
  /** A new key each time a signal is sent, with its emoji. */
  sent: { key: number; emoji: string } | null;
  /** How far apart (P-66); null while distance is off. */
  distance: { km: number; approximate: boolean } | null;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const gid = useSvgId("bridge");
  const drift = useSharedValue(0);
  const spark = useSharedValue(0);
  const breathe = useSharedValue(0);
  const km = useCountUp(distance?.km ?? null, reduceMotion);
  const mine = sideColor(me.side);
  const theirs = sideColor(partner.side);
  const x0 = w * 0.24;
  const x1 = w * 0.76;
  const y0 = H * 0.42;
  const cx = w / 2;
  const cy = H * 0.02;

  useEffect(() => {
    if (reduceMotion) return;
    drift.set(
      withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    breathe.set(
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [reduceMotion, drift, breathe]);
  useEffect(() => {
    if (sent === null || reduceMotion) return;
    spark.set(0);
    spark.set(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        withDelay(400, withTiming(0, { duration: 0 })),
      ),
    );
  }, [sent, reduceMotion, spark]);

  const driftStyle = useAnimatedStyle(() => {
    const p = onArc(drift.get(), x0, y0, cx, cy, x1, y0);
    return {
      opacity: w === 0 ? 0 : 0.85,
      transform: [{ translateX: p.x - 6 }, { translateY: p.y - 6 }],
    };
  });
  const sparkStyle = useAnimatedStyle(() => {
    const v = spark.get();
    const p = onArc(v, x0, y0, cx, cy, x1, y0);
    return {
      opacity: v > 0 && v < 1 ? 1 : 0,
      transform: [
        { translateX: p.x - 11 },
        { translateY: p.y - 11 },
        { scale: 0.8 + Math.sin(v * Math.PI) * 0.7 },
      ],
    };
  });
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -breathe.get() * 3 }] }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - breathe.get()) * 3 }],
  }));

  const tag = (p: HomePerson, color: string) => (
    <Glass radius={radii.pill} shadow={false} contentStyle={[styles.tag, { gap: 6 }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" weight="600" numberOfLines={1}>
        {p.name}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {localTimeLabel(now, p.zone)}
      </AppText>
    </Glass>
  );

  return (
    <View
      accessible
      accessibilityLabel={`${me.name}, ${localTimeLabel(now, me.zone)} in ${cityForZone(me.zone)}. ${partner.name}, ${localTimeLabel(now, partner.zone)} in ${cityForZone(partner.zone)}.${distance === null ? "" : ` ${distance.approximate ? "About " : ""}${formatKm(distance.km)} kilometres apart, ${flightHint(distance.km)}.`}`}
      onLayout={(e) => {
        setW(e.nativeEvent.layout.width);
      }}
    >
      <Glass radius={radii.xl + 8} contentStyle={{ height: H }}>
        {/* Each side washed in its person's colour, meeting in the middle. */}
        <LinearGradient
          colors={[`${mine}33`, "transparent", `${theirs}33`]}
          start={{ x: 0, y: 0.6 }}
          end={{ x: 1, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
        {w === 0 ? null : (
          <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={mine} stopOpacity={0.9} />
                <Stop offset="0.5" stopColor={colors.garnet} stopOpacity={0.9} />
                <Stop offset="1" stopColor={theirs} stopOpacity={0.9} />
              </SvgGradient>
            </Defs>
            <Path
              d={`M ${String(x0)} ${String(y0)} Q ${String(cx)} ${String(cy)} ${String(x1)} ${String(y0)}`}
              stroke={`url(#${gid})`}
              strokeWidth={2.5}
              strokeDasharray="2 7"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        )}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.drift,
            { backgroundColor: colors.garnet, shadowColor: colors.garnet },
            driftStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.spark, { backgroundColor: mine, shadowColor: mine }, sparkStyle]}
        />

        {/* How far apart, riding the top of the bow (P-66). */}
        {distance === null ? null : (
          <Animated.View
            pointerEvents="none"
            {...(reduceMotion ? {} : { entering: POP })}
            style={[styles.km, { top: H * 0.22 - 17 }]}
          >
            <Glass radius={radii.pill} contentStyle={[styles.kmInner, { gap: 6 }]}>
              <Icon name="plane" size={14} color={colors.accent} />
              <AppText variant="footnote" weight="600" style={styles.tabular}>
                {distance.approximate ? "≈ " : ""}
                {formatKm(km)} km
              </AppText>
            </Glass>
          </Animated.View>
        )}

        <Animated.View style={[styles.figure, styles.left, leftStyle]}>
          <CharacterSlot
            character={gemOf(me.side)}
            look={meLook}
            size={FIG}
            aspectRatio={FRAME_ASPECT}
          />
        </Animated.View>
        <Animated.View style={[styles.figure, styles.right, rightStyle]}>
          <CharacterSlot
            character={gemOf(partner.side)}
            look={partnerLook}
            size={FIG + 6}
            aspectRatio={FRAME_ASPECT}
          />
        </Animated.View>

        <View style={[styles.tags, { padding: spacing.md }]}>
          {tag(me, mine)}
          {tag(partner, theirs)}
        </View>

        {sent === null ? null : (
          <Animated.View
            key={sent.key}
            pointerEvents="none"
            {...(reduceMotion ? {} : { entering: POP, exiting: EXIT })}
            style={styles.sent}
            accessibilityLiveRegion="polite"
          >
            <Glass radius={radii.pill} contentStyle={styles.sentInner}>
              <AppText variant="headline">Sent {sent.emoji}</AppText>
            </Glass>
          </Animated.View>
        )}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { position: "absolute", bottom: 40 },
  left: { left: "6%" },
  right: { right: "6%" },
  tags: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  drift: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  spark: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  sent: { position: "absolute", top: H * 0.4, alignSelf: "center", zIndex: 3 },
  km: { position: "absolute", alignSelf: "center", zIndex: 2 },
  kmInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabular: { fontVariant: ["tabular-nums"] },
  sentInner: { paddingHorizontal: 18, paddingVertical: 9 },
});
