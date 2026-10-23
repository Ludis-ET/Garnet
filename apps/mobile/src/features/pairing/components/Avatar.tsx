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
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { usePop } from "@/components/ui/motion";
import { useTheme } from "@/theme/ThemeProvider";

const SIZE = 64;

/**
 * A person's avatar during pairing (P-50): their initial in the display serif inside a violet
 * ring. Sides are chosen later (SETUP), so rings stay neutral violet here. `name` null draws the
 * empty, slowly breathing dashed ring of "your person" before they join. A new name pops in.
 */
export function Avatar({ name, size = SIZE }: { name: string | null; size?: number }) {
  const { colors, reduceMotion } = useTheme();
  const breathe = useSharedValue(0);
  const pop = usePop(name, 0.2);
  useEffect(() => {
    if (name !== null || reduceMotion) {
      breathe.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    breathe.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: ease }),
          withTiming(0, { duration: 1200, easing: ease }),
        ),
        -1,
      ),
    );
  }, [name, reduceMotion, breathe]);
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.get() * 0.05 }],
    opacity: 0.7 + breathe.get() * 0.3,
  }));

  if (name === null) {
    return (
      <Animated.View
        style={[
          styles.empty,
          { width: size, height: size, borderRadius: size / 2, borderColor: colors.accent },
          breatheStyle,
        ]}
      >
        <AppText variant="headline" color="textTertiary">
          ?
        </AppText>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={pop}>
      <View
        style={[
          styles.ring,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderColor: colors.accent,
          },
        ]}
      >
        <Glass
          radius={size / 2}
          tint="garnet"
          shadow={false}
          contentStyle={[styles.center, { width: size, height: size }]}
        >
          <AppText variant="title" serif>
            {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
          </AppText>
        </Glass>
      </View>
    </Animated.View>
  );
}

/**
 * Two avatars joined through the Garnet crystal (PAIR-02, -04, -06, -07). The line is dotted
 * until the two are connected, then solid, and the crystal lights to match. Decorative: the
 * screen's text names the people.
 */
export function AvatarLink({
  left,
  right,
  connected,
}: {
  left: string | null;
  right: string | null;
  connected: boolean;
}) {
  const { colors, spacing } = useTheme();
  const line = {
    borderColor: colors.accent,
    borderStyle: connected ? ("solid" as const) : ("dashed" as const),
    opacity: connected ? 0.7 : 0.45,
  };
  return (
    <View
      style={[styles.link, { gap: spacing.xs }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Avatar name={left} />
      <View style={[styles.line, line]} />
      <GarnetMark size={36} animated={false} dim={!connected} />
      <View style={[styles.line, line]} />
      <Avatar name={right} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  ring: { borderWidth: 2, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  link: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  line: { width: 36, borderTopWidth: 2 },
});
