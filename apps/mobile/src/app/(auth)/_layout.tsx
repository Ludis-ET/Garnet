import { Stack } from "expo-router";
import { PAGE } from "@/theme/transitions";

/** Welcome and account flows (AUTH-01 to AUTH-07). Simulated: no account or email is real. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, ...PAGE }} />;
}
