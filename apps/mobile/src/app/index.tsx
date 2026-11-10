import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Aurora } from "@/components/brand/Aurora";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAuthStatus } from "@/features/auth/useAuth";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { fusionPlayedThisLaunch } from "@/features/pairing/fusionOnLaunch";
import { usePairingStatus } from "@/features/pairing/usePairing";
import { useSetupState } from "@/features/setup/useSetup";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Entry gate: sends each account, pairing and setup state to its screen (AUTH-01 to AUTH-09,
 * PAIR-01 to PAIR-04, SETUP-01). Home opens only once both partners have finished setup, and
 * each launch then opens on the fusion (P-99).
 */
export default function EntryGate() {
  const router = useRouter();
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const pairing = usePairingStatus(signedIn);
  const setup = useSetupState(signedIn && pairing.data?.kind === "paired");
  const { colors, spacing } = useTheme();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 7000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const isError =
    auth.isError ||
    (signedIn && pairing.isError) ||
    (signedIn && pairing.data?.kind === "paired" && setup.isError);
  const isStalled = timedOut && auth.data === undefined;

  if (isError || isStalled) {
    return (
      <View style={[styles.fill, { padding: spacing.xl, gap: spacing.xl }]}>
        <Aurora />
        <CharacterSlot
          character="garnet"
          look={{ mood: "thinking", occasion: "everyday" }}
          size={170}
          aspectRatio={FRAME_ASPECT}
        />
        <View style={{ gap: spacing.xs, alignItems: "center" }}>
          <AppText variant="title" style={styles.textCenter}>
            Unable to reach your space
          </AppText>
          <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
            Garnet couldn't connect to the server. Please check your connection and try again.
          </AppText>
        </View>
        <View style={{ gap: spacing.sm, width: "100%", maxWidth: 320 }}>
          <Button
            label="Try again"
            onPress={() => {
              setTimedOut(false);
              void auth.refetch();
              if (signedIn) void pairing.refetch();
            }}
          />
          <Button
            label="Start fresh"
            variant="text"
            onPress={() => {
              router.replace("/welcome");
            }}
          />
        </View>
      </View>
    );
  }

  const loading = (
    <View style={styles.fill}>
      <Aurora />
      <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
    </View>
  );
  if (auth.data === undefined) return loading;
  switch (auth.data.kind) {
    case "signedOut":
      return <Redirect href="/welcome" />;
    case "verifying":
      return <Redirect href="/verify-email" />;
    case "expired":
      return <Redirect href="/session-expired" />;
    case "registering":
      return <Redirect href="/finish-account" />;
    case "signedIn":
      break;
  }
  if (pairing.data === undefined) return loading;
  switch (pairing.data.kind) {
    case "unpaired":
      return <Redirect href="/pair" />;
    case "inviting":
      return <Redirect href="/pair/invite" />;
    case "reviewing":
      return <Redirect href="/pair/review" />;
    case "paired":
      if (setup.data === undefined) return loading;
      if (!setup.data.profile.complete) return <Redirect href="/setup" />;
      // The space opens for both together (P-99): home waits for the partner's setup too,
      // and every launch after that opens on the fusion.
      if (!setup.data.partner.ready) return <Redirect href="/waiting" />;
      if (!fusionPlayedThisLaunch()) return <Redirect href="/fusion" />;
      return <Redirect href="/home" />;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  textCenter: { textAlign: "center" },
});
