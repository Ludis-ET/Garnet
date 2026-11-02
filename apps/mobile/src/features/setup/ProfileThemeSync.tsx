import { useEffect } from "react";
import { useAuthStatus } from "@/features/auth/useAuth";
import { useThemeSettings } from "@/theme/ThemeProvider";
import { setHapticsEnabled } from "@/components/ui/haptics";
import { useSettings } from "@/features/settings/useSettings";
import { useSetupState } from "./useSetup";

/**
 * Applies the signed-in person's side colour, appearance and accent intensity to the whole app
 * (SETUP-03, SETUP-06). Personal pages use the viewer's own side (master style); signed-out screens and
 * people who haven't chosen a side stay Garnet violet. Renders nothing.
 */
export function ProfileThemeSync() {
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const setup = useSetupState(signedIn);
  const { setSide, setSchemePreference, setIntensity, setForceReduceMotion } = useThemeSettings();
  const prefs = useSettings(signedIn).data?.settings;
  const motion = prefs?.motion;
  const haptics = prefs?.haptics ?? true;
  const side = signedIn ? (setup.data?.profile.side ?? null) : null;
  const appearance = signedIn ? setup.data?.profile.appearance : undefined;
  const accent = signedIn ? (setup.data?.profile.accent ?? "subtle") : "subtle";

  useEffect(() => {
    setSide(side ?? "garnet");
  }, [side, setSide]);

  useEffect(() => {
    if (appearance !== undefined) setSchemePreference(appearance);
  }, [appearance, setSchemePreference]);

  useEffect(() => {
    setIntensity(accent);
  }, [accent, setIntensity]);

  useEffect(() => {
    setForceReduceMotion(signedIn && motion === "reduce");
  }, [signedIn, motion, setForceReduceMotion]);

  useEffect(() => {
    setHapticsEnabled(haptics);
  }, [haptics]);

  return null;
}
