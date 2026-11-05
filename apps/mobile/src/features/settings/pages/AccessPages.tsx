/**
 * The ways into the account, in Settings (B2, P-79, P-80): email and password, Google and Apple
 * as ways into one account, and changing the email or the birthday. Anything that changes how
 * someone gets in needs a recent sign-in, so a borrowed phone can't do it.
 */
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Glass } from "@/components/ui/Glass";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { SocialProvider } from "@/data/repositories/types";
import {
  ageCheckToday,
  birthDateError,
  fieldErrorMessage,
  isEmailShaped,
  PASSWORD_POLICY_P78,
} from "@/domain/auth";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { AppleLogo, GoogleG } from "@/features/auth/components/ProviderLogos";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "../components/SettingsList";
import {
  useAccountMethods,
  useChangeBirthDate,
  useChangeEmail,
  useConnectProvider,
  useDisconnectProvider,
  useSendPasswordLink,
  useSettings,
} from "../useSettings";

const NAME: Record<SocialProvider, string> = { google: "Google", apple: "Apple" };
const SIGN_IN_AGAIN = "For your safety, please sign out and back in first, then try again.";

/** SET-12b · Sign-in methods: the ways into this account (P-80). */
export function SignInMethodsPage() {
  const { spacing, colors } = useTheme();
  const toast = useToast();
  const methods = useAccountMethods();
  const connect = useConnectProvider();
  const disconnect = useDisconnectProvider();
  const sendLink = useSendPasswordLink();
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };

  const data = methods.data;
  if (data === undefined)
    return (
      <SettingsPage title="Sign-in methods">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );

  const add = (provider: SocialProvider) => {
    setProblem(null);
    connect.mutate(provider, {
      onSuccess: (r) => {
        if (r.ok) toast.show(`${NAME[provider]} is connected.`);
        else if (r.reason === "taken")
          setProblem(`That ${NAME[provider]} account already belongs to another Garnet account.`);
        else if (r.reason === "sign-in-again") setProblem(SIGN_IN_AGAIN);
        else if (r.reason !== "cancelled")
          setProblem(`${NAME[provider]} isn't available right now. Please try again.`);
      },
      onError,
    });
  };
  const remove = (provider: SocialProvider) => {
    setProblem(null);
    disconnect.mutate(provider, {
      onSuccess: (r) => {
        if (r.ok) toast.show(`${NAME[provider]} is disconnected.`);
        else if (r.reason === "last-one")
          setProblem("This is your only way in. Add another before removing it.");
        else setProblem(SIGN_IN_AGAIN);
      },
      onError,
    });
  };

  const provider = (id: SocialProvider) => {
    const m = data[id];
    if (!m.available && !m.connected) return null;
    return (
      <SettingsRow
        key={id}
        label={NAME[id]}
        detail={m.connected ? "You can sign in with this" : "Not connected"}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            {id === "google" ? (
              <GoogleG size={18} />
            ) : (
              <AppleLogo size={18} color={colors.textPrimary} />
            )}
            <Button
              label={m.connected ? "Remove" : "Connect"}
              variant="text"
              disabled={connect.isPending || disconnect.isPending}
              onPress={() => {
                if (m.connected) remove(id);
                else add(id);
              }}
            />
          </View>
        }
      />
    );
  };

  return (
    <SettingsPage
      title="Sign-in methods"
      intro="All of these open the same account, so you only ever have one."
    >
      <SettingsSection title="Ways in">
        <SettingsRow
          icon="key"
          tint={palette.violet500}
          label="Email and password"
          detail={data.password ? "You can sign in with this" : "No password yet"}
          {...(data.password
            ? {}
            : {
                right: (
                  <Button
                    label="Set one"
                    variant="text"
                    loading={sendLink.isPending}
                    onPress={() => {
                      sendLink.mutate(undefined, {
                        onSuccess: () => {
                          toast.show("We've emailed you a link to set a password.");
                        },
                        onError,
                      });
                    }}
                  />
                ),
              })}
        />
        {provider("google")}
        {provider("apple")}
      </SettingsSection>
      {problem === null ? null : <Notice tone="error" text={problem} />}
    </SettingsPage>
  );
}

/** SET-02b · Change email: the current address confirms, then the new one (P-80). */
export function ChangeEmailPage() {
  const { radii, spacing } = useTheme();
  const toast = useToast();
  const current = useSettings().data?.email;
  const change = useChangeEmail();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shaped = isEmailShaped(email);

  if (sent)
    return (
      <SettingsPage title="Change email">
        <Notice
          tone="info"
          icon="mail"
          text="Check your current inbox first. Once you confirm there, we'll email the new address to finish."
        />
        <Button
          label="Done"
          variant="secondary"
          onPress={() => {
            goBack("/settings/profile");
          }}
        />
      </SettingsPage>
    );

  return (
    <SettingsPage
      title="Change email"
      intro="Your current address confirms first, then the new one. Nothing changes until both do."
    >
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField
          label="New email"
          icon="mail"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setProblem(null);
          }}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          {...(current === undefined ? {} : { placeholder: current })}
          {...(tried && !shaped ? { error: "That doesn't look like an email address." } : {})}
        />
        <Button
          label="Send confirmation"
          loading={change.isPending}
          disabled={email.trim() === ""}
          onPress={() => {
            setTried(true);
            if (!shaped) return;
            change.mutate(email, {
              onSuccess: (r) => {
                if (r.ok) setSent(true);
                else if (r.reason === "same") setProblem("That's already your email.");
                else if (r.reason === "sign-in-again") setProblem(SIGN_IN_AGAIN);
                else if (r.reason === "rate-limited")
                  setProblem("That's a lot of tries. Please wait a moment.");
                else setProblem("That didn't work. Please try again.");
              },
              onError: (e) => {
                toast.show(serviceErrorMessage(e), "error");
              },
            });
          }}
        />
      </Glass>
      {problem === null ? null : <Notice tone="error" text={problem} />}
    </SettingsPage>
  );
}

/** SET-02c · Birthday: correcting it, still 16 and over (P-79). The partner sees it. */
export function BirthdayPage() {
  const { radii, spacing } = useTheme();
  const toast = useToast();
  const settings = useSettings().data;
  const change = useChangeBirthDate();
  const [typed, setTyped] = useState<string | null | undefined>(undefined);
  const [tried, setTried] = useState(false);
  const [today] = useState(() => ageCheckToday());
  if (settings === undefined)
    return (
      <SettingsPage title="Birthday">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const value = typed === undefined ? settings.birthDate : typed;
  const error = tried ? birthDateError(value ?? "", today) : null;
  return (
    <SettingsPage title="Birthday">
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <DateField
          label="Your birthday"
          value={value}
          onChange={setTyped}
          autofill="birthday"
          helper={`${settings.partner.name || "Your partner"} sees it, so you never miss a celebration.`}
          {...(error === null ? {} : { error: fieldErrorMessage(error, PASSWORD_POLICY_P78) })}
        />
        <Button
          label="Save"
          loading={change.isPending}
          disabled={typed === undefined}
          onPress={() => {
            setTried(true);
            if (value === null || birthDateError(value, today) !== null) return;
            change.mutate(value, {
              onSuccess: (r) => {
                if (r.ok) {
                  toast.show("Birthday saved.");
                  router.back();
                } else toast.show("Garnet is for people 16 and over.", "error");
              },
              onError: (e) => {
                toast.show(serviceErrorMessage(e), "error");
              },
            });
          }}
        />
      </Glass>
    </SettingsPage>
  );
}
