import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";
import { API_AREAS_ON } from "@/data/http/config";
import { useTestingTools } from "@/features/prototype/devTools";
import { NotificationSync } from "@/notifications/NotificationSync";
import { PrototypePanel } from "@/features/prototype/PrototypePanel";
import { ProfileThemeSync } from "@/features/setup/ProfileThemeSync";
import { AppProviders } from "@/providers/AppProviders";
import { PAGE } from "@/theme/transitions";

export { AppErrorBoundary as ErrorBoundary } from "@/providers/AppErrorBoundary";

// Web: no browser focus rectangles on fields; focus is shown by the glass glow (P-62).
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = "input, textarea { outline: none !important; }";
  document.head.appendChild(style);
}

// Keep the splash screen up until the fonts are ready, so text never flashes in a fallback face.
void SplashScreen.preventAutoHideAsync();

/**
 * Root navigator. Route groups are added page by page as designs are approved (gate B-04):
 * (auth) and (onboarding) now; (tabs)/home|days|us|moments|our-world, settings, preview-lab later.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const ready = loaded || error !== null;

  useEffect(() => {
    // If fonts fail to load, continue with the system fonts rather than block the app.
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <AppProviders>
      <ProfileThemeSync />
      <Stack screenOptions={{ headerShown: false, ...PAGE }} />
      <NotificationSync />
      <TestingPanel />
    </AppProviders>
  );
}

/** The ✦ prototype panel, only in development when not connected to real API (P-75). */
function TestingPanel() {
  const tools = useTestingTools();
  return __DEV__ && !API_AREAS_ON.has("auth") && tools ? <PrototypePanel /> : null;
}
