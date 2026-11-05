/**
 * AUTH-03 · Sign in (Daylight Glass, P-48). One generic error for any wrong combination (never
 * says which field; the whole group shakes, not one field), a calm back-off message after
 * repeated failures (ADR-0006 proposes back-off, no permanent lockout), and "Keep me signed in
 * on this device" (session lifetime is open, U-27).
 */
import { Haptics } from "@/components/ui/haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Platform, StyleSheet, type TextInput, View } from "react-native";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Glass } from "@/components/ui/Glass";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/data/fixtures/demoAuth";
import { fieldErrorMessage, hasErrors, PASSWORD_POLICY_P78, signInErrors } from "@/domain/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";
import { formatSeconds, serviceErrorMessage, useCountdown } from "../authUi";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useSignIn } from "../useAuth";
import { SocialButtons } from "../components/SocialButtons";
import { goBack } from "@/navigation/goBack";

type Problem =
  { kind: "mismatch"; at: number } | { kind: "rate-limited"; seconds: number; at: number } | null;

export function SignInScreen() {
  const router = useRouter();
  const toast = useToast();
  const { radii, spacing } = useTheme();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const passwordRef = useRef<TextInput>(null);
  const wait = useCountdown(problem?.kind === "rate-limited" ? problem.seconds : 0, problem);

  const errors = submitted ? signInErrors(email, password) : {};
  const errorProp = (e: (typeof errors)["email"]) =>
    e === undefined ? {} : { error: fieldErrorMessage(e, PASSWORD_POLICY_P78) };
  const waiting = problem?.kind === "rate-limited" && wait > 0;

  const submit = () => {
    setSubmitted(true);
    if (waiting || hasErrors(signInErrors(email, password))) return;
    signIn.mutate(
      { email, password, keepSignedIn: keep },
      {
        onSuccess: (result) => {
          if (result.ok) {
            setProblem(null);
            if (result.needsVerification) router.replace("/verify-email");
            else router.replace("/");
            return;
          }
          if (Platform.OS !== "web")
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (result.reason === "mismatch") setProblem({ kind: "mismatch", at: Date.now() });
          else
            setProblem({ kind: "rate-limited", seconds: result.retryAfterSeconds, at: Date.now() });
        },
        onError: (error) => {
          toast.show(serviceErrorMessage(error), "error");
        },
      },
    );
  };

  const busy = signIn.isPending;
  return (
    <GlassScreen
      {...(router.canGoBack()
        ? {
            onBack: () => {
              goBack("/welcome");
            },
          }
        : {})}
      footer={
        <>
          <Button
            label={waiting ? `Try again in ${formatSeconds(wait)}` : "Sign in"}
            onPress={submit}
            loading={busy}
            disabled={waiting}
          />
          <View style={[styles.row, { gap: spacing.xs }]}>
            <AppText variant="callout" color="textSecondary">
              New to Garnet?
            </AppText>
            <Button
              label="Create account"
              variant="text"
              style={styles.inline}
              onPress={() => {
                router.replace("/create-account");
              }}
            />
          </View>
        </>
      }
    >
      <View style={{ gap: spacing.sm }}>
        <View style={styles.start}>
          <GarnetMark size={52} animated={false} />
        </View>
        <AppText variant="largeTitle">Welcome back</AppText>
      </View>

      <View style={{ gap: spacing.md }}>
        <SocialButtons divider="below" />
        <FieldGroup shakeKey={problem?.at}>
          <TextField
            appearance="row"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            disabled={busy}
            {...errorProp(errors.email)}
          />
          <TextField
            ref={passwordRef}
            appearance="row"
            label="Password"
            secure
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            textContentType="password"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
            disabled={busy}
            {...errorProp(errors.password)}
          />
        </FieldGroup>
        <Button
          label="Forgot password?"
          variant="text"
          style={styles.end}
          onPress={() => {
            router.push("/forgot-password");
          }}
        />
        {problem?.kind === "mismatch" ? (
          <Notice tone="error" text="Those details don't match. Try again." />
        ) : null}
        {waiting ? (
          <Notice tone="error" icon="clock" text="Please wait a moment before trying again." />
        ) : null}
        <Glass
          radius={radii.xl}
          shadow={false}
          contentStyle={[styles.keep, { paddingHorizontal: spacing.lg, gap: spacing.md }]}
        >
          <AppText variant="callout" style={styles.flex}>
            Keep me signed in on this device
          </AppText>
          <Toggle
            value={keep}
            onValueChange={setKeep}
            accessibilityLabel="Keep me signed in on this device"
          />
        </Glass>
        <Button
          label="Fill the demo account (prototype)"
          variant="subtle"
          onPress={() => {
            setEmail(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
          }}
        />
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  inline: { alignSelf: "auto" },
  start: { alignItems: "flex-start" },
  end: { alignSelf: "flex-end", marginTop: -4 },
  keep: { flexDirection: "row", alignItems: "center", minHeight: touchTarget + 8 },
  flex: { flex: 1 },
});
