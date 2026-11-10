/**
 * AUTH-04 · Verify email (Daylight Glass, P-48). With the API, the email's link opens this screen
 * with its token (through the https opener, production-fix-plan A7); on mock data "Open email
 * preview (demo)" stands in for it. Only a masked address is shown. States: waiting, confirming
 * a link, resent with cooldown, verified (sparkles), expired link, already verified.
 */
import { Haptics } from "@/components/ui/haptics";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Notice } from "@/components/ui/Notice";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/theme/ThemeProvider";
import { formatSeconds, serviceErrorMessage, useCountdown } from "../authUi";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { GlassEnvelope } from "../components/GlassEnvelope";
import { StatusHero } from "@/components/ui/StatusHero";
import {
  useAuthStatus,
  useCancelVerification,
  useFinishVerification,
  useOpenVerificationLink,
  useResendVerification,
} from "../useAuth";
import { ENTER } from "@/theme/transitions";
import { API_AREAS_ON } from "@/data/http/config";

export function VerifyEmailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const status = useAuthStatus();
  const open = useOpenVerificationLink();
  const resend = useResendVerification();
  const finish = useFinishVerification();
  const cancel = useCancelVerification();
  const [expired, setExpired] = useState(false);
  const [cooldown, setCooldown] = useState({ seconds: 0, key: 0 });
  const wait = useCountdown(cooldown.seconds, cooldown.key);
  // The email's link (garnet://verify-email?token=…) opens this screen with its token: verify
  // once, straight away (B1).
  const { token } = useLocalSearchParams<{ token?: string }>();
  const linkToken = typeof token === "string" && token !== "" ? token : undefined;
  const handled = useRef<string | null>(null);
  const { mutate: openLink } = open;
  useEffect(() => {
    if (linkToken === undefined || handled.current === linkToken) return;
    handled.current = linkToken;
    openLink(linkToken, {
      onSuccess: (result) => {
        setExpired(!result.ok);
      },
      onError: (error) => {
        toast.show(serviceErrorMessage(error), "error");
      },
    });
  }, [linkToken, openLink, toast]);

  // A link being handled waits here (production-fix-plan A6): the status may not say
  // "verifying" yet (a fresh start, a reinstall), and redirecting now would drop the token and
  // land on the welcome page. The mutation settles only once the new status is in (useAuth).
  const linkInFlight = linkToken !== undefined && (open.isIdle || open.isPending);
  if (status.data === undefined || linkInFlight) {
    return (
      <GlassScreen>
        <View style={styles.fill}>
          <ActivityIndicator
            color={colors.accent}
            accessibilityLabel={linkInFlight ? "Confirming your email" : "Loading"}
          />
        </View>
      </GlassScreen>
    );
  }
  if (status.data.kind !== "verifying") return <Redirect href="/" />;

  const { maskedEmail, verified } = status.data;
  const onError = (error: unknown) => {
    toast.show(serviceErrorMessage(error), "error");
  };

  if (verified) {
    return (
      <GlassScreen
        footer={
          <Button
            label="Continue"
            loading={finish.isPending}
            onPress={() => {
              finish.mutate(undefined, {
                onSuccess: () => {
                  router.replace("/");
                },
                onError,
              });
            }}
          />
        }
      >
        <StatusHero
          art={<GarnetMark size={108} />}
          celebrate
          title="Email verified"
          body="You're all set. Welcome to your space."
        />
      </GlassScreen>
    );
  }

  return (
    <GlassScreen
      footer={
        <>
          {/* The email preview is a mock-data stand-in; with the API the real email has the link. */}
          {API_AREAS_ON.has("auth") ? null : (
            <Button
              label="Open email preview (demo)"
              loading={open.isPending}
              onPress={() => {
                open.mutate(undefined, {
                  onSuccess: (result) => {
                    setExpired(!result.ok);
                    if (result.ok && Platform.OS !== "web")
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  },
                  onError,
                });
              }}
            />
          )}
          <Button
            label={wait > 0 ? `Resend in ${formatSeconds(wait)}` : "Resend email"}
            variant="secondary"
            loading={resend.isPending}
            disabled={wait > 0}
            onPress={() => {
              resend.mutate(undefined, {
                onSuccess: ({ cooldownSeconds }) => {
                  setExpired(false);
                  setCooldown((c) => ({ seconds: cooldownSeconds, key: c.key + 1 }));
                  toast.show("Sent again.", "success");
                },
                onError,
              });
            }}
          />
          <Button
            label="Change email"
            variant="text"
            onPress={() => {
              cancel.mutate(undefined, {
                onSuccess: () => {
                  router.replace("/create-account");
                },
                onError,
              });
            }}
          />
        </>
      }
    >
      <View style={[styles.fill, { gap: spacing.xl }]}>
        <GlassEnvelope />
        <Animated.View
          {...(reduceMotion ? {} : { entering: ENTER })}
          style={[styles.center, { gap: spacing.md }]}
        >
          <AppText variant="largeTitle" style={styles.centerText}>
            Check your inbox
          </AppText>
          <Glass
            radius={radii.pill}
            shadow={false}
            contentStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
          >
            <AppText variant="body" weight="600">
              {maskedEmail}
            </AppText>
          </Glass>
        </Animated.View>
        {API_AREAS_ON.has("auth") ? null : <SimulatedBadge />}
        {expired ? (
          <Notice tone="error" icon="clock" text="This link has expired. We can send a new one." />
        ) : null}
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  centerText: { textAlign: "center" },
});
