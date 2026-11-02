import { Redirect, Stack } from "expo-router";
import { useAuthStatus } from "@/features/auth/useAuth";
import { usePairingStatus } from "@/features/pairing/usePairing";
import { useSetupState } from "@/features/setup/useSetup";
import { PAGE } from "@/theme/transitions";

/**
 * Pages over the tabs (P-63): Settings, Search and Notifications. The same gate as the tabs:
 * only signed-in, paired, set-up people; everyone else goes back through the entry gate.
 */
export default function SpaceLayout() {
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const pairing = usePairingStatus();
  const setup = useSetupState(signedIn);
  if (auth.data !== undefined && !signedIn) return <Redirect href="/" />;
  if (pairing.data !== undefined && pairing.data.kind !== "paired") return <Redirect href="/" />;
  if (setup.data !== undefined && !setup.data.profile.complete) return <Redirect href="/setup" />;
  return <Stack screenOptions={{ headerShown: false, ...PAGE }} />;
}
