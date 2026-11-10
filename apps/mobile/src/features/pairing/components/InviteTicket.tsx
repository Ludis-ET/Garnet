import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { spokenInviteCode } from "@/domain/pairing";
import { useTheme } from "@/theme/ThemeProvider";
import { CodeTiles } from "./CodeTiles";
import { ENTER } from "@/theme/transitions";
import { API_AREAS_ON } from "@/data/http/config";

/**
 * The invitation as a glass ticket (PAIR-02, P-49): a slow holographic sheen sweeps across it,
 * the code sits in eight tiles (tap to copy: the tiles ripple), a perforated hairline separates
 * the details, and a "Simulated invitation" badge marks it as not real (rule 4). Expired
 * tickets lose their sheen and colour. The sheen holds still under reduced motion.
 */
export function InviteTicket({
  code,
  timeLeft,
  expired,
  onCopy,
  copiedKey,
}: {
  code: string;
  /** "23 h 59 m", or null when expired. */
  timeLeft: string | null;
  expired: boolean;
  onCopy: () => void;
  copiedKey: unknown;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || expired) {
      sweep.set(0.35);
      return;
    }
    sweep.set(
      withDelay(
        400,
        withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.cubic) }), -1),
      ),
    );
  }, [reduceMotion, expired, sweep]);
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + sweep.get() * width * 2 }, { rotate: "18deg" }],
  }));

  return (
    <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>
      <Glass
        radius={radii.xl + 4}
        tint={expired ? "none" : "garnet"}
        contentStyle={{ padding: spacing.xl, gap: spacing.lg }}
      >
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          onLayout={(e) => {
            setWidth(e.nativeEvent.layout.width);
          }}
        >
          {expired ? null : (
            <Animated.View style={[styles.sheen, { width: width * 0.9 }, sheenStyle]}>
              <LinearGradient
                colors={[
                  "transparent",
                  colors.tintRuby,
                  colors.tintGarnet,
                  colors.tintSapphire,
                  "transparent",
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </View>

        <Pressable
          onPress={onCopy}
          disabled={expired}
          accessibilityRole="button"
          accessibilityLabel={`Invitation code ${spokenInviteCode(code)}. Copy code`}
          style={{ gap: spacing.sm }}
        >
          <CodeTiles code={code} tone={expired ? "muted" : "normal"} rippleKey={copiedKey} />
          <View style={[styles.row, { gap: spacing.xs }]}>
            <Icon name={expired ? "clock" : "copy"} size={14} color={colors.textTertiary} />
            <AppText variant="footnote" color="textTertiary">
              {expired ? "This invitation has expired." : "Tap to copy"}
            </AppText>
          </View>
        </Pressable>

        <View style={[styles.perforation, { borderColor: colors.glassHairline }]} />

        <View style={[styles.row, { gap: spacing.xs }]}>
          <Icon name="clock" size={15} color={colors.textSecondary} />
          <AppText variant="callout" color="textSecondary">
            {timeLeft === null ? "Expired · works once" : `Expires in ${timeLeft} · works once`}
          </AppText>
        </View>
        {API_AREAS_ON.has("pairing") ? null : <SimulatedBadge text="Simulated invitation" />}
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheen: { position: "absolute", top: -40, bottom: -40, left: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  perforation: { borderTopWidth: 1.5, borderStyle: "dashed", marginHorizontal: -8 },
});
