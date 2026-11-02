import { Stack } from "expo-router";
import { PAGE } from "@/theme/transitions";

/** Onboarding after sign-in: pairing (PAIR-01 to PAIR-07). Setup (03) joins this group later. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, ...PAGE }} />;
}
