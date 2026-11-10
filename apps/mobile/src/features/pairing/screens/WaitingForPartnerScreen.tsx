/**
 * Waiting for your person to finish setting up (P-99). The space opens for both at the same
 * moment: until the partner has finished their setup, this screen stands in for home. It looks
 * again every few seconds and moves on by itself; nothing here asks the partner to hurry, and
 * no time or count is shown (§5: no metrics, no pressure).
 */
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useSignOut } from "@/features/auth/useAuth";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useSetupState } from "@/features/setup/useSetup";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

/**
 * How often to look while waiting. Realtime updates (production-fix-plan phase 5) will tell the
 * app the moment the partner finishes; until then this screen alone checks, and only while open.
 */
const LOOK_AGAIN_MS = 5000;

export function WaitingForPartnerScreen() {
  const router = useRouter();
  const { radii, spacing, reduceMotion } = useTheme();
  const setup = useSetupState(true, LOOK_AGAIN_MS);
  const signOut = useSignOut();
  const data = setup.data;

  if (data !== undefined && (!data.profile.complete || data.partner.ready))
    return <Redirect href="/" />;

  const partnerName = data?.partner.name ?? "";
  const who = partnerName === "" ? "Your person" : partnerName;

  return (
    <GlassScreen
      footer={
        <Button
          label="Sign out"
          variant="text"
          loading={signOut.isPending}
          onPress={() => {
            signOut.mutate(undefined, {
              onSettled: () => {
                router.replace("/welcome");
              },
            });
          }}
        />
      }
    >
      <View style={[styles.fill, { gap: spacing.xl }]}>
        <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>
          <Glass
            radius={radii.xl + 4}
            contentStyle={[styles.card, { padding: spacing.xl, gap: spacing.lg }]}
          >
            {data === undefined ? null : (
              <View style={[styles.pair, { gap: spacing.lg }]}>
                <ProfileAvatar
                  name={data.profile.displayName}
                  avatar={data.profile.avatar}
                  side={data.profile.side}
                  size={84}
                />
                <ProfileAvatar
                  name={partnerName === "" ? "?" : partnerName}
                  avatar={data.partner.avatar ?? { kind: "initials", swatch: 1 }}
                  side={data.partner.side}
                  size={84}
                />
              </View>
            )}
            <AppText variant="question" style={styles.centerText} accessibilityRole="header">
              {who} is still setting up
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.centerText}>
              Your space opens for both of you as soon as they've finished. You can leave the app;
              it will be ready when you come back.
            </AppText>
          </Glass>
        </Animated.View>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "center" },
  card: { alignItems: "center" },
  pair: { flexDirection: "row", justifyContent: "center" },
  centerText: { textAlign: "center" },
});
