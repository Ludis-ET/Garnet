import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { InfoList } from "@/components/ui/InfoList";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { cityForZone } from "@/domain/identity";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useSaveSetup, useSetupState } from "@/features/setup/useSetup";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "../components/SettingsList";
import { useTestingTools } from "@/features/prototype/devTools";
import {
  useDeleteAccount,
  useEndSpace,
  useExpireExport,
  usePrepareExport,
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

/** SET-02 · Profile, with Save and Cancel (unsaved changes are kept until either). */
export function ProfilePage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const onError = useOnError();
  const setup = useSetupState().data;
  const settings = useSettings().data;
  const save = useSaveSetup();
  const [draft, setDraft] = useState<{ displayName: string; nickname: string } | null>(null);
  if (setup === undefined || settings === undefined)
    return (
      <SettingsPage title="Profile">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const p = setup.profile;
  const form = draft ?? { displayName: p.displayName, nickname: p.nickname };
  const changed =
    draft !== null && (draft.displayName !== p.displayName || draft.nickname !== p.nickname);
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
      </Glass>
      <SettingsSection title="Account">
        <SettingsRow icon="mail" label="Email" value={maskEmail(settings.email)} />
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
                { displayName: form.displayName.trim(), nickname: form.nickname.trim() },
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

/** SET-12 · Devices and password (multi-device is open: U-19, U-27; simulated here). */
export function DevicesPage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const onError = useOnError();
  const data = useSettings().data;
  const signOut = useSignOutDevice();
  const signOutOthers = useSignOutOthers();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  if (data === undefined)
    return (
      <SettingsPage title="Devices & password">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const now = Temporal.Now.instant();
  const others = data.devices.filter((d) => !d.current);
  return (
    <SettingsPage title="Devices & password">
      <SettingsSection title="Signed in">
        {data.devices.map((d) => (
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

      <AppText variant="headline">Change password</AppText>
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField
          label="Current password"
          icon="lock"
          secure
          value={pw.current}
          onChangeText={(t) => {
            setPw({ ...pw, current: t });
          }}
        />
        <TextField
          label="New password"
          icon="key"
          secure
          value={pw.next}
          helper="At least 8 characters."
          onChangeText={(t) => {
            setPw({ ...pw, next: t });
            setPwError(null);
          }}
          {...(pwError === null ? {} : { error: pwError })}
        />
        <Button
          label="Change password"
          variant="primary"
          disabled={pw.current.length === 0 || pw.next.length === 0}
          onPress={() => {
            if (pw.next.length < 8) {
              setPwError("Use at least 8 characters.");
              return;
            }
            setPw({ current: "", next: "" });
            toast.show("Password changed.");
          }}
        />
      </Glass>
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

/** SET-14 · End our space (direction P-37: export first; what happens to shared content is U-20). */
export function EndSpacePage() {
  const toast = useToast();
  const onError = useOnError();
  const end = useEndSpace();
  const partner = useSettings().data?.partner.name ?? "your partner";
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
