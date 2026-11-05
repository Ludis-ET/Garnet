/**
 * AUTH-11 · Confirm an email change (P-80): opened from the link sent to the current address.
 * Saying yes here sends the last step to the new address; the email changes only after that.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useTheme } from "@/theme/ThemeProvider";
import { useConfirmEmailChange } from "../useAuth";

export function ConfirmEmailChangeScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const confirm = useConfirmEmailChange();
  const started = useRef(false);
  const { mutate } = confirm;

  // A link works once: it is used on arrival, and never again on a re-render.
  useEffect(() => {
    if (started.current || token === undefined || token === "") return;
    started.current = true;
    mutate(token);
  }, [token, mutate]);

  const failed = token === undefined || confirm.isError || confirm.data?.ok === false;
  return (
    <GlassScreen
      footer={
        <Button
          label="Done"
          disabled={confirm.isPending}
          onPress={() => {
            router.replace("/");
          }}
        />
      }
    >
      <View style={[styles.center, { gap: spacing.md }]}>
        <GarnetMark size={56} animated={false} />
        {confirm.isPending ? (
          <ActivityIndicator accessibilityLabel="Confirming" />
        ) : (
          <>
            <AppText variant="title" style={styles.text} accessibilityRole="header">
              {failed ? "This link has expired" : "One more step"}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.text}>
              {failed
                ? "Nothing has changed. You can ask for a new link in Settings."
                : "We've emailed your new address. Open that link to finish changing your email."}
            </AppText>
          </>
        )}
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { textAlign: "center" },
});
