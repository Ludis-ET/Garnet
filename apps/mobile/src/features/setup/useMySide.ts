import type { GemSide } from "@/domain/identity";
import { useAuthStatus } from "@/features/auth/useAuth";
import { useSetupState } from "./useSetup";

/** The signed-in person's side (P-51), or null before they choose or when signed out. */
export function useMySide(): GemSide | null {
  const auth = useAuthStatus();
  const setup = useSetupState(auth.data?.kind === "signedIn");
  return auth.data?.kind === "signedIn" ? (setup.data?.profile.side ?? null) : null;
}
