/**
 * The fusion on opening the app (P-99): once both partners have finished setup, every launch
 * opens on Ruby and Sapphire becoming Garnet, then goes home on its own. A tap anywhere, or
 * "Skip", goes home at once; under reduced motion the still picture shows briefly instead.
 */
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Aurora } from "@/components/brand/Aurora";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useSetupState } from "@/features/setup/useSetup";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";
import { ConnectedScene } from "../components/ConnectedScene";
import { markFusionPlayed } from "../fusionOnLaunch";

/** How long the settled picture stays before home, after the fusion itself has played. */
const LINGER_MS = 900;
/** Never longer than this, whatever the animation does. */
const LONGEST_MS = 9000;

export function FusionScreen() {
  const router = useRouter();
  const { spacing, reduceMotion } = useTheme();
  const setup = useSetupState();
  const left = useRef(false);

  const goHome = () => {
    if (left.current) return;
    left.current = true;
    markFusionPlayed();
    router.replace("/home");
  };

  useEffect(() => {
    const timer = setTimeout(goHome, reduceMotion ? 1600 : LONGEST_MS);
    return () => {
      clearTimeout(timer);
    };
    // goHome is stable in effect: it only reads refs and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const data = setup.data;
  if (data !== undefined && (!data.profile.complete || !data.partner.ready))
    return <Redirect href="/" />;

  const names =
    data === undefined ? "" : `${data.profile.displayName} & ${data.partner.name}`.trim();

  return (
    <Pressable
      style={styles.fill}
      onPress={goHome}
      accessibilityRole="button"
      accessibilityLabel="Go to your space"
    >
      <Aurora />
      <View style={[styles.center, { gap: spacing.xl, padding: spacing.xl }]}>
        <ConnectedScene
          onSettled={() => {
            setTimeout(goHome, LINGER_MS);
          }}
        />
        <Animated.View {...(reduceMotion ? {} : { entering: ENTER })} style={styles.words}>
          <AppText variant="statement" style={styles.centerText}>
            Together
          </AppText>
          {names === "" ? null : (
            <AppText variant="body" color="textSecondary" style={styles.centerText}>
              {names}
            </AppText>
          )}
        </Animated.View>
      </View>
      <View style={[styles.skip, { padding: spacing.lg }]}>
        <Button label="Skip" variant="text" onPress={goHome} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  words: { alignItems: "center", gap: 4 },
  centerText: { textAlign: "center" },
  skip: { position: "absolute", bottom: 24, alignSelf: "center" },
});
