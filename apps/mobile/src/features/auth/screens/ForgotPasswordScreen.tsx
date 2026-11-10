/**
 * AUTH-05 · Forgot password (Daylight Glass, P-48). Always the same neutral confirmation,
 * whether or not an account exists (never confirms an account; ADR-0006). Simulated: no email is
 * sent.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { DEMO_RESET_TOKENS } from "@/data/fixtures/demoAuth";
import {
  fieldErrorMessage,
  isEmailShaped,
  PASSWORD_POLICY_P78,
  type FieldError,
} from "@/domain/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { serviceErrorMessage } from "../authUi";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { StatusHero } from "@/components/ui/StatusHero";
import { useRequestPasswordReset } from "../useAuth";
import { goBack } from "@/navigation/goBack";
import { API_AREAS_ON } from "@/data/http/config";

/** The one message every request gets (AUTH-05). Exported for the privacy test. */
export const RESET_SENT_MESSAGE =
  "If an account exists for this email, a reset link is on its way.";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const { spacing } = useTheme();
  const request = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);

  const error: FieldError | null = !submitted
    ? null
    : email.trim().length === 0
      ? "required"
      : isEmailShaped(email)
        ? null
        : "email-malformed";

  const submit = () => {
    setSubmitted(true);
    if (email.trim().length === 0 || !isEmailShaped(email)) return;
    request.mutate(email, {
      onSuccess: () => {
        setSent(true);
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  const backToSignIn = (
    <Button
      label="Back to sign in"
      variant="text"
      onPress={() => {
        router.replace("/sign-in");
      }}
    />
  );

  if (sent) {
    return (
      <GlassScreen
        footer={
          <>
            {API_AREAS_ON.has("auth") ? null : (
              <Button
                label="Open reset link (demo)"
                onPress={() => {
                  router.push({
                    pathname: "/reset-password",
                    params: { token: DEMO_RESET_TOKENS.valid },
                  });
                }}
              />
            )}
            {backToSignIn}
          </>
        }
      >
        <StatusHero icon="mail" title="Check your inbox" body={RESET_SENT_MESSAGE}>
          {API_AREAS_ON.has("auth") ? null : <SimulatedBadge />}
        </StatusHero>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen
      onBack={() => {
        goBack("/sign-in");
      }}
      footer={
        <>
          <Button label="Send reset link" onPress={submit} loading={request.isPending} />
          {backToSignIn}
        </>
      }
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="largeTitle">Forgot your password?</AppText>
      </View>
      <TextField
        label="Email"
        placeholder="you@example.com"
        autoFocus
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="send"
        onSubmitEditing={submit}
        disabled={request.isPending}
        {...(error === null ? {} : { error: fieldErrorMessage(error, PASSWORD_POLICY_P78) })}
      />
    </GlassScreen>
  );
}
