import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { PrototypePanel } from "@/features/prototype/PrototypePanel";
import { ProfileThemeSync } from "@/features/setup/ProfileThemeSync";
import { AppProviders } from "@/providers/AppProviders";

export { AppErrorBoundary as ErrorBoundary } from "@/providers/AppErrorBoundary";

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
      <ToastProvider>
        <ProfileThemeSync />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
        <PrototypePanel />
      </ToastProvider>
    </AppProviders>
  );
}
