import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Checklist } from "@/components/ui/Checklist";
import { Glass } from "@/components/ui/Glass";
import { InfoList } from "@/components/ui/InfoList";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { serviceErrorMessage } from "@/features/auth/authUi";
import {
  fieldErrorMessage,
  passwordChecks,
  passwordError,
  PASSWORD_POLICY_P78,
} from "@/domain/auth";
import { cityForZone } from "@/domain/identity";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useSaveSetup, useSetupState } from "@/features/setup/useSetup";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "../components/SettingsList";
import { useTestingTools } from "@/features/prototype/devTools";
import {
  useAccountMethods,
  useChangePassword,
  useDeleteAccount,
  useDevices,
  useEndSpace,
  useExpireExport,
  usePrepareExport,
  useSendPasswordLink,
  useSettings,
  useSignOutDevice,
  useSignOutOthers,
} from "../useSettings";

function useOnError() {
  const toast = useToast();
  return (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
}

/** "se•••@example.test": enough to recognise, not enough to read over a shoulder. */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 2)}•••@${domain}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "12 March 1998". */
function birthdayLabel(iso: string): string {
  const [y = "", m = "", d = ""] = iso.split("-");
  return `${String(Number(d))} ${MONTHS[Number(m) - 1] ?? ""} ${y}`;
}

/** SET-02 · Profile, with Save and Cancel (unsaved changes are kept until either). */
export function ProfilePage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const onError = useOnError();
  const setup = useSetupState().data;
  const settings = useSettings().data;
  const save = useSaveSetup();
  const [draft, setDraft] = useState<{
    displayName: string;
    nickname: string;
    homeCity: string;
  } | null>(null);
  if (setup === undefined || settings === undefined)
    return (
      <SettingsPage title="Profile">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const p = setup.profile;
  const form = draft ?? {
    displayName: p.displayName,
    nickname: p.nickname,
    homeCity: p.homeCity ?? "",
  };
  const changed =
    draft !== null &&
    (draft.displayName !== p.displayName ||
      draft.nickname !== p.nickname ||
      draft.homeCity !== (p.homeCity ?? ""));
  const sideName = p.side === "ruby" ? "Ruby" : p.side === "sapphire" ? "Sapphire" : "Not chosen";
  return (
    <SettingsPage title="Profile">
      <View style={[styles.centerCol, { gap: spacing.sm }]}>
        <ProfileAvatar name={form.displayName} avatar={p.avatar} side={p.side} size={88} />
        <AppText variant="title">{form.nickname.trim() || form.displayName}</AppText>
      </View>
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField
          label="Name"
          icon="user"
          value={form.displayName}
          maxLength={40}
          onChangeText={(t) => {
            setDraft({ ...form, displayName: t });
          }}
          {...(form.displayName.trim().length === 0 ? { error: "Add a name." } : {})}
        />
        <TextField
          label="What Garnet calls you"
          icon="heart"
          value={form.nickname}
          maxLength={30}
          placeholder={p.displayName}
          helper="Shown to you on Home. Leave empty to use your name."
          onChangeText={(t) => {
            setDraft({ ...form, nickname: t });
          }}
        />
        <TextField
          label="Home town"
          icon="pin"
          value={form.homeCity}
          maxLength={80}
          placeholder={cityForZone(p.timeZone ?? "UTC")}
          autoCapitalize="words"
          helper={`${setup.partner.name || "Your partner"} sees it.`}
          onChangeText={(t) => {
            setDraft({ ...form, homeCity: t });
          }}
        />
      </Glass>
      <SettingsSection title="Account">
        <SettingsRow
          icon="mail"
          label="Email"
          value={maskEmail(settings.email)}
          onPress={() => {
            router.push("/settings/email");
          }}
        />
        <SettingsRow
          icon="heart"
          tint={palette.ruby500}
          label="Birthday"
          {...(settings.birthDate === null ? {} : { value: birthdayLabel(settings.birthDate) })}
          onPress={() => {
            router.push("/settings/birthday");
          }}
        />
        <SettingsRow
          icon="gem"
          tint={palette.ruby500}
          label="Side"
          value={sideName}
          detail="Chosen together in setup; the two never match (P-51)"
        />
        <SettingsRow
          icon="globe"
          tint={palette.sapphire500}
          label="Time zone"
          value={cityForZone(p.timeZone ?? "UTC")}
        />
        {settings.termsVersion === null ? null : (
          <SettingsRow
            icon="shield"
            tint={palette.violet400}
            label="Terms and privacy"
            detail={`Agreed to version ${settings.termsVersion}`}
            onPress={() => {
              router.push("/terms");
            }}
          />
        )}
      </SettingsSection>
      {changed ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            label="Save"
            variant="primary"
            loading={save.isPending}
            disabled={form.displayName.trim().length === 0}
            onPress={() => {
              save.mutate(
                {
                  displayName: form.displayName.trim(),
                  nickname: form.nickname.trim(),
                  homeCity: form.homeCity.trim() === "" ? null : form.homeCity.trim(),
                },
                {
                  onSuccess: () => {
                    setDraft(null);
                    toast.show("Profile saved.");
                  },
                  onError,
                },
              );
            }}
          />
          <Button
            label="Cancel"
            variant="text"
            onPress={() => {
              setDraft(null);
            }}
          />
        </View>
      ) : null}
    </SettingsPage>
  );
}

function ago(at: string, now: Temporal.Instant): string {
  const hours = Math.floor(now.since(Temporal.Instant.from(at)).total({ unit: "hours" }));
  if (hours < 1) return "Active now";
  if (hours < 24) return `Active ${String(hours)} h ago`;
  return `Active ${String(Math.floor(hours / 24))} days ago`;
}

/** SET-12 · Devices and password (ADR-0006). What a signed-out device keeps stays open (U-27). */
export function DevicesPage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const onError = useOnError();
  const devices = useDevices().data;
  const methods = useAccountMethods().data;
  const signOut = useSignOutDevice();
  const signOutOthers = useSignOutOthers();
  const change = useChangePassword();
  const sendLink = useSendPasswordLink();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  if (devices === undefined)
    return (
      <SettingsPage title="Devices & password">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const now = Temporal.Now.instant();
  const others = devices.filter((d) => !d.current);
  const checks = passwordChecks(pw.next, pw.next, PASSWORD_POLICY_P78);
  return (
    <SettingsPage title="Devices & password">
      <SettingsSection title="Signed in">
        {devices.map((d) => (
          <SettingsRow
            key={d.id}
            icon="devices"
            tint={d.current ? palette.success : palette.violet400}
            // This phone is named for what it is, not the sample data's device (P-75).
            label={d.current ? "This phone" : d.name}
            detail={d.current ? "This device" : ago(d.lastActive, now)}
            {...(d.current
              ? {}
              : {
                  right: (
                    <Button
                      label="Sign out"
                      variant="text"
                      onPress={() => {
                        setConfirm(d.id);
                      }}
                    />
                  ),
                })}
          />
        ))}
      </SettingsSection>
      {others.length > 0 ? (
        <Button
          label="Sign out of all other devices"
          variant="secondary"
          onPress={() => {
            setConfirm("others");
          }}
        />
      ) : null}

      {methods?.password === false ? (
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <AppText variant="headline">No password yet</AppText>
          <AppText variant="footnote" color="textSecondary">
            You sign in with Google or Apple. Add a password as another way in.
          </AppText>
          <Button
            label="Email me a link to set one"
            variant="secondary"
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
        </Glass>
      ) : (
        <>
          <AppText variant="headline">Change password</AppText>
          <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <TextField
              label="Current password"
              icon="lock"
              secure
              value={pw.current}
              autoComplete="current-password"
              textContentType="password"
              onChangeText={(t) => {
                setPw({ ...pw, current: t });
                setPwError(null);
              }}
            />
            <TextField
              label="New password"
              icon="key"
              secure
              value={pw.next}
              autoComplete="new-password"
              textContentType="newPassword"
              onChangeText={(t) => {
                setPw({ ...pw, next: t });
                setPwError(null);
              }}
              {...(pwError === null ? {} : { error: pwError })}
            />
            <Checklist
              items={[
                {
                  label: `At least ${String(PASSWORD_POLICY_P78.minLength)} characters`,
                  met: checks.longEnough,
                },
                { label: "Not easy to guess", met: checks.hardToGuess },
              ]}
            />
            <AppText variant="footnote" color="textSecondary">
              Changing it signs you out of your other devices.
            </AppText>
            <Button
              label="Change password"
              variant="primary"
              loading={change.isPending}
              disabled={pw.current.length === 0 || pw.next.length === 0}
              onPress={() => {
                const problem = passwordError(pw.next, PASSWORD_POLICY_P78);
                if (problem !== null) {
                  setPwError(fieldErrorMessage(problem, PASSWORD_POLICY_P78));
                  return;
                }
                change.mutate(
                  { current: pw.current, next: pw.next },
                  {
                    onSuccess: (r) => {
                      if (r.ok) {
                        setPw({ current: "", next: "" });
                        toast.show("Password changed.");
                      } else if (r.reason === "wrong-password")
                        setPwError("That didn't match your current password.");
                      else if (r.reason === "rate-limited")
                        setPwError("That's a lot of tries. Please wait a moment.");
                      else setPwError("That didn't work. Please try again.");
                    },
                    onError,
                  },
                );
              }}
            />
          </Glass>
        </>
      )}
      <SettingsSection title="Coming later">
        <SettingsRow
          icon="shield"
          tint={palette.violet400}
          label="Two-step verification"
          badge="Coming later"
          disabled
        />
        <SettingsRow
          icon="key"
          tint={palette.violet400}
          label="Passkeys"
          badge="Coming later"
          disabled
        />
      </SettingsSection>

      <ActionSheet
        visible={confirm !== null}
        title={confirm === "others" ? "Sign out of all other devices?" : "Sign out of this device?"}
        body="Anything waiting to send on that device stays there until it signs in again."
        icon="sign-out"
        confirmLabel="Sign out"
        destructive
        onCancel={() => {
          setConfirm(null);
        }}
        onConfirm={() => {
          const which = confirm;
          setConfirm(null);
          const done = {
            onSuccess: () => {
              toast.show("Signed out.");
            },
            onError,
          };
          if (which === "others") signOutOthers.mutate(undefined, done);
          else if (which !== null) signOut.mutate(which, done);
        }}
      />
    </SettingsPage>
  );
}

/** SET-13 · Export my data: preparing, ready (7 days), expired. Simulated download. */
export function ExportPage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const tools = useTestingTools();
  const onError = useOnError();
  const data = useSettings().data;
  const prepare = usePrepareExport();
  const expire = useExpireExport();
  const partner = data?.partner.name ?? "your partner";
  const state = data?.settings.export.state ?? "none";
  if (data?.dataRights === false)
    return (
      <SettingsPage title="Export my data">
        <NotYet text="Exporting your data isn't available yet. Everything stays safe in the meantime." />
      </SettingsPage>
    );
  return (
    <SettingsPage title="Export my data" intro="A copy of what's yours, to keep somewhere safe.">
      <InfoList
        items={[
          { icon: "edit", text: "Your moments, including your drafts" },
          { icon: "chat", text: "Messages in your conversation" },
          { icon: "mail", text: "Letters you wrote, and ones you received and opened" },
          { icon: "heart", text: "Signals you sent and received" },
          { icon: "image", text: "Memories and events" },
        ]}
      />
      <Notice
        tone="info"
        icon="lock"
        text={`Not included: ${partner}'s private drafts, or letters still sealed for you.`}
      />
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {state === "none" ? (
          <>
            <AppText variant="headline">Ready when you are</AppText>
            <Button
              label="Prepare export"
              variant="primary"
              loading={prepare.isPending}
              onPress={() => {
                prepare.mutate(undefined, { onError });
              }}
            />
          </>
        ) : state === "ready" ? (
          <>
            <AppText variant="headline">Your export is ready</AppText>
            <ProgressBar step={1} total={1} />
            <AppText variant="footnote" color="textSecondary">
              The download link works for 7 days. Keep the file private.
            </AppText>
            <Button
              label="Download"
              variant="primary"
              onPress={() => {
                toast.show("Downloads aren't available in this preview.");
              }}
            />
            {tools ? (
              <Button
                label="Show it expired"
                variant="text"
                onPress={() => {
                  expire.mutate(undefined, { onError });
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="headline">This export has expired</AppText>
            <AppText variant="footnote" color="textSecondary">
              For your privacy, exports only last 7 days. Prepare a new one anytime.
            </AppText>
            <Button
              label="Prepare a new export"
              variant="primary"
              loading={prepare.isPending}
              onPress={() => {
                prepare.mutate(undefined, { onError });
              }}
            />
          </>
        )}
      </Glass>
    </SettingsPage>
  );
}

/** A careful, stepped flow ending in a typed confirmation (SET-14, SET-15). */
function CarefulFlow({
  title,
  word,
  steps,
  finalLabel,
  pending,
  onFinal,
}: {
  title: string;
  word: string;
  steps: readonly { heading: string; lines: readonly string[] }[];
  finalLabel: string;
  pending: boolean;
  onFinal: () => void;
}) {
  const { spacing, radii } = useTheme();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const last = step === steps.length;
  const current = steps[step];
  return (
    <SettingsPage title={title}>
      <ProgressBar step={step + 1} total={steps.length + 1} />
      {current !== undefined ? (
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <AppText variant="title">{current.heading}</AppText>
          {current.lines.map((l) => (
            <AppText key={l} variant="callout" color="textSecondary">
              {l}
            </AppText>
          ))}
        </Glass>
      ) : (
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <AppText variant="title">Type {word} to confirm</AppText>
          <TextField
            label={`Type ${word}`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </Glass>
      )}
      <View style={{ gap: spacing.sm }}>
        {step === 1 ? (
          <Button
            label="Export first"
            variant="primary"
            onPress={() => {
              router.push("/settings/export");
            }}
          />
        ) : null}
        {last ? (
          <Button
            label={finalLabel}
            variant="destructive"
            loading={pending}
            disabled={typed.trim() !== word}
            onPress={onFinal}
          />
        ) : (
          <Button
            label="Continue"
            variant={step === 1 ? "secondary" : "primary"}
            onPress={() => {
              setStep((s) => s + 1);
            }}
          />
        )}
        <Button
          label="Cancel"
          variant="text"
          onPress={() => {
            goBack("/settings");
          }}
        />
      </View>
    </SettingsPage>
  );
}

/** Export, ending the space and deleting the account wait on U-20 and U-23 (phase B9). */
function NotYet({ text }: { text: string }) {
  return <Notice tone="info" icon="clock" text={text} />;
}

/** SET-14 · End our space (direction P-37: export first; what happens to shared content is U-20). */
export function EndSpacePage() {
  const toast = useToast();
  const onError = useOnError();
  const end = useEndSpace();
  const data = useSettings().data;
  const partner = data?.partner.name ?? "your partner";
  if (data?.dataRights === false)
    return (
      <SettingsPage title="End our space">
        <NotYet text="Ending your space isn't available yet: what happens to what you've shared is still being decided." />
      </SettingsPage>
    );
  return (
    <CarefulFlow
      title="End our space"
      word="END"
      finalLabel="End our space"
      pending={end.isPending}
      steps={[
        {
          heading: "Before you decide",
          lines: [
            `Ending your space stops sharing with ${partner}. Your account stays.`,
            `You'll be asked what happens to shared memories. ${partner} can export first.`,
            "What happens to shared content isn't decided yet (provisional, U-20).",
          ],
        },
        {
          heading: "Keep a copy first?",
          lines: ["You can export your data before ending the space. It's yours to keep."],
        },
      ]}
      onFinal={() => {
        end.mutate(undefined, {
          onSuccess: () => {
            toast.show("Your space has ended.");
            router.replace("/");
          },
          onError,
        });
      }}
    />
  );
}

/** SET-15 · Delete my account (separate from ending the space; a grace period is open, U-23). */
export function DeleteAccountPage() {
  const toast = useToast();
  const onError = useOnError();
  const remove = useDeleteAccount();
  if (useSettings().data?.dataRights === false)
    return (
      <SettingsPage title="Delete my account">
        <NotYet text="Deleting your account from the app isn't available yet: what happens to what you've shared is still being decided." />
      </SettingsPage>
    );
  return (
    <CarefulFlow
      title="Delete my account"
      word="DELETE"
      finalLabel="Delete my account"
      pending={remove.isPending}
      steps={[
        {
          heading: "This deletes your account",
          lines: [
            "Your account, your settings and your private drafts are deleted.",
            "Deleting from Garnet can't erase screenshots, downloads or copies outside Garnet.",
            "Whether there's a grace period first isn't decided yet (provisional, U-23).",
          ],
        },
        {
          heading: "Keep a copy first?",
          lines: ["You can export your data before deleting your account."],
        },
      ]}
      onFinal={() => {
        remove.mutate(undefined, {
          onSuccess: () => {
            toast.show("Your account was deleted.");
            router.replace("/");
          },
          onError,
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  centerCol: { alignItems: "center" },
});
