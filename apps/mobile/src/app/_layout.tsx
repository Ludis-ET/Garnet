import { Stack } from "expo-router";
import { AppProviders } from "@/providers/AppProviders";

export { AppErrorBoundary as ErrorBoundary } from "@/providers/AppErrorBoundary";

/**
 * Root navigator. Route groups are added page by page as designs are approved (gate B-04):
 * (auth), (onboarding), (tabs)/home|days|us|moments|our-world, settings, preview-lab.
 * See docs/design/page-design-prompts.md for the full route map.
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </AppProviders>
  );
}
