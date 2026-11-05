/**
 * AUTH-06 · Set a new password, opened from the reset link (Daylight Glass, P-48). Expired, used
 * and invalid links each get a calm explanation and "Request a new link". A reset signs out
 * other devices (ADR-0006, proposed). Password rules follow P-25 (proposed), passed explicitly.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, type TextInput, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Checklist } from "@/components/ui/Checklist";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { ResetLinkStatus } from "@/data/repositories/types";
import {
  fieldErrorMessage,
  hasErrors,
  passwordChecks,
  PASSWORD_POLICY_P78,
  validateNewPassword,
} from "@/domain/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { serviceErrorMessage } from "../authUi";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { StatusHero } from "@/components/ui/StatusHero";
import { useResetLink, useResetPassword } from "../useAuth";

const POLICY = PASSWORD_POLICY_P78;

type LinkProblem = Exclude<ResetLinkStatus, "valid">;

export const LINK_TITLE: Record<LinkProblem, string> = {
  expired: "This link has expired",
  used: "This link was already used",
  invalid: "This link isn't valid",
};

/** The title names the problem; the line under it explains, without repeating it. */
export const LINK_COPY: Record<LinkProblem, string> = {
  expired: "Reset links only work for a short time. You can ask for a new one.",
  used: "Each reset link works once. You can ask for a new one.",
  invalid: "It may be incomplete. You can ask for a new one.",
};

export function ResetPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing } = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const linkToken = typeof token === "string" ? token : "";
  const link = useResetLink(linkToken);
  const reset = useResetPassword();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [linkProblem, setLinkProblem] = useState<LinkProblem | null>(null);
  const confirmRef = useRef<TextInput>(null);

  if (done) {
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
          icon="check"
          tone="success"
          celebrate
          title="Password updated"
          body="Sign in with your new password."
        />
      </GlassScreen>
    );
  }

  if (link.isPending) {
    return (
      <GlassScreen>
        <View style={styles.fill}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Checking your link" />
        </View>
      </GlassScreen>
    );
  }

  const state = linkProblem ?? link.data ?? "invalid";
  if (state !== "valid") {
    return (
      <GlassScreen
        footer={
          <Button
            label="Request a new link"
            onPress={() => {
              router.replace("/forgot-password");
            }}
          />
        }
      >
        <StatusHero icon="clock" tint="ruby" title={LINK_TITLE[state]} body={LINK_COPY[state]} />
      </GlassScreen>
    );
  }

  const errors = submitted ? validateNewPassword(form, POLICY) : {};
  const errorProp = (e: (typeof errors)["password"]) =>
    e === undefined ? {} : { error: fieldErrorMessage(e, POLICY) };
  const checks = passwordChecks(form.password, form.confirmPassword, POLICY);
  const submit = () => {
    setSubmitted(true);
    if (hasErrors(validateNewPassword(form, POLICY))) return;
    reset.mutate(
      { token: linkToken, password: form.password },
      {
        onSuccess: (result) => {
          if (result.ok) setDone(true);
          else setLinkProblem(result.reason);
        },
        onError: (e) => {
          toast.show(serviceErrorMessage(e), "error");
        },
      },
    );
  };

  return (
    <GlassScreen
      footer={<Button label="Save new password" onPress={submit} loading={reset.isPending} />}
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="largeTitle">Set a new password</AppText>
      </View>
      <View style={{ gap: spacing.lg }}>
        <FieldGroup>
          <TextField
            appearance="row"
            label="New password"
            secure
            autoFocus
            value={form.password}
            onChangeText={(password) => {
              setForm((f) => ({ ...f, password }));
            }}
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules={`minlength: ${POLICY.minLength};`}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            submitBehavior="submit"
            disabled={reset.isPending}
            {...errorProp(errors.password)}
          />
          <TextField
            ref={confirmRef}
            appearance="row"
            label="Confirm new password"
            secure
            value={form.confirmPassword}
            onChangeText={(confirmPassword) => {
              setForm((f) => ({ ...f, confirmPassword }));
            }}
            autoComplete="new-password"
            textContentType="newPassword"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
            disabled={reset.isPending}
            {...errorProp(errors.confirmPassword)}
          />
        </FieldGroup>
        <Checklist
          items={[
            { label: `At least ${POLICY.minLength} characters`, met: checks.longEnough },
            { label: "Not easy to guess", met: checks.hardToGuess },
            { label: "Passwords match", met: checks.matches },
          ]}
        />
        <Notice text="This signs you out on your other devices." icon="devices" />
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
