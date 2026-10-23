/**
 * AUTH-02 · Create account, one question per step (Daylight Glass, P-48): name, email, then
 * password and confirmation. Simulated: no account is created, no email is sent. Password rules
 * follow P-25 (proposed), passed explicitly. Errors sit under their own field and valid input is
 * never cleared, across steps too. A possible duplicate gets neutral copy and returns to the
 * email step (never confirms an account).
 */
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Platform, StyleSheet, type TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Checklist } from "@/components/ui/Checklist";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import {
  CREATE_ACCOUNT_STEPS,
  fieldErrorMessage,
  firstStepWithErrors,
  hasErrors,
  passwordChecks,
  PASSWORD_POLICY_P25,
  stepErrors,
  type CreateAccountForm,
  type CreateAccountStep,
} from "@/domain/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { serviceErrorMessage } from "../authUi";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useCreateAccount } from "../useAuth";

/** P-25 (proposed, not approved): the prototype uses it explicitly. */
const POLICY = PASSWORD_POLICY_P25;

const QUESTIONS: Record<CreateAccountStep, string> = {
  0: "What should we call you?",
  1: "What's your email?",
  2: "Create a password",
};

/** How many steps, in order, are already complete: lights the crystal's facets. */
function completedSteps(form: CreateAccountForm): 0 | 1 | 2 | 3 {
  const first = firstStepWithErrors(form, POLICY);
  return first ?? 3;
}

export function CreateAccountScreen() {
  const router = useRouter();
  const toast = useToast();
  const { spacing, reduceMotion } = useTheme();
  const create = useCreateAccount();
  const [form, setForm] = useState<CreateAccountForm>({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [step, setStep] = useState<CreateAccountStep>(0);
  const [forward, setForward] = useState(true);
  // Errors for a step appear once the person tries to continue from it.
  const [tried, setTried] = useState<readonly boolean[]>([false, false, false]);
  const [maybeExists, setMaybeExists] = useState(false);
  const confirm = useRef<TextInput>(null);

  const errors = tried[step] === true ? stepErrors(form, step, POLICY) : {};
  const errorFor = (field: keyof CreateAccountForm) => {
    const e = errors[field];
    return e === undefined ? {} : { error: fieldErrorMessage(e, POLICY) };
  };
  const set = (field: keyof CreateAccountForm) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "email") setMaybeExists(false);
  };
  const go = (to: CreateAccountStep) => {
    setForward(to > step);
    setStep(to);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };
  // Duolingo pattern: Continue waits until the step has something in it; then a press
  // either moves on or explains what to fix.
  const empty = CREATE_ACCOUNT_STEPS[step].every((field) => form[field].length === 0);

  const submit = () => {
    create.mutate(
      { displayName: form.displayName, email: form.email, password: form.password },
      {
        onSuccess: (result) => {
          if (result.ok) {
            if (Platform.OS !== "web")
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/verify-email");
          } else {
            setMaybeExists(true);
            go(1);
          }
        },
        onError: (error) => {
          toast.show(serviceErrorMessage(error), "error");
        },
      },
    );
  };

  const next = () => {
    setTried((t) => t.map((v, i) => (i === step ? true : v)));
    if (hasErrors(stepErrors(form, step, POLICY))) {
      if (Platform.OS !== "web")
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (step < 2) go((step + 1) as CreateAccountStep);
    else submit();
  };

  const back = () => {
    if (step > 0) go((step - 1) as CreateAccountStep);
    else router.back();
  };

  const busy = create.isPending;
  const checks = passwordChecks(form.password, form.confirmPassword, POLICY);
  const enter = reduceMotion
    ? FadeIn.duration(150)
    : (forward ? FadeInRight : FadeInLeft).springify().damping(20).stiffness(180);

  return (
    <GlassScreen
      onBack={back}
      header={<ProgressBar step={step + 1} total={3} />}
      footer={
        <>
          <Button
            label={step === 2 ? "Create account" : "Continue"}
            onPress={next}
            loading={busy}
            disabled={empty}
          />
          {step === 0 ? (
            <View style={[styles.row, { gap: spacing.xs }]}>
              <AppText variant="callout" color="textSecondary">
                Already have an account?
              </AppText>
              <Button
                label="Sign in"
                variant="text"
                style={styles.inline}
                onPress={() => {
                  router.replace("/sign-in");
                }}
              />
            </View>
          ) : null}
        </>
      }
    >
      <Animated.View key={step} entering={enter} style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={styles.gem}>
            <GarnetMark size={56} progress={completedSteps(form)} />
          </View>
          <AppText variant="question">{QUESTIONS[step]}</AppText>
        </View>

        {step === 0 ? (
          <TextField
            label="Display name"
            placeholder="Your name"
            large
            autoFocus
            value={form.displayName}
            onChangeText={set("displayName")}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={next}
            submitBehavior="submit"
            disabled={busy}
            {...errorFor("displayName")}
          />
        ) : null}

        {step === 1 ? (
          <View style={{ gap: spacing.lg }}>
            <TextField
              label="Email"
              placeholder="you@example.com"
              large
              autoFocus
              value={form.email}
              onChangeText={set("email")}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={next}
              submitBehavior="submit"
              disabled={busy}
              {...errorFor("email")}
            />
            {maybeExists ? (
              <View style={{ gap: spacing.xs }}>
                <Notice
                  tone="error"
                  text="An account may already exist for this email. Try signing in."
                />
                <Button
                  label="Sign in instead"
                  variant="text"
                  style={styles.start}
                  onPress={() => {
                    router.replace("/sign-in");
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: spacing.lg }}>
            <TextField
              label="Password"
              secure
              autoFocus
              value={form.password}
              onChangeText={set("password")}
              autoComplete="new-password"
              textContentType="newPassword"
              passwordRules={`minlength: ${POLICY.minLength};`}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirm.current?.focus()}
              submitBehavior="submit"
              disabled={busy}
              {...errorFor("password")}
            />
            <TextField
              ref={confirm}
              label="Confirm password"
              secure
              value={form.confirmPassword}
              onChangeText={set("confirmPassword")}
              autoComplete="new-password"
              textContentType="newPassword"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={next}
              disabled={busy}
              {...errorFor("confirmPassword")}
            />
            <Checklist
              items={[
                { label: `At least ${POLICY.minLength} characters`, met: checks.longEnough },
                { label: "Passwords match", met: checks.matches },
              ]}
            />
            <AppText variant="footnote" color="textTertiary">
              By creating an account you agree to the{" "}
              <AppText
                variant="footnote"
                color="accent"
                accessibilityRole="link"
                onPress={() => {
                  toast.show("Terms and privacy are designed later in this prototype.");
                }}
              >
                Terms and Privacy notice
              </AppText>
              .
            </AppText>
          </View>
        ) : null}
      </Animated.View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  inline: { alignSelf: "auto" },
  start: { alignSelf: "flex-start" },
  gem: { alignItems: "flex-start" },
});
