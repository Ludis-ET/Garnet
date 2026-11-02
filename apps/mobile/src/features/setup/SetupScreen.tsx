/**
 * SETUP-01 to SETUP-08 · Identity and setup (Daylight Glass "liquid", P-48, P-51). One route;
 * steps are in-screen states with a live identity card that fills in as the person goes.
 * Answers are saved after each step so setup resumes where it was left. Sides follow P-51
 * (owner direction for U-22): the two partners can never hold the same side.
 */
import { Haptics } from "@/components/ui/haptics";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import type { Pose } from "@/components/character/characterAssets";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { SimulatedPrompt } from "@/components/ui/SimulatedPrompt";
import { useToast } from "@/components/ui/Toast";
import type { Profile } from "@/data/fixtures/demoProfile";
import type { SetupState } from "@/data/repositories/types";
import {
  displayNameError,
  isKnownZone,
  nameErrorMessage,
  NAME_POLICY_P52,
  nicknameError,
  otherSide,
  OPTIONAL_STEPS,
  SETUP_STEPS,
  type GemSide,
  type SetupStep,
} from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useTheme, useThemeSettings } from "@/theme/ThemeProvider";
import { IdentityCard } from "./components/IdentityCard";
import { StepCapsules } from "./components/StepCapsules";
import { AlertsStep } from "./steps/AlertsStep";
import { LookStep } from "./steps/LookStep";
import { NameStep } from "./steps/NameStep";
import { PhotoStep } from "./steps/PhotoStep";
import { SideStep } from "./steps/SideStep";
import { SummaryStep } from "./steps/SummaryStep";
import { TimeStep } from "./steps/TimeStep";
import { useChooseSide, useCompleteSetup, useSaveSetup, useSetupState } from "./useSetup";
import { ENTER } from "@/theme/transitions";
import { notificationsSupported, permission } from "@/notifications/system";

const SUMMARY = SETUP_STEPS.length;

/** The viewer's gem beside each question after the side step (null: no character there). */
const STEP_POSE: Record<SetupStep, Pose | null> = {
  name: null,
  side: null,
  photo: "happy",
  time: "thinking",
  look: "holdingCrystal",
  alerts: "listening",
};

const QUESTIONS: Record<SetupStep, (partner: string) => string> = {
  name: (p) => `What should ${p} call you?`,
  side: () => "Choose your side",
  photo: () => "Your picture",
  time: () => "Where's home?",
  look: () => "Your look",
  alerts: () => "Stay close, gently",
};

/** The device's zone, or UTC if the runtime gives one it doesn't know (ADR-0002). */
function detectedZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isKnownZone(zone) ? zone : "UTC";
}

function firstOpenStep(profile: Profile): number {
  const i = SETUP_STEPS.findIndex((s) => !profile.done.includes(s));
  return i === -1 ? SUMMARY : i;
}

function SetupFlow({ initial }: { initial: SetupState }) {
  const router = useRouter();
  const toast = useToast();
  const { spacing, reduceMotion } = useTheme();
  const { setSchemePreference } = useThemeSettings();
  const live = useSetupState();
  const save = useSaveSetup();
  const choose = useChooseSide();
  const complete = useCompleteSetup();

  const server = live.data ?? initial;
  const partner = server.partner;
  const [step, setStep] = useState(() => firstOpenStep(initial.profile));
  const [draft, setDraft] = useState<Profile>(() => ({
    ...initial.profile,
    timeZone: initial.profile.timeZone ?? detectedZone(),
  }));
  const [pick, setPick] = useState<GemSide | null>(initial.profile.side);
  const [tried, setTried] = useState(false);
  const [conflict, setConflict] = useState<GemSide | null>(null);
  const [alertSheet, setAlertSheet] = useState<"rationale" | "prompt" | null>(null);

  // The card shows what the person is choosing right now, before it's saved.
  const card: Profile = { ...draft, side: pick ?? server.profile.side };
  const current = SETUP_STEPS[step];
  const go = (to: number) => {
    setStep(to);
    setTried(false);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const finishStep = (patch: Partial<Omit<Profile, "side" | "complete">>, s: SetupStep) => {
    save.mutate(
      { ...patch, done: [s] },
      {
        onSuccess: () => {
          go(step + 1);
        },
        onError,
      },
    );
  };

  const nameErr = tried ? displayNameError(draft.displayName, NAME_POLICY_P52) : null;
  const nickErr = tried ? nicknameError(draft.nickname, NAME_POLICY_P52) : null;

  const next = () => {
    switch (current) {
      case "name": {
        setTried(true);
        if (
          displayNameError(draft.displayName, NAME_POLICY_P52) !== null ||
          nicknameError(draft.nickname, NAME_POLICY_P52) !== null
        )
          return;
        finishStep(
          { displayName: draft.displayName.trim(), nickname: draft.nickname.trim() },
          "name",
        );
        return;
      }
      case "side": {
        if (pick === null) return;
        choose.mutate(pick, {
          onSuccess: (result) => {
            if (result.ok) go(step + 1);
            else setConflict(result.partnerSide);
          },
          onError,
        });
        return;
      }
      case "photo":
        finishStep({ avatar: draft.avatar }, "photo");
        return;
      case "time":
        finishStep({ timeZone: draft.timeZone }, "time");
        return;
      case "look":
        finishStep({ appearance: draft.appearance, accent: draft.accent }, "look");
        return;
      case "alerts":
        finishStep({ notifications: draft.notifications }, "alerts");
        return;
      case undefined:
        complete.mutate(undefined, {
          onSuccess: (result) => {
            if (result.ok) {
              if (Platform.OS !== "web")
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/home");
              return;
            }
            const first = result.missing[0];
            toast.show("A couple of steps still need an answer.");
            if (first !== undefined) go(SETUP_STEPS.indexOf(first));
          },
          onError,
        });
    }
  };

  const busy = save.isPending || choose.isPending || complete.isPending;
  const q = current === undefined ? null : QUESTIONS[current](partner.name);
  // A quick fade between steps (P-74), not a slide.
  const enter = ENTER;

  const footer =
    current === "alerts" && draft.notifications.status === "unset" ? (
      <>
        <Button
          label="Turn on notifications"
          onPress={() => {
            setAlertSheet("rationale");
          }}
        />
        <Button
          label="Not now"
          variant="text"
          onPress={() => {
            const notifications = { ...draft.notifications, status: "off" as const };
            setDraft((d) => ({ ...d, notifications }));
            finishStep({ notifications }, "alerts");
          }}
        />
      </>
    ) : (
      <Button
        label={current === undefined ? "Go to our space" : "Continue"}
        onPress={next}
        loading={busy}
        disabled={current === "side" && pick === null}
      />
    );

  return (
    <GlassScreen
      wash={current === "side" ? pick : null}
      {...(step > 0
        ? {
            onBack: () => {
              go(step - 1);
            },
          }
        : {})}
      {...(current === undefined ? {} : { header: <StepCapsules index={step} /> })}
      {...(current !== undefined && OPTIONAL_STEPS.has(current)
        ? {
            headerRight: (
              <Pressable
                onPress={() => {
                  finishStep({}, current);
                }}
                accessibilityRole="button"
                accessibilityLabel="Skip for now"
                hitSlop={8}
              >
                <Glass radius={999} shadow={false} contentStyle={styles.skip}>
                  <AppText variant="callout" weight="600" color="accent">
                    Skip
                  </AppText>
                </Glass>
              </Pressable>
            ),
          }
        : {})}
      footer={footer}
    >
      {current === undefined ? null : <IdentityCard profile={card} />}

      <Animated.View key={step} entering={enter} style={{ gap: spacing.xl }}>
        {q === null ? (
          <Animated.View {...(reduceMotion ? {} : { entering: ENTER })} style={{ gap: spacing.xs }}>
            <AppText variant="largeTitle" style={styles.center}>
              You're all set
            </AppText>
          </Animated.View>
        ) : (
          <View style={[styles.question, { gap: spacing.md }]}>
            <AppText variant="question" style={styles.flex}>
              {q}
            </AppText>
            {/* Your own gem keeps you company once you've chosen it (P-55). */}
            {current !== undefined && STEP_POSE[current] !== null && card.side !== null ? (
              <CharacterSlot
                character={card.side}
                pose={STEP_POSE[current] ?? "idle"}
                size={92}
                aspectRatio={FRAME_ASPECT}
              />
            ) : null}
          </View>
        )}

        {current === "name" ? (
          <NameStep
            partnerName={partner.name}
            displayName={draft.displayName}
            nickname={draft.nickname}
            nameError={
              nameErr === null
                ? undefined
                : nameErrorMessage(nameErr, NAME_POLICY_P52.maxDisplayName)
            }
            nicknameError={
              nickErr === null ? undefined : nameErrorMessage(nickErr, NAME_POLICY_P52.maxNickname)
            }
            onDisplayName={(displayName) => {
              setDraft((d) => ({ ...d, displayName }));
            }}
            onNickname={(nickname) => {
              setDraft((d) => ({ ...d, nickname }));
            }}
            onSubmit={next}
          />
        ) : null}
        {current === "side" ? (
          <SideStep
            pick={pick}
            partnerName={partner.name}
            partnerSide={partner.side}
            onPick={setPick}
          />
        ) : null}
        {current === "photo" ? (
          <PhotoStep
            name={draft.displayName}
            side={card.side}
            avatar={draft.avatar}
            onAvatar={(avatar) => {
              setDraft((d) => ({ ...d, avatar }));
            }}
          />
        ) : null}
        {current === "time" ? (
          <TimeStep
            zone={draft.timeZone ?? "UTC"}
            side={card.side}
            partnerName={partner.name}
            partnerZone={partner.timeZone}
            onZone={(timeZone) => {
              setDraft((d) => ({ ...d, timeZone }));
            }}
          />
        ) : null}
        {current === "look" ? (
          <LookStep
            side={card.side}
            appearance={draft.appearance}
            accent={draft.accent}
            onAppearance={(appearance) => {
              setDraft((d) => ({ ...d, appearance }));
              setSchemePreference(appearance);
            }}
            onAccent={(accent) => {
              setDraft((d) => ({ ...d, accent }));
            }}
          />
        ) : null}
        {current === "alerts" ? (
          <AlertsStep
            prefs={draft.notifications}
            onPrefs={(notifications) => {
              setDraft((d) => ({ ...d, notifications }));
            }}
          />
        ) : null}
        {current === undefined ? (
          <SummaryStep
            profile={server.profile}
            partner={partner}
            onEdit={(s) => {
              go(SETUP_STEPS.indexOf(s));
            }}
          />
        ) : null}
      </Animated.View>

      <ActionSheet
        visible={conflict !== null}
        icon="info"
        {...(conflict === null
          ? {}
          : {
              art: (
                <CharacterSlot
                  character={otherSide(conflict)}
                  pose="wave"
                  size={120}
                  aspectRatio={FRAME_ASPECT}
                />
              ),
            })}
        title={`${partner.name} just chose ${conflict === "ruby" ? "Ruby" : "Sapphire"}`}
        body={`You'll be ${conflict === "ruby" ? "Sapphire" : "Ruby"}, the other half of Garnet.`}
        confirmLabel={`Be ${conflict === "ruby" ? "Sapphire" : "Ruby"}`}
        cancelLabel="Look again"
        confirming={choose.isPending}
        onCancel={() => {
          setConflict(null);
          setPick(null);
        }}
        onConfirm={() => {
          if (conflict === null) return;
          const mine = otherSide(conflict);
          setPick(mine);
          choose.mutate(mine, {
            onSuccess: (result) => {
              setConflict(null);
              if (result.ok) go(step + 1);
            },
            onError,
          });
        }}
      />
      <ActionSheet
        visible={alertSheet === "rationale"}
        icon="info"
        title="Allow notifications?"
        body={`Your lock screen only ever shows “Something new for you 💜”, whoever sends it. You choose what reaches you.`}
        confirmLabel="Continue"
        cancelLabel="Not now"
        onCancel={() => {
          setAlertSheet(null);
        }}
        onConfirm={() => {
          // Android asks the real question (P-75); elsewhere the simulated prompt stands in.
          if (!notificationsSupported()) {
            setAlertSheet("prompt");
            return;
          }
          setAlertSheet(null);
          void permission(true).then((answer) => {
            const status = answer === "granted" ? "on" : "denied";
            setDraft((d) => ({ ...d, notifications: { ...d.notifications, status } }));
          });
        }}
      />
      <SimulatedPrompt
        visible={alertSheet === "prompt"}
        title="“Garnet” would like to send you notifications"
        body="Notifications may include alerts, sounds and icon badges."
        onAllow={() => {
          setAlertSheet(null);
          setDraft((d) => ({ ...d, notifications: { ...d.notifications, status: "on" } }));
          if (Platform.OS !== "web")
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onDeny={() => {
          setAlertSheet(null);
          setDraft((d) => ({ ...d, notifications: { ...d.notifications, status: "denied" } }));
        }}
      />
    </GlassScreen>
  );
}

/** The route: loads the person's setup, then hands it to the flow (state starts from it once). */
export function SetupScreen() {
  const { colors } = useTheme();
  const setup = useSetupState();
  if (setup.isError) return <Redirect href="/" />;
  if (setup.data === undefined) {
    return (
      <GlassScreen>
        <View style={styles.fill}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  }
  return <SetupFlow initial={setup.data} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  skip: { paddingHorizontal: 16, minHeight: 40, justifyContent: "center" },
  question: { flexDirection: "row", alignItems: "flex-end" },
  flex: { flex: 1 },
});
