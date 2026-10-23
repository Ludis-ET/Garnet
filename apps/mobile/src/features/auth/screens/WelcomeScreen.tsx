/**
 * AUTH-01 · Welcome (Daylight Glass, P-48). Two tilted glass windows, Ruby's and Sapphire's,
 * overlap around the floating Garnet crystal; "Two lives. One space."; one primary action.
 * Never: a "days apart" counter or sign-up pressure (docs/design/prompts/01).
 */
import { useRouter } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { HeroWindows } from "../components/HeroWindows";

export function WelcomeScreen() {
  const router = useRouter();
  const { colors, spacing, reduceMotion } = useTheme();
  const { height, width } = useWindowDimensions();
  // Compact phones (375×667): smaller panes so the actions stay above the fold.
  const paneWidth = Math.round(Math.min(168, width * 0.42, height * 0.19));
  const enter = (delay: number) =>
    reduceMotion ? {} : { entering: FadeInDown.delay(delay).springify().damping(18) };

  return (
    <GlassScreen
      footer={
        <Animated.View {...enter(360)} style={{ gap: spacing.sm }}>
          <Button
            label="Get started"
            onPress={() => {
              router.push("/create-account");
            }}
          />
          <Button
            label="I already have an account"
            variant="text"
            onPress={() => {
              router.push("/sign-in");
            }}
          />
          <View style={[styles.row, { gap: spacing.xs }]}>
            <Icon name="lock" size={13} color={colors.textTertiary} />
            <AppText variant="footnote" color="textTertiary">
              A private space for just the two of you.
            </AppText>
          </View>
        </Animated.View>
      }
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <GarnetMark size={30} animated={false} />
        <AppText variant="headline" serif accessibilityRole="header">
          Garnet
        </AppText>
      </View>

      <View style={[styles.center, { gap: spacing.xxl }]}>
        <HeroWindows paneWidth={paneWidth} />
        <Animated.View {...enter(260)} style={{ gap: spacing.md }}>
          <AppText variant="statement" style={styles.centerText}>
            Two lives.{"\n"}
            <AppText variant="statement" italic inline color="accent">
              One space.
            </AppText>
          </AppText>
        </Animated.View>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  centerText: { textAlign: "center" },
});
