/**
 * AUTH-07 · Session expired (Daylight Glass, P-48). It replaces the screen on the opaque aurora
 * canvas on purpose: no private content is visible or blurred behind it (spec A9 privacy).
 */
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { StatusHero } from "@/components/ui/StatusHero";
import { clearAllAuthSessions } from "@/data/http/localState";

export function SessionExpiredScreen() {
  const router = useRouter();
  return (
    <GlassScreen
      footer={
        <View style={{ gap: 8, width: "100%" }}>
          <Button
            label="Sign in"
            onPress={() => {
              void clearAllAuthSessions();
              router.replace("/sign-in");
            }}
          />
          <Button
            label="Start fresh"
            variant="text"
            onPress={() => {
              void clearAllAuthSessions();
              router.replace("/welcome");
            }}
          />
        </View>
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
