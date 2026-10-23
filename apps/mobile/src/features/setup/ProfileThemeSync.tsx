import { useEffect } from "react";
import { useAuthStatus } from "@/features/auth/useAuth";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { useSetupState } from "./useSetup";

/**
 * Applies the signed-in person's side colour and appearance to the whole app (SETUP-03,
 * SETUP-06). Personal pages use the viewer's own side (master style); signed-out screens and
 * people who haven't chosen a side stay Garnet violet. Renders nothing.
 */
export function ProfileThemeSync() {
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const setup = useSetupState(signedIn);
  const { setSide, setSchemePreference } = useThemeSettings();
  const side = signedIn ? (setup.data?.profile.side ?? null) : null;
  const appearance = signedIn ? setup.data?.profile.appearance : undefined;

  useEffect(() => {
    setSide(side ?? "garnet");
  }, [side, setSide]);

  useEffect(() => {
    if (appearance !== undefined) setSchemePreference(appearance);
  }, [appearance, setSchemePreference]);

  return null;
}
