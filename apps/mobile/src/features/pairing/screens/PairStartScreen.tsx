/**
 * PAIR-01 · Create our space (Daylight Glass, P-49). "Two lights find each other": your light
 * waits on the left; two choice cards start either side of the story. Invitations follow P-18
 * (proposed) and are simulated codes (P-50; U-33 open).
 */
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useToast } from "@/components/ui/Toast";
import { AccountButton } from "@/features/auth/AccountButton";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useTheme } from "@/theme/ThemeProvider";
import { ChoiceCard } from "../components/ChoiceCard";
import { LightPath } from "../components/LightPath";
import { useCreateInvite, usePairingStatus } from "../usePairing";
import { ENTER } from "@/theme/transitions";

export function PairStartScreen() {
  const router = useRouter();
  const toast = useToast();
  const { spacing, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const status = usePairingStatus();
  const create = useCreateInvite();
  const enter = () => (reduceMotion ? {} : { entering: ENTER });

  if (status.data?.kind === "paired") return <Redirect href="/pair/already" />;
  if (status.data?.kind === "reviewing") return <Redirect href="/pair/review" />;

  const invite = () => {
    // An invitation that still works is reopened rather than replaced.
    if (status.data?.kind === "inviting" && !status.data.expired) {
      router.push("/pair/invite");
      return;
    }
    create.mutate(undefined, {
      onSuccess: () => {
        router.push("/pair/invite");
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  return (
    <GlassScreen headerRight={<AccountButton />}>
      <View style={styles.center}>
        <LightPath state="waiting" width={Math.min(width, 440) - spacing.gutter * 2} />
      </View>
      <Animated.View {...enter()} style={{ gap: spacing.sm }}>
        <AppText variant="largeTitle">Create our space</AppText>
        <AppText variant="body" color="textSecondary">
          Just the two of you.
        </AppText>
      </Animated.View>
      <View style={{ gap: spacing.md }}>
        <Animated.View {...enter()}>
          <ChoiceCard
            icon="send"
            tint="ruby"
            title="Invite my person"
            subtitle="Create a private invitation code"
            loading={create.isPending}
            onPress={invite}
          />
        </Animated.View>
        <Animated.View {...enter()}>
          <ChoiceCard
            icon="key"
            tint="sapphire"
            title="I have an invitation"
            subtitle="Enter the code from your person"
            disabled={create.isPending}
            onPress={() => {
              router.push("/pair/join");
            }}
          />
        </Animated.View>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
});
