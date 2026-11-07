/**
 * AUTH-01 · Welcome (Daylight Glass, P-48). Two tilted glass windows, Ruby's and Sapphire's,
 * overlap around the floating Garnet crystal; "Two lives. One space."; one primary action.
 * Google and Apple come first when the server offers them (P-79), then email.
 * Never: a "days apart" counter or sign-up pressure (docs/design/prompts/01).
 */
import { useRouter } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { HeroWindows } from "../components/HeroWindows";
import { SocialButtons } from "../components/SocialButtons";
import { ENTER } from "@/theme/transitions";

export function WelcomeScreen() {
  const router = useRouter();
  const { spacing, reduceMotion } = useTheme();
  const { height, width } = useWindowDimensions();
  // Compact phones (375×667): smaller panes so the actions stay above the fold.
  const paneWidth = Math.round(Math.min(168, width * 0.42, height * 0.19));
  const enter = () => (reduceMotion ? {} : { entering: ENTER });

  return (
    <GlassScreen
      footer={
        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <SocialButtons divider="below" />
          <Button
            label="Continue with email"
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
        </Animated.View>
      }
    >
      <View style={[styles.center, { gap: spacing.xxl }]}>
        <HeroWindows paneWidth={paneWidth} />
        <Animated.View {...enter()} style={{ gap: spacing.md }}>
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
