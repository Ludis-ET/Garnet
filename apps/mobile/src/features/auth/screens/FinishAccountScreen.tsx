/**
 * AUTH-09 · Finish your account (P-79). After a first Google or Apple sign-in: the birthday
 * (16 and over) and the terms, before anything else. When only the terms have changed, just
 * the terms. Under 16, the new account is removed and nothing is kept; the screen says so
 * calmly and goes back to the start. "Not you?" signs out.
 */
import { Haptics } from "@/components/ui/haptics";
import { TERMS_VERSION } from "@garnet/contracts";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useToast } from "@/components/ui/Toast";
import {
  ageCheckToday,
  birthDateError,
  fieldErrorMessage,
  PASSWORD_POLICY_P78,
} from "@/domain/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";
import { serviceErrorMessage } from "../authUi";
import { TermsConsent } from "../components/TermsConsent";
import { useAuthStatus, useCompleteRegistration, useSignOut } from "../useAuth";

export function FinishAccountScreen() {
  const status = useAuthStatus();
  // Kept here: once the account is removed the status is "signed out", and the explanation
  // must still show instead of a redirect.
  const [removed, setRemoved] = useState(false);
  if (removed) return <TooYoung />;
  if (status.data === undefined) return null;
  if (status.data.kind !== "registering") return <Redirect href="/" />;
  return (
    <FinishAccount
      name={status.data.displayName}
      stored={status.data.birthDate}
      onTooYoung={() => {
        setRemoved(true);
      }}
    />
  );
}

/** Under 16 (P-79): the account and its details are gone; say so calmly, then start again. */
function TooYoung() {
  const router = useRouter();
  const { spacing } = useTheme();
  return (
    <GlassScreen
      footer={
        <Button
          label="Back to the start"
          onPress={() => {
            router.replace("/welcome");
          }}
        />
      }
    >
      <View style={[styles.center, { gap: spacing.md }]}>
        <GarnetMark size={56} animated={false} />
        <AppText variant="title" style={styles.text} accessibilityRole="header">
          Garnet is for people 16 and over
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.text}>
          We haven't kept your account or any of your details. You're welcome back once you're 16.
        </AppText>
      </View>
    </GlassScreen>
  );
}

function FinishAccount({
  name,
  stored,
  onTooYoung,
}: {
  name: string;
  stored: string | null;
  onTooYoung: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { spacing } = useTheme();
  const complete = useCompleteRegistration();
  const signOut = useSignOut();
  const [today] = useState(() => ageCheckToday());
  const [birthDate, setBirthDate] = useState(stored ?? "");
  const [accepted, setAccepted] = useState(false);
  const [tried, setTried] = useState(false);
  const askBirthday = stored === null;

  const birthError = tried && askBirthday ? birthDateError(birthDate, today) : null;
  const termsError = tried && !accepted;

  const submit = () => {
    setTried(true);
    // Under 16: the server removes the new account and everything with it, so it is told even
    // before the terms are agreed (nothing would be kept to agree for).
    const under16 = birthDateError(birthDate, today) === "too-young";
    if (!under16 && (!accepted || birthDateError(birthDate, today) !== null)) {
      if (Platform.OS !== "web")
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    complete.mutate(
      { birthDate, termsVersion: TERMS_VERSION },
      {
        onSuccess: (result) => {
          if (result.ok) router.replace("/");
          else onTooYoung();
        },
        onError: (e) => {
          toast.show(serviceErrorMessage(e), "error");
        },
      },
    );
  };

  return (
    <GlassScreen
      footer={
        <>
          <Button label="Continue" onPress={submit} loading={complete.isPending} />
          <Button
            label={name === "" ? "Not you? Sign out" : `Not ${name}? Sign out`}
            variant="text"
            onPress={() => {
              signOut.mutate(undefined, {
                onSettled: () => {
                  router.replace("/welcome");
                },
              });
            }}
          />
        </>
      }
    >
      <Animated.View entering={ENTER} style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={styles.start}>
            <GarnetMark size={56} progress={askBirthday ? 2 : 3} />
          </View>
          <AppText variant="question">
            {askBirthday ? "Just a couple of details" : "We've updated our terms"}
          </AppText>
          {askBirthday ? null : (
            <AppText variant="body" color="textSecondary">
              Please take a look and agree to carry on.
            </AppText>
          )}
        </View>
        {askBirthday ? (
          <DateField
            label="Your birthday"
            value={birthDate === "" ? null : birthDate}
            onChange={(iso) => {
              setBirthDate(iso ?? "");
            }}
            autofill="birthday"
            disabled={complete.isPending}
            {...(birthError === null
              ? {}
              : { error: fieldErrorMessage(birthError, PASSWORD_POLICY_P78) })}
          />
        ) : null}
        <TermsConsent
          checked={accepted}
          onChange={setAccepted}
          disabled={complete.isPending}
          {...(termsError
            ? { error: fieldErrorMessage("terms-required", PASSWORD_POLICY_P78) }
            : {})}
        />
      </Animated.View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { textAlign: "center" },
  start: { alignItems: "flex-start" },
});
