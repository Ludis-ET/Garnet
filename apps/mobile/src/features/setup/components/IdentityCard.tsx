import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { usePop } from "@/components/ui/motion";
import type { Profile } from "@/data/fixtures/demoProfile";
import { calledName, cityForZone, localTimeLabel, type GemSide } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { useNow } from "../useNow";
import { ProfileAvatar } from "./ProfileAvatar";

const SIDE_LABEL: Record<GemSide, string> = { ruby: "❤️ Ruby", sapphire: "💙 Sapphire" };

/** One tint layer that fades in when its side is chosen (the "side flood"). */
function Flood({ color, on }: { color: string; on: boolean }) {
  const { reduceMotion } = useTheme();
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.set(reduceMotion ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 420 }));
  }, [on, reduceMotion, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
    />
  );
}

/**
 * The live identity card (SETUP-01, P-51): "your light takes shape". A glass pass that fills in
 * as setup goes: the name, the side's colour flooding the glass, the picture, the local clock.
 * Each new value pops in. Read as one summary line for screen readers.
 */
export function IdentityCard({ profile, large = false }: { profile: Profile; large?: boolean }) {
  const { colors, radii, spacing } = useTheme();
  const now = useNow();
  const name = calledName(profile.displayName, profile.nickname) || "Your name";
  const namePop = usePop(name, 0.06);
  const sidePop = usePop(profile.side, 0.12);
  const clockPop = usePop(profile.timeZone, 0.08);
  const time =
    profile.timeZone === null
      ? null
      : `${localTimeLabel(now, profile.timeZone)} · ${cityForZone(profile.timeZone)}`;
  const summary = [
    profile.displayName || "No name yet",
    profile.side === null ? "no side yet" : profile.side === "ruby" ? "Ruby" : "Sapphire",
    time ?? "no time zone yet",
  ].join(", ");

  return (
    <View accessible accessibilityLabel={`Your card: ${summary}`}>
      <Glass radius={radii.xl} tint={profile.side === null ? "garnet" : "none"}>
        <Flood color={colors.tintRuby} on={profile.side === "ruby"} />
        <Flood color={colors.tintSapphire} on={profile.side === "sapphire"} />
        <View style={[styles.row, { padding: large ? spacing.xl : spacing.lg, gap: spacing.lg }]}>
          <ProfileAvatar
            name={profile.displayName}
            avatar={profile.avatar}
            side={profile.side}
            size={large ? 84 : 58}
          />
          <View style={[styles.flex, { gap: 2 }]}>
            <Animated.View style={namePop}>
              <AppText variant={large ? "title" : "body"} weight="600" numberOfLines={1}>
                {name}
              </AppText>
            </Animated.View>
            {profile.nickname.trim().length > 0 ? (
              <AppText variant="footnote" color="textTertiary" numberOfLines={1}>
                {profile.displayName}
              </AppText>
            ) : null}
            <View style={[styles.row, { gap: spacing.sm, marginTop: 4 }]}>
              <Animated.View style={sidePop}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: colors.glassVeil, borderColor: colors.glassHairline },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={profile.side === null ? "textTertiary" : "textPrimary"}
                  >
                    {profile.side === null ? "Side not chosen" : SIDE_LABEL[profile.side]}
                  </AppText>
                </View>
              </Animated.View>
              {time === null ? null : (
                <Animated.View style={[styles.flex, clockPop]}>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {time}
                  </AppText>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
