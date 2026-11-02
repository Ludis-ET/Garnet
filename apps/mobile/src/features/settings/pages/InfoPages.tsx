import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { InfoList } from "@/components/ui/InfoList";
import { Notice } from "@/components/ui/Notice";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { useDemoControls, useSimulation } from "@/data/RepositoryProvider";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useChatSettings, useUpdateChatSettings } from "@/features/chat/useChat";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "../components/SettingsList";
import { useSettings } from "../useSettings";
import { setTestingTools, TAPS_TO_UNLOCK, useTestingTools } from "@/features/prototype/devTools";
import { useApiConnection } from "@/data/http/useApiHealth";

/** SET-09 · Privacy: what the partner sees and never sees, and the two chat choices (P-58). */
export function PrivacyPage() {
  const { spacing } = useTheme();
  const toast = useToast();
  const data = useSettings().data;
  const chat = useChatSettings().data;
  const updateChat = useUpdateChatSettings();
  const partner = data?.partner.name ?? "Your partner";
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  return (
    <SettingsPage
      title="Privacy"
      intro={`In plain words: what ${partner} sees, and what stays yours.`}
    >
      <AppText variant="headline">{partner} sees</AppText>
      <InfoList
        items={[
          { icon: "heart", text: "Moments you share, and signals you send" },
          { icon: "calendar", text: "Your day, once your days meet" },
          { icon: "mail", text: "A letter's envelope; its words only once it opens" },
          { icon: "image", text: "Memories and events you keep together" },
          { icon: "pin", text: "Your city, only if you choose to share it" },
        ]}
      />
      <AppText variant="headline">{partner} never sees</AppText>
      <InfoList
        items={[
          { icon: "lock", text: "Your drafts and private moments" },
          { icon: "settings", text: "Your settings, nickname and greeting" },
          { icon: "search", text: "What you search for" },
          { icon: "bell", text: "Which notifications you've opened" },
        ]}
      />
      <SettingsSection
        title="In your conversation"
        footer={`"Seen" shows only when you both turn it on. Either of you can turn it off anytime.`}
      >
        <SettingsRow
          icon="eye"
          tint={palette.violet500}
          label='Show "Seen"'
          detail={chat?.readReceipts === null ? "Not chosen yet" : undefined}
          right={
            <Toggle
              value={chat?.readReceipts === true}
              onValueChange={(readReceipts) => {
                updateChat.mutate({ readReceipts }, { onError });
              }}
              accessibilityLabel='Show "Seen"'
            />
          }
        />
        <SettingsRow
          icon="chat"
          tint={palette.sapphire500}
          label="Show when I'm typing"
          right={
            <Toggle
              value={chat?.typingIndicators ?? true}
              onValueChange={(typingIndicators) => {
                updateChat.mutate({ typingIndicators }, { onError });
              }}
              accessibilityLabel="Show when I'm typing"
            />
          }
        />
      </SettingsSection>
      <View style={{ height: spacing.md }} />
    </SettingsPage>
  );
}

/** SET-10 · Time zone and the shared day, on both clocks. The boundary is provisional (U-02). */
export function TimePage() {
  const { spacing, radii } = useTheme();
  const data = useSettings().data;
  if (data === undefined)
    return (
      <SettingsPage title="Time zone & day">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const now = Temporal.Now.instant();
  // PROVISIONAL_DAY_POLICY: 04:00 London (D-13 proposed zone; U-02 open).
  const boundary = Temporal.Now.plainDateISO("Europe/London")
    .toZonedDateTime({ timeZone: "Europe/London", plainTime: { hour: 4, minute: 0 } })
    .toInstant();
  const clocks = [
    { who: "You", zone: data.me.zone },
    { who: data.partner.name, zone: data.partner.zone },
  ];
  return (
    <SettingsPage title="Time zone & day">
      <View style={[styles.row, { gap: spacing.sm }]}>
        {clocks.map((c) => (
          <Glass key={c.who} radius={radii.xl} style={styles.flex} contentStyle={styles.clock}>
            <AppText variant="caption" color="textSecondary">
              {c.who}
            </AppText>
            <AppText variant="largeTitle" style={styles.tabular}>
              {localTimeLabel(now, c.zone)}
            </AppText>
            <AppText variant="footnote" weight="600">
              {cityForZone(c.zone)}
            </AppText>
          </Glass>
        ))}
      </View>
      <Glass
        radius={radii.xl}
        tint="garnet"
        contentStyle={{ padding: spacing.lg, gap: spacing.sm }}
      >
        <View style={[styles.row, { gap: spacing.xs }]}>
          <AppText variant="headline" style={styles.flex}>
            When a shared day begins
          </AppText>
          <View style={styles.pill}>
            <AppText variant="caption" weight="600" color="accent">
              Provisional
            </AppText>
          </View>
        </View>
        {clocks.map((c) => (
          <AppText key={c.who} variant="callout">
            {localTimeLabel(boundary, c.zone)} for {c.who === "You" ? "you" : c.who} in{" "}
            {cityForZone(c.zone)}
          </AppText>
        ))}
        <AppText variant="footnote" color="textSecondary">
          Not decided yet (U-02). Your days are kept in each of your own time zones; a shared day is
          the window your two days overlap.
        </AppText>
      </Glass>
    </SettingsPage>
  );
}

/** SET-11 · Offline and sync; the offline switch is a testing tool (P-75). */
export function OfflinePage() {
  const toast = useToast();
  const demo = useDemoControls();
  const sim = useSimulation();
  const tools = useTestingTools();
  return (
    <SettingsPage title="Offline & sync">
      <Notice
        tone="info"
        icon={sim.offline ? "wifi-off" : "check"}
        text={
          sim.offline
            ? "You're offline. What you write waits safely on this phone."
            : "Everything is up to date on this phone."
        }
      />
      <SettingsSection title="Waiting to send">
        <SettingsRow icon="check" tint={palette.success} label="Nothing waiting" />
      </SettingsSection>
      {tools ? (
        <SettingsSection
          title="Testing"
          footer="Shows the offline states. Nothing syncs in this preview."
        >
          <SettingsRow
            icon="wifi-off"
            tint={palette.violet500}
            label="Simulate offline"
            right={
              <Toggle
                value={sim.offline}
                onValueChange={(offline) => {
                  demo.configure({ offline });
                }}
                accessibilityLabel="Simulate offline"
              />
            }
          />
        </SettingsSection>
      ) : null}
      <Button
        label="Try again now"
        variant="secondary"
        onPress={() => {
          toast.show(sim.offline ? "Still offline. We'll keep trying." : "All up to date.");
        }}
      />
    </SettingsPage>
  );
}

const LICENCES = [
  "Expo and React Native (MIT)",
  "React (MIT)",
  "Reanimated and Gesture Handler (MIT)",
  "TanStack Query (MIT)",
  "temporal-polyfill (MIT)",
  "react-native-svg (MIT)",
  "Emoji names: Unicode emoji data (Unicode License v3)",
] as const;

/** SET-16 · About, licences and feedback. Nothing is sent from this preview build (P-75). */
export function AboutPage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const [feedback, setFeedback] = useState("");
  const [shot, setShot] = useState(false);
  const [taps, setTaps] = useState(0);
  const tools = useTestingTools();
  const connection = useApiConnection();
  return (
    <SettingsPage title="About">
      <Glass
        radius={radii.xl}
        tint="garnet"
        contentStyle={[styles.centerCol, { padding: spacing.xl, gap: spacing.xs }]}
      >
        <AppText variant="largeTitle" serif>
          Garnet
        </AppText>
        <Pressable
          onPress={() => {
            // Seven taps on the version show or hide the testing tools (P-75).
            const next = taps + 1;
            setTaps(next >= TAPS_TO_UNLOCK ? 0 : next);
            if (next < TAPS_TO_UNLOCK) return;
            setTestingTools(!tools);
            toast.show(tools ? "Testing tools are hidden." : "Testing tools are on.");
          }}
          accessibilityRole="button"
          accessibilityLabel="Version 0.1, preview"
          hitSlop={8}
        >
          <AppText variant="footnote" color="textSecondary">
            Version 0.1 · Preview
          </AppText>
        </Pressable>
        {/* The one note that this build has no server (owner direction P-75, rule 4). */}
        <AppText variant="caption" color="textTertiary" style={styles.center}>
          Preview build: everything stays on this phone.
        </AppText>
        {/* Only in builds pointed at the local API (P-76, B0); never in the normal app. */}
        {connection === "off" ? null : (
          <AppText variant="caption" color="textSecondary" style={styles.center}>
            {connection === "connected"
              ? "Connected to this PC"
              : connection === "checking"
                ? "Looking for this PC…"
                : "Can't reach this PC"}
          </AppText>
        )}
      </Glass>
      <Notice
        tone="info"
        icon="info"
        text="Ruby, Sapphire and Garnet appear from your own pictures, for the two of you only."
      />
      <SettingsSection title="Legal">
        <SettingsRow
          icon="shield"
          tint={palette.success}
          label="Privacy"
          onPress={() => {
            toast.show("Comes with the real app.");
          }}
        />
        <SettingsRow
          icon="info"
          tint={palette.sapphire500}
          label="Terms"
          onPress={() => {
            toast.show("Comes with the real app.");
          }}
        />
      </SettingsSection>
      <SettingsSection title="Open-source licences">
        {LICENCES.map((l) => (
          <SettingsRow key={l} label={l} />
        ))}
      </SettingsSection>
      <AppText variant="headline">Send feedback</AppText>
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField
          label="What would make Garnet better?"
          value={feedback}
          onChangeText={setFeedback}
          rows={4}
          maxLength={1000}
        />
        <View style={[styles.row, { gap: spacing.sm }]}>
          <AppText variant="callout" style={styles.flex}>
            Include a screenshot
          </AppText>
          <Toggle value={shot} onValueChange={setShot} accessibilityLabel="Include a screenshot" />
        </View>
        <Button
          label="Send feedback"
          variant="primary"
          disabled={feedback.trim().length === 0}
          onPress={() => {
            setFeedback("");
            setShot(false);
            toast.show("Thank you for telling us.");
          }}
        />
      </Glass>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  center: { textAlign: "center" },
  centerCol: { alignItems: "center" },
  clock: { alignItems: "center", padding: 16, gap: 2 },
  tabular: { fontVariant: ["tabular-nums"] },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
