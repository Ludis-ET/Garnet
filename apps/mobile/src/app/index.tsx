import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Aurora } from "@/components/brand/Aurora";
import { useAuthStatus } from "@/features/auth/useAuth";
import { usePairingStatus } from "@/features/pairing/usePairing";
import { useSetupState } from "@/features/setup/useSetup";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Entry gate: sends each account, pairing and setup state to its screen (AUTH-01 to AUTH-09,
 * PAIR-01 to PAIR-04, SETUP-01). Set-up people go to the Home placeholder until HOME-01 is
 * designed (P-49, B-04).
 */
export default function EntryGate() {
  const auth = useAuthStatus();
  const pairing = usePairingStatus();
  const setup = useSetupState(auth.data?.kind === "signedIn" && pairing.data?.kind === "paired");
  const { colors } = useTheme();
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
      return <Redirect href={setup.data.profile.complete ? "/home" : "/setup"} />;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
