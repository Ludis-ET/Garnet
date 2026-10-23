/**
 * PAIR-07 · Already connected (Daylight Glass, P-49). Shown when a paired person opens the
 * invitation or join screens. Garnet is for exactly two people. Leaving a space is a Settings
 * flow (SET-xx), designed later; U-32 (pairing again) stays open.
 */
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/theme/ThemeProvider";
import { AvatarLink } from "../components/Avatar";
import { usePairingStatus } from "../usePairing";

export function AlreadyPairedScreen() {
  const router = useRouter();
  const toast = useToast();
  const { spacing } = useTheme();
  const status = usePairingStatus();
  const data = status.data;

  if (data !== undefined && data.kind !== "paired") return <Redirect href="/pair" />;

  return (
    <GlassScreen
      footer={
        <>
          <Button
            label="Go to my space"
            onPress={() => {
              router.replace("/");
            }}
          />
          <Button
            label="About leaving a space"
            variant="text"
            onPress={() => {
              toast.show("Leaving a space is designed with Settings, later in this prototype.");
            }}
          />
        </>
      }
    >
      {data === undefined ? null : (
        <View style={[styles.fill, { gap: spacing.xl }]}>
          <AvatarLink left={data.me} right={data.partnerName} connected />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="question" style={styles.centerText}>
              You're already connected
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.centerText}>
              You and {data.partnerName} already share a space. Garnet is for exactly two people.
            </AppText>
          </View>
        </View>
      )}
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { textAlign: "center" },
});
