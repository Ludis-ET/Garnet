import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";

function Hand({
  degrees,
  length,
  width,
  color,
  size,
}: {
  degrees: number;
  length: number;
  width: number;
  color: string;
  size: number;
}) {
  const { motion, reduceMotion } = useTheme();
  const angle = useSharedValue(reduceMotion ? degrees : 0);
  useEffect(() => {
    angle.set(reduceMotion ? degrees : withSpring(degrees, motion.spring.smooth));
  }, [degrees, reduceMotion, angle, motion.spring.smooth]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View
        style={{
          position: "absolute",
          left: size / 2 - width / 2,
          top: size / 2 - length,
          width,
          height: length,
          borderRadius: width / 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

/**
 * A small glass clock for a city (SETUP-05). The hands spring to the zone's current time on
 * mount and move each minute; the city and digital time sit underneath. The hands are
 * decorative; the text carries the time.
 */
export function AnalogClock({
  zone,
  now,
  color,
  label,
}: {
  zone: string;
  now: Temporal.Instant;
  color: string;
  /** "You" or the partner's name. */
  label: string;
}) {
  const { colors, spacing } = useTheme();
  const size = 76;
  const t = now.toZonedDateTimeISO(zone);
  const minuteDeg = t.minute * 6;
  const hourDeg = (t.hour % 12) * 30 + t.minute * 0.5;
  return (
    <View style={[styles.col, { gap: spacing.xs }]}>
      <Glass radius={size / 2} contentStyle={{ width: size, height: size }}>
        {[0, 3, 6, 9].map((h) => (
          <View
            key={h}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${h * 30}deg` }] }]}
          >
            <View
              style={{
                position: "absolute",
                left: size / 2 - 1,
                top: 6,
                width: 2,
                height: 6,
                borderRadius: 1,
                backgroundColor: colors.textTertiary,
              }}
            />
          </View>
        ))}
        <Hand
          degrees={hourDeg}
          length={size * 0.24}
          width={3}
          color={colors.textPrimary}
          size={size}
        />
        <Hand degrees={minuteDeg} length={size * 0.34} width={2} color={color} size={size} />
        <View
          style={[styles.pin, { left: size / 2 - 3, top: size / 2 - 3, backgroundColor: color }]}
        />
      </Glass>
      <AppText variant="caption" color="textSecondary">
        {label} · {cityForZone(zone)}
      </AppText>
      <AppText variant="headline">{localTimeLabel(now, zone)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: "center", flex: 1 },
  pin: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
});
