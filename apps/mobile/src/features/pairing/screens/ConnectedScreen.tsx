/**
 * PAIR-05 · You're connected (Daylight Glass, P-49). The two glass windows meet and the Garnet
 * crystal lights. Skippable, with a still version under reduced motion; Continue never waits
 * for the animation. Continue goes on to setup (03).
 */
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useTheme } from "@/theme/ThemeProvider";
import { ConnectedScene } from "../components/ConnectedScene";
import { usePairingStatus } from "../usePairing";

export function ConnectedScreen() {
  const router = useRouter();
  const { spacing, reduceMotion } = useTheme();
  const status = usePairingStatus();

  if (status.data !== undefined && status.data.kind !== "paired") return <Redirect href="/" />;

  return (
    <GlassScreen
      footer={
        <Button
          label="Continue"
          onPress={() => {
            router.replace("/setup");
          }}
        />
      }
    >
      <View style={[styles.fill, { gap: spacing.xl }]}>
        <ConnectedScene />
        {/* The words are always there for screen readers; they rise in once the crystal blooms. */}
        <Animated.View
          {...(reduceMotion ? {} : { entering: FadeInDown.delay(1000).springify().damping(16) })}
          style={{ gap: spacing.sm }}
        >
          <AppText variant="statement" style={styles.centerText}>
            You're connected.
          </AppText>
          <AppText
            variant="title"
            style={styles.centerText}
            accessibilityLabel="Ruby and Sapphire hearts"
          >
            ❤️ 💙
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.centerText}>
            Let's set up your space.
          </AppText>
        </Animated.View>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "center" },
  centerText: { textAlign: "center" },
});
