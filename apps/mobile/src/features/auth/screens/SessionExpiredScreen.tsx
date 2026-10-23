/**
 * AUTH-07 · Session expired (Daylight Glass, P-48). It replaces the screen on the opaque aurora
 * canvas on purpose: no private content is visible or blurred behind it (spec A9 privacy).
 */
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { StatusHero } from "@/components/ui/StatusHero";

export function SessionExpiredScreen() {
  const router = useRouter();
  return (
    <GlassScreen
      footer={
        <Button
          label="Sign in"
          onPress={() => {
            router.replace("/sign-in");
          }}
        />
      }
    >
      <StatusHero
        icon="lock"
        title="Please sign in again"
        body="For your privacy, you've been signed out on this device."
      />
    </GlassScreen>
  );
}
