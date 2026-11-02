import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useToast } from "@/components/ui/Toast";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";
import { useHomeToday, useSendSignal } from "./useHome";

/**
 * W3 "Thinking of you" (widgets plan, P-72, P-73): the widget only opens this page. Nothing is
 * sent until the person taps Send here (§6, sharing is always explicit); Not now sends nothing.
 */
export function SendThoughtScreen() {
  const { radii, spacing } = useTheme();
  const toast = useToast();
  const today = useHomeToday();
  const send = useSendSignal();
  const partner = today.data?.partner.name ?? "your person";
  const side = today.data?.me.side ?? "garnet";
  const home = () => {
    router.replace("/home");
  };
  return (
    <GlassScreen onBack={home} wash="none">
      <View style={[styles.center, { gap: spacing.lg }]}>
        <CharacterSlot
          character={side}
          look={{ mood: "loving", occasion: "everyday" }}
          size={200}
          aspectRatio={FRAME_ASPECT}
        />
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <AppText variant="title" serif style={styles.centerText}>
            Send &lsquo;I thought of you&rsquo;?
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.centerText}>
            To {partner}. From your widget, Garnet always asks first.
          </AppText>
          <Button
            label="Send 💭"
            loading={send.isPending}
            onPress={() => {
              send.mutate("thought-of-you", {
                onSuccess: () => {
                  toast.show(`Sent to ${partner} 💜`);
                  home();
                },
                onError: (e) => {
                  toast.show(serviceErrorMessage(e), "error");
                },
              });
            }}
          />
          <Button label="Not now" variant="text" onPress={home} />
        </Glass>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", flexGrow: 1, paddingTop: 24 },
  centerText: { textAlign: "center" },
});
